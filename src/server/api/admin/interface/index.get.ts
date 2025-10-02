import { isUsingAwg } from '#utils/wgHelper';

export default definePermissionEventHandler('admin', 'any', async () => {
  const wgInterface = await Database.interfaces.get();

  return {
    ...wgInterface,
    privateKey: undefined,
    isUsingAwg: isUsingAwg(),
  };
});
