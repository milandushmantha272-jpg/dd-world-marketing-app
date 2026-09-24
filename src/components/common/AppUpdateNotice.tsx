import React from 'react';
import { ExternalLink, X } from 'lucide-react';
import { checkForAppUpdate, type AppUpdateInfo } from '../../services/appUpdate';

export const AppUpdateNotice: React.FC = () => {
  const [update, setUpdate] = React.useState<AppUpdateInfo | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    void checkForAppUpdate().then((result) => {
      if (mounted && result?.available) setUpdate(result);
    });
    return () => { mounted = false; };
  }, []);

  if (!update || dismissed) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-[200] mx-auto max-w-xl rounded-2xl border border-emerald-400/30 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">DD WORLD UPDATE</div>
          <div className="mt-1 text-sm font-black">New app version {update.latestVersion} is available.</div>
          {update.releaseNotes && (
            <div className="mt-1 max-h-16 overflow-hidden text-xs leading-5 text-slate-300">{update.releaseNotes}</div>
          )}
          {update.mandatory && <div className="mt-2 text-[11px] font-bold text-amber-300">This update is required.</div>}
          <a
            href={update.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950"
          >
            Update App <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {!update.mandatory && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Dismiss update notice"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AppUpdateNotice;
