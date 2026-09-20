import { ProductSale } from '../types';

export type ReportProduct = 'ගොවිමිතුරු' | 'සයුරු';
export type ReportChannel = 'IVR' | 'APP' | 'TOTAL';

export interface DialogAgentSummaryEntry {
  agentCode?: string;
  agentName: string;
  productType: ReportProduct;
  channel: ReportChannel;
  reportCount: number;
}

export interface ReconciliationRow {
  agentKey: string;
  agentName: string;
  productType: ReportProduct;
  channel: Exclude<ReportChannel, 'TOTAL'>;
  appCount: number;
  dialogCount: number;
  matchedCount: number;
  difference: number;
  status: 'MATCHED' | 'DIALOG_MORE' | 'APP_MORE' | 'NO_DIALOG_DATA';
}

const normalize = (value: string | undefined): string =>
  (value || '').trim().toLocaleLowerCase();

const productMatches = (sale: ProductSale, productType: ReportProduct): boolean => {
  const value = normalize(sale.productType);
  return productType === 'ගොවිමිතුරු'
    ? value === 'ගොවිමිතුරු' || value.includes('govi')
    : value === 'සයුරු' || value.includes('sayuru');
};

const channelMatches = (sale: ProductSale, channel: Exclude<ReportChannel, 'TOTAL'>): boolean => {
  const value = normalize(sale.channel);
  return channel === 'IVR'
    ? value === 'ivr'
    : value === 'app' || value === 'direct' || value === '';
};

/**
 * Reconciles only aggregate agent-level counts. No customer mobile number,
 * customer name, OTP, or other personal information is required or returned.
 */
export function reconcileDialogAgentSummaries(
  sales: ProductSale[],
  dialogEntries: DialogAgentSummaryEntry[]
): ReconciliationRow[] {
  const keys = new Map<string, { agentName: string; productType: ReportProduct; channel: Exclude<ReportChannel, 'TOTAL'> }>();

  for (const entry of dialogEntries) {
    if (entry.channel === 'TOTAL') {
      for (const channel of ['IVR', 'APP'] as const) {
        keys.set(`${normalize(entry.agentCode || entry.agentName)}|${entry.productType}|${channel}`, {
          agentName: entry.agentName,
          productType: entry.productType,
          channel,
        });
      }
    } else {
      keys.set(`${normalize(entry.agentCode || entry.agentName)}|${entry.productType}|${entry.channel}`, {
        agentName: entry.agentName,
        productType: entry.productType,
        channel: entry.channel,
      });
    }
  }

  const salesByKey = new Map<string, number>();
  for (const sale of sales) {
    const productType: ReportProduct | undefined = productMatches(sale, 'ගොවිමිතුරු')
      ? 'ගොවිමිතුරු'
      : productMatches(sale, 'සයුරු')
        ? 'සයුරු'
        : undefined;
    if (!productType || !sale.agentName) continue;

    const channel: Exclude<ReportChannel, 'TOTAL'> = normalize(sale.channel) === 'ivr' ? 'IVR' : 'APP';
    const key = `${normalize(sale.agentCode || sale.agentName)}|${productType}|${channel}`;
    salesByKey.set(key, (salesByKey.get(key) || 0) + (sale.quantity || 1));
  }

  return Array.from(keys.entries()).map(([key, identity]) => {
    const dialogCount = dialogEntries
      .filter((entry) => normalize(entry.agentCode || entry.agentName) === key.split('|')[0])
      .filter((entry) => entry.productType === identity.productType)
      .reduce((sum, entry) => {
        if (entry.channel === identity.channel) return sum + entry.reportCount;
        if (entry.channel === 'TOTAL') return sum + entry.reportCount;
        return sum;
      }, 0);
    const appCount = salesByKey.get(key) || 0;
    const matchedCount = Math.min(appCount, dialogCount);
    const difference = appCount - dialogCount;

    return {
      agentKey: key.split('|')[0],
      agentName: identity.agentName,
      productType: identity.productType,
      channel: identity.channel,
      appCount,
      dialogCount,
      matchedCount,
      difference,
      status: dialogCount === 0
        ? 'NO_DIALOG_DATA'
        : difference === 0
          ? 'MATCHED'
          : difference > 0
            ? 'APP_MORE'
            : 'DIALOG_MORE',
    };
  });
}
