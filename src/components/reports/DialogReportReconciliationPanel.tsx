import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowLeftRight, ShieldCheck } from 'lucide-react';
import { ProductSale, User } from '../../types';
import {
  DialogAgentSummaryEntry,
  reconcileDialogAgentSummaries,
} from '../../services/reportReconciliation';

interface Props {
  currentUser: User;
  sales: ProductSale[];
  dialogEntries: DialogAgentSummaryEntry[];
  title?: string;
}

export const DialogReportReconciliationPanel: React.FC<Props> = ({
  currentUser,
  sales,
  dialogEntries,
  title = 'Dialog Report Reconciliation',
}) => {
  const canView = currentUser.role === 'owner' || currentUser.role === 'dialog_officer';
  if (!canView) return null;

  const rows = reconcileDialogAgentSummaries(sales, dialogEntries);

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-950 p-5 text-slate-100 shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-400">
            Aggregate counts only. Customer personal details are not displayed.
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 text-emerald-400" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              <th className="px-2 py-2">Agent</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">Channel</th>
              <th className="px-2 py-2 text-right">App Original</th>
              <th className="px-2 py-2 text-right">Dialog Report</th>
              <th className="px-2 py-2 text-right">Matched</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.agentKey}-${row.productType}-${row.channel}`} className="border-b border-slate-900">
                <td className="px-2 py-2 font-semibold text-white">{row.agentName}</td>
                <td className="px-2 py-2">{row.productType}</td>
                <td className="px-2 py-2">{row.channel}</td>
                <td className="px-2 py-2 text-right font-mono">{row.appCount}</td>
                <td className="px-2 py-2 text-right font-mono">{row.dialogCount}</td>
                <td className="px-2 py-2 text-right font-mono text-emerald-300">{row.matchedCount}</td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1">
                    {row.status === 'MATCHED' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : row.status === 'NO_DIALOG_DATA' ? <ArrowLeftRight className="h-3 w-3 text-slate-400" /> : <AlertTriangle className="h-3 w-3 text-amber-400" />}
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-slate-500">No report data attached yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
