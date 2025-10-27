import { exec } from '../utils/cmd';
import { WG_ENV } from '../utils/config';
import { isIPv6, parseIpAndPort } from '../utils/ip';
import type { ClientType } from '#db/repositories/client/types';

declare module 'nitropack/types' {
  interface NitroRuntimeHooks {
    'wireguard:config': () => void;
    'wireguard:start': () => void;
  }
}

// 客户端流量限制插件
export default defineNitroPlugin(async (nitroApp) => {
  console.log('Client Traffic Restriction Plugin loaded');

  // 生成客户端特定的iptables规则
  const generateClientIptablesRules = (
    client: Omit<ClientType, 'createdAt' | 'updatedAt'>
  ): string[] => {
    const rules: string[] = [];

    // 从客户端IP地址中提取IP（去掉CIDR部分）
    const clientIp = client.ipv4Address.split('/')[0];
    const clientIpv6 = client.ipv6Address?.split('/')[0];

    // 如果客户端有allowedIps配置，为每个允许的IP生成规则
    if (client.allowedIps && client.allowedIps.length > 0) {
      client.allowedIps.forEach((allowedIpWithPort) => {
        // 解析IP地址和端口
        const { ip: allowedIp, port } = parseIpAndPort(allowedIpWithPort);

        // 根据IP版本选择合适的防火墙命令
        if (isIPv6(allowedIp)) {
          // 仅为IPv6地址生成ip6tables规则
          if (!WG_ENV.DISABLE_IPV6 && clientIpv6) {
            if (port) {
              // 对于TCP端口
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -p tcp --dport ${port} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -p tcp --sport ${port} -j ACCEPT`
              );
              // 对于UDP端口
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -p udp --dport ${port} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -p udp --sport ${port} -j ACCEPT`
              );
            } else {
              // 没有端口限制时的规则
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -j ACCEPT`
              );
            }
          }
        } else {
          // 为IPv4地址生成iptables规则
          if (port) {
            // 对于TCP端口
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -p tcp --dport ${port} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -p tcp --sport ${port} -j ACCEPT`
            );
            // 对于UDP端口
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -p udp --dport ${port} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -p udp --sport ${port} -j ACCEPT`
            );
          } else {
            // 没有端口限制时的规则
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -j ACCEPT`
            );
          }
        }
      });
    } else {
      // 如果没有配置allowedIps，默认允许访问服务器
      const serverIps = ['10.8.0.1/32'];
      serverIps.forEach((serverIp) => {
        // 这些都是IPv4地址，只生成iptables规则
        rules.push(
          `iptables -A FORWARD -s ${clientIp} -d ${serverIp} -j ACCEPT`
        );
        rules.push(
          `iptables -A FORWARD -d ${clientIp} -s ${serverIp} -j ACCEPT`
        );
      });
    }

    return rules;
  };

  // 应用客户端iptables规则
  const applyClientIptablesRules = async () => {
    try {
      console.log('Applying client-specific iptables rules...');

      // 获取所有客户端
      const clients = await Database.clients.getAll();

      // 清空现有的FORWARD链规则
      await exec('iptables -F FORWARD');
      if (!WG_ENV.DISABLE_IPV6) {
        await exec('ip6tables -F FORWARD');
      }

      // 设置FORWARD链默认策略为DROP（阻止所有流量）
      await exec('iptables -P FORWARD DROP');
      if (!WG_ENV.DISABLE_IPV6) {
        await exec('ip6tables -P FORWARD DROP');
      }

      // 为每个启用的客户端生成并应用规则
      const includedClients: string[] = [];
      for (const client of clients) {
        if (!client.enabled) {
          console.log(`Skipping disabled client: ${client.name}`);
          continue;
        }
        const rules = generateClientIptablesRules(client);
        for (const rule of rules) {
          await exec(rule);
        }

        includedClients.push(client.name);
        console.log(`Applied rules for client: ${client.name}`);
      }

      console.log(
        `Applied rules for ${includedClients.length} enabled clients: ${includedClients.join(', ')}`
      );
    } catch (error) {
      console.error('Error applying client iptables rules:', error);
    }
  };

  const remove_forward_rule = async (rule: string) => {
    try {
      const filteredRules = rule.split(';').filter((line) => {
        return !/FORWARD/i.test(line);
      });
      return filteredRules.join(';');
    } catch (error) {
      console.error('Error removing default FORWARD rule:', error);
    }
    return rule;
  };

  // 初始化：移除hooks中的默认FORWARD允许规则
  const initializeTrafficRestriction = async () => {
    try {
      const hooks = await Database.hooks.get();

      // 移除hooks中的默认FORWARD允许规则
      const updatedHooks = {
        ...hooks,
        postUp: await remove_forward_rule(hooks.postUp),
        postDown: await remove_forward_rule(hooks.postDown),
      };

      // 更新hooks到数据库
      await Database.hooks.update(updatedHooks);
      console.log('Removed default FORWARD rules from hooks');
    } catch (error) {
      console.error('Error initializing traffic restriction:', error);
    }
  };

  // 注册事件监听器，监听客户端配置保存后的事件
  nitroApp.hooks.hook('wireguard:config', applyClientIptablesRules);
  // 注册启动事件
  nitroApp.hooks.hook('wireguard:start', async () => {
    await initializeTrafficRestriction();
    await applyClientIptablesRules();
  });
});
