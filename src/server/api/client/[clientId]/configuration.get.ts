import { createError, getQuery, getValidatedRouterParams, setHeader } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { WG_ENV } from '#server/utils/config';
import {
  generateFlClashConfig,
  parseFlClashEndpointIpVersion,
  parseFlClashRemoteCidrs,
  parseWireGuardClientConfig,
} from '#server/utils/flClash';
import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'view',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );
    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    const config = await WireGuard.getClientConfiguration({ clientId });
    const filename = WireGuard.cleanClientFilename(client.name) || clientId;

    if (getQuery(event).format === 'flclash') {
      try {
        const wgInterface = await Database.interfaces.get();
        const parsedConfig = parseWireGuardClientConfig(config);
        const hasIpv6Tunnel =
          !WG_ENV.DISABLE_IPV6 &&
          parsedConfig.ipv6Address !== undefined &&
          parsedConfig.allowedIps.includes('::/0');
        const remoteCidrs = [
          wgInterface.ipv4Cidr,
          ...(hasIpv6Tunnel ? [wgInterface.ipv6Cidr] : []),
          ...(process.env.FLCLASH_REMOTE_CIDRS
            ? parseFlClashRemoteCidrs(process.env.FLCLASH_REMOTE_CIDRS)
            : []),
        ];
        const profile = generateFlClashConfig(config, {
          remoteCidrs,
          endpointIpVersion: parseFlClashEndpointIpVersion(
            process.env.FLCLASH_ENDPOINT_IP_VERSION || 'dual'
          ),
        });

        setHeader(
          event,
          'Content-Disposition',
          `attachment; filename="${filename}-flclash.yaml"`
        );
        setHeader(event, 'Content-Type', 'application/yaml; charset=utf-8');
        setHeader(event, 'Cache-Control', 'private, no-store, max-age=0');
        setHeader(event, 'X-Content-Type-Options', 'nosniff');
        return profile;
      } catch {
        throw createError({
          statusCode: 500,
          statusMessage: 'Unable to generate FlClash configuration',
        });
      }
    }

    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${filename}.conf"`
    );

    setHeader(event, 'Content-Type', 'application/octet-stream');
    return config;
  }
);
