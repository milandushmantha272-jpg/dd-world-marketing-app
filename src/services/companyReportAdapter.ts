import { CompanyWeeklyReport } from '../types';
import { DialogAgentSummaryEntry } from './reportReconciliation';

interface CompanyReportEntry {
  agentCode?: string;
  agentName?: string;
  productType?: string;
  channel?: string;
  companyReportCount?: number;
}

const toProduct = (value: string | undefined): 'ගොවිමිතුරු' | 'සයුරු' | undefined => {
  const normalized = (value || '').trim().toLocaleLowerCase();
  if (normalized === 'ගොවිමිතුරු' || normalized.includes('govi')) return 'ගොවිමිතුරු';
  if (normalized === 'සයුරු' || normalized.includes('sayuru')) return 'සයුරු';
  return undefined;
};

const toChannel = (value: string | undefined): 'IVR' | 'APP' | 'TOTAL' => {
  const normalized = (value || '').trim().toLocaleLowerCase();
  if (normalized === 'ivr') return 'IVR';
  if (normalized === 'app' || normalized === 'direct') return 'APP';
  return 'TOTAL';
};

/** Converts legacy company report entries into privacy-safe aggregate rows. */
export function companyReportsToDialogSummaryEntries(
  reports: CompanyWeeklyReport[]
): DialogAgentSummaryEntry[] {
  const entries: DialogAgentSummaryEntry[] = [];

  for (const report of reports) {
    const reportEntries = Array.isArray(report.entries) ? report.entries as CompanyReportEntry[] : [];
    for (const entry of reportEntries) {
      const productType = toProduct(entry.productType);
      const agentName = (entry.agentName || '').trim();
      const reportCount = Number(entry.companyReportCount);
      if (!productType || !agentName || !Number.isFinite(reportCount) || reportCount < 0) continue;

      entries.push({
        agentCode: entry.agentCode,
        agentName,
        productType,
        channel: toChannel(entry.channel),
        reportCount,
      });
    }
  }

  return entries;
}
