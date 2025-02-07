class API {
  async getClients() {
    return useFetch('/api/client', {
      method: 'get',
    });
  }

  async restoreConfiguration(file: string) {
    return $fetch('/api/wireguard/restore', {
      method: 'put',
      body: { file },
    });
  }
}

type WGClientReturn = Awaited<
  ReturnType<typeof API.prototype.getClients>
>['data']['value'];

export type WGClient = WGClientReturn extends (infer U)[] | undefined
  ? U
  : never;

export default new API();
