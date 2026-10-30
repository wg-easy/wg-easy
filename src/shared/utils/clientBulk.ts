export const clientBulkActions = ['enable', 'disable', 'delete'] as const;
export type ClientBulkAction = (typeof clientBulkActions)[number];
