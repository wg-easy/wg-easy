PRAGMA journal_mode=WAL;--> statement-breakpoint
INSERT INTO `general_table` (`setup_step`, `session_password`, `session_timeout`, `metrics_prometheus`, `metrics_json`)
VALUES (1, hex(randomblob(256)), 3600, 0, 0);
--> statement-breakpoint
INSERT INTO `interfaces_table` (`name`, `device`, `port`, `private_key`, `public_key`, `ipv4_cidr`, `ipv6_cidr`, `mtu`, `enabled`)
VALUES ('wg0', 'eth0', 51820, '---default---', '---default---', '10.8.0.0/24', 'fdcc:ad94:bacf:61a4::cafe:0/112', 1420, 1);
--> statement-breakpoint
INSERT INTO `hooks_table` (`id`, `pre_up`, `post_up`, `pre_down`, `post_down`)
VALUES (
  'wg0',
  '',
  'iptables -t nat -A POSTROUTING -s {{ipv4Cidr}} -o {{device}} -j MASQUERADE; iptables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT;',
  '',
  'iptables -t nat -D POSTROUTING -s {{ipv4Cidr}} -o {{device}} -j MASQUERADE; iptables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -D POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -D FORWARD -o wg0 -j ACCEPT;'
);
--> statement-breakpoint
INSERT INTO `user_configs_table` (`id`, `default_mtu`, `default_persistent_keepalive`, `default_dns`, `default_allowed_ips`, `host`, `port`)
VALUES ('wg0', 1420, 0, '["1.1.1.1","2606:4700:4700::1111"]', '["0.0.0.0/0","::/0"]', '', 51820)
