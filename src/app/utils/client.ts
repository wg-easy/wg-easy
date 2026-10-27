import { sha256 } from 'js-sha256';
import type { TypedInternalResponse } from 'nitropack/types';

type ApiClient = TypedInternalResponse<
  '/api/client',
  unknown,
  'get'
>['clients'][number];
type TrafficSeries = { name: string; data: number[] }[];

export type LocalClient = ApiClient & {
  avatar?: string;
  transferRxCurrent: number;
  transferTxCurrent: number;
  transferRxSeries: TrafficSeries;
  transferTxSeries: TrafficSeries;
};

function sampleTraffic(
  name: string,
  total: number | null,
  previousTotal: number | null | undefined,
  previousSeries: TrafficSeries = [],
  updateCharts: boolean
) {
  const current =
    previousTotal === undefined ? 0 : (total ?? 0) - (previousTotal ?? 0);
  if (!updateCharts) return { current, series: previousSeries };

  const history = previousSeries[0]?.data ?? Array<number>(50).fill(0);
  return { current, series: [{ name, data: [...history.slice(1), current] }] };
}

export function toLocalClients(
  clients: ApiClient[],
  previousClients: LocalClient[] | null,
  updateCharts: boolean
): LocalClient[] {
  // Only the displayed page supplies baselines; returning to a page starts fresh.
  const previousById = new Map(
    previousClients?.map((client) => [client.id, client])
  );
  return clients.map((client) => {
    const previous = previousById.get(client.id);
    const rx = sampleTraffic(
      'Rx',
      client.transferRx,
      previous?.transferRx,
      previous?.transferRxSeries,
      updateCharts
    );
    const tx = sampleTraffic(
      'Tx',
      client.transferTx,
      previous?.transferTx,
      previous?.transferTxSeries,
      updateCharts
    );
    const avatar =
      client.name.includes('@') && client.name.includes('.')
        ? `https://gravatar.com/avatar/${sha256(client.name.toLowerCase().trim())}.jpg`
        : undefined;
    return {
      ...client,
      avatar,
      transferRxCurrent: rx.current,
      transferTxCurrent: tx.current,
      transferRxSeries: rx.series,
      transferTxSeries: tx.series,
    };
  });
}
