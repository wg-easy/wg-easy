---
title: Client Groups
---

Client Groups allow administrators to assign a client to zero, one, or multiple groups and manage shared client policy values centrally.

Groups can define policy values for:

- **Allowed IPs**
- **DNS**
- **Firewall IPs**

Each policy field is resolved independently. A group can manage one field without managing the others.

## Supported Policies

### Allowed IPs

Allowed IPs control the routes written into the generated client configuration.

They affect the `AllowedIPs` value that the WireGuard client receives. They do not, by themselves, prevent a user from editing their local WireGuard configuration.

### DNS

DNS controls the DNS servers written into the generated client configuration.

### Firewall IPs

Firewall IPs are enforced by the `wg-easy` server using firewall rules.

/// note | Per-Client Firewall Required

Firewall IP group policies are only available when **Per-Client Firewall** is enabled in the Admin Panel -> Interface settings.

///

Use Firewall IPs when server-side access enforcement is required.

## Policy Resolution

A client can belong to multiple groups. For each policy field, `wg-easy` resolves the effective value as follows:

1. Values from all assigned groups that define that field are combined.
2. Duplicate values are removed.
3. Group membership order and each group's internal value order determine the final order.
4. Global/default configuration is used only when none of the assigned groups defines that field.
5. Global values are not added to a non-empty group result.
6. While a client belongs to at least one group, its individual Allowed IPs, DNS, and Firewall IP values are not used.
7. Individual client values remain stored and become active again when all groups are removed.

Example:

```text
Customers group:
Allowed IPs: 10.77.0.0/16
DNS: 1.1.1.1, 9.9.9.9

NAS Access group:
Allowed IPs: 172.20.1.33/32, 10.77.0.0/16
DNS: 9.9.9.9, 8.8.8.8
```

If the client is assigned to `Customers` first and `NAS Access` second, the generated configuration uses:

```text
AllowedIPs = 10.77.0.0/16, 172.20.1.33/32
DNS = 1.1.1.1, 9.9.9.9, 8.8.8.8
```

`10.77.0.0/16` and `9.9.9.9` appear in both groups, but each duplicate is included only once.

## Creating a Group

Open **Groups** from the user menu.

To create a group:

1. Click **Create**.
2. Enter a group name.
3. Optionally enter a description.
4. Enable any policy field the group should manage.
5. Add at least one valid entry for each enabled policy field.
6. Save the group.

If a policy field is disabled, that group does not contribute to that field.

/// warning | Enabled Policies Require Values

An enabled group policy must contain at least one valid entry. There is no separate "enabled but empty" policy state.

///

## Editing a Group

Open **Groups**, then select the group you want to edit.

You can change the name, description, and policy values. Saving the group updates the effective policy for assigned clients the next time their configuration or firewall rules are generated.

## Assigning Clients

You can assign groups from two places.

### While Creating a Client

When creating a client, select one or more groups in the **Client Groups** section.

The selected group order controls the order used when policy values are combined.

### From the Client Edit Page

Open a client and use the **Client Groups** section to add or remove groups.

When a client belongs to at least one group, the individual Allowed IPs, DNS, and Firewall IP fields become read-only. The page shows the effective value from the assigned groups or, when no assigned group defines that field, the global/default value.

Use **Save** to persist membership changes. Use **Revert** to return to the last saved client values and group assignments.

## Group Membership Page

Each group detail page includes a membership section.

From this page you can:

- Assign an existing client to the group.
- Remove a client from that group.

Removing a client from one group only removes that one membership. It does not remove the client from other groups, and it never deletes the client.

## Deleting Groups

Deleting a group deletes the group and its memberships.

Assigned clients remain intact. Memberships to other groups remain intact. After the group is deleted, each affected client's effective policy is recalculated from its remaining groups. If no remaining group defines a policy field, `wg-easy` uses the global/default value for that field.

## Generated Configurations

The effective policy is used consistently for:

- Normal configuration downloads
- QR-code configurations
- One-time configuration links

## Security Note

/// warning | Use Firewall IPs for Server-Side Enforcement

Allowed IPs in the client configuration are not a complete access-control mechanism because users may edit their local WireGuard configuration.

Use Firewall IPs when server-side enforcement is required. The **Per-Client Firewall** feature must be enabled in the Admin Panel -> Interface settings, and you should verify that firewall rules work as expected in your deployment environment.

///
