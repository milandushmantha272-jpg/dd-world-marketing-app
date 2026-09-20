import { DialogAgentSummaryEntry } from './reportReconciliation';

export interface ParsedDialogSummary {
  productType: 'ගොවිමිතුරු' | 'සයුරු';
  entries: DialogAgentSummaryEntry[];
  rejectedLines: number;
}

const normalizeProduct = (value: string): 'ගොවිමිතුරු' | 'සයුරු' | undefined => {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized === 'ගොවිමිතුරු' || normalized.includes('govi')) return 'ගොවිමිතුරු';
  if (normalized === 'සයුරු' || normalized.includes('sayuru')) return 'සයුරු';
  return undefined;
};

/**
 * Parses a manually transcribed aggregate Dialog report.
 * Supported row format: Agent Name, Count
 * Optional format: Agent Code, Agent Name, Count
 * The product is selected separately because the two Dialog reports arrive
 * independently. No customer-level fields are accepted or retained.
 */
export function parseDialogAggregateReport(
  text: string,
  productType: 'ගොවිමිතුරු' | 'සයුරු',
  channel: 'IVR' | 'APP' | 'TOTAL' = 'TOTAL'
): ParsedDialogSummary {
  const entries: DialogAgentSummaryEntry[] = [];
  let rejectedLines = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(/,|\t/).map((part) => part.trim()).filter(Boolean);
    const countText = parts[parts.length - 1];
    const reportCount = Number.parseInt(countText || '', 10);

    if (!Number.isFinite(reportCount) || reportCount < 0 || parts.length < 2) {
      rejectedLines += 1;
      continue;
    }

    const hasCode = parts.length >= 3;
    const agentCode = hasCode ? parts[0] : undefined;
    const agentName = hasCode ? parts.slice(1, -1).join(', ') : parts.slice(0, -1).join(', ');

    if (!agentName) {
      rejectedLines += 1;
      continue;
    }

    entries.push({
      agentCode,
      agentName,
      productType,
      channel,
      reportCount,
    });
  }

  return { productType, entries, rejectedLines };
}

/**
 * Keeps the product normalizer available to callers that receive labels from
 * spreadsheet headers without exposing any customer data.
 */
export function normalizeDialogProduct(value: string): 'ගොවිමිතුරු' | 'සයුරු' | undefined {
  return normalizeProduct(value);
}
