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
  channel: ReportChannel;
  appCount: number;
  dialogCount: number;
  matchedCount: number;
  difference: number;
  status: 'MATCHED' | 'DIALOG_MORE' | 'APP_MORE' | 'NO_DIALOG_DATA';
}

const normalize = (value: string | undefined): string =>
  (value || '').trim().toLocaleLowerCase();

const getProductType = (sale: ProductSale): ReportProduct | undefined => {
  const value = normalize(sale.productType);
  if (value === 'ගොවිමිතුරු' || value.includes('govi')) return 'ගොවිමිතුරු';
  if (value === 'සයුරු' || value.includes('sayuru')) return 'සයුරු';
  return undefined;
};

const getChannel = (sale: ProductSale): Exclude<ReportChannel, 'TOTAL'> =>
  normalize(sale.channel) === 'ivr' ? 'IVR' : 'APP';

/**
 * Reconciles aggregate agent-level counts only. It intentionally does not
 * accept or return customer mobile numbers, customer names, OTPs, or images.
 * A TOTAL report row is compared against IVR + APP sales together.
 */
export function reconcileDialogAgentSummaries(
  sales: ProductSale[],
  dialogEntries: DialogAgentSummaryEntry[]
): ReconciliationRow[] {
  const appCounts = new Map<string, number>();
  const totalCounts = new Map<string, number>();

  for (const sale of sales) {
    const productType = getProductType(sale);
    if (!productType || !sale.agentName) continue;
    const agentKey = normalize(sale.agentCode || sale.agentName);
    const quantity = sale.quantity || 1;
    const productKey = `${agentKey}|${productType}`;
    const channelKey = `${productKey}|${getChannel(sale)}`;
    appCounts.set(channelKey, (appCounts.get(channelKey) || 0) + quantity);
    totalCounts.set(productKey, (totalCounts.get(productKey) || 0) + quantity);
  }

  return dialogEntries.map((entry) => {
    const agentKey = normalize(entry.agentCode || entry.agentName);
    const productKey = `${agentKey}|${entry.productType}`;
    const appCount = entry.channel === 'TOTAL'
      ? totalCounts.get(productKey) || 0
      : appCounts.get(`${productKey}|${entry.channel}`) || 0;
    const dialogCount = Math.max(0, entry.reportCount || 0);
    const matchedCount = Math.min(appCount, dialogCount);
    const difference = appCount - dialogCount;

    return {
      agentKey,
      agentName: entry.agentName,
      productType: entry.productType,
      channel: entry.channel,
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
