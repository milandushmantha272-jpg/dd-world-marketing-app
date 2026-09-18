import React from 'react';
import { LockKeyhole, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabase';

export const ResetPasswordPage: React.FC = () => {
  const [ready, setReady] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
        setError('');
      }
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) setReady(true);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password එක අවම වශයෙන් characters 8ක් විය යුතුයි.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords දෙක එක සමාන නොවේ.');
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage('Password එක සාර්ථකව වෙනස් කළා. දැන් අලුත් password එකෙන් Login වෙන්න.');
      setPassword('');
      setConfirm('');
      await supabase.auth.signOut();
    } catch (err: any) {
      setError(err?.message || 'Password එක වෙනස් කිරීමට නොහැකි විය.');
    } finally {
      setBusy(false);
    }
  };

  const goToLogin = () => { window.location.href = '/'; };

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-[#06111f] px-4 py-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/15 bg-slate-950/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,.45)] sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-500" />
        <div className="flex justify-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">{message ? <CheckCircle2 className="h-8 w-8 text-emerald-300" /> : <LockKeyhole className="h-8 w-8 text-cyan-300" />}</div></div>
        <div className="mt-4 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">DD WORLD OFFICIAL</div>
          <h1 className="mt-2 text-2xl font-black text-white">Reset Password</h1>
          <p className="mt-1 text-xs text-slate-400">Secure Owner password recovery</p>
        </div>

        {!message ? (
          <>
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-xs font-bold text-emerald-200"><ShieldCheck className="h-4 w-4" />{ready ? 'Secure recovery link verified' : 'Verifying secure recovery link…'}</div>
            {ready ? (
              <form onSubmit={updatePassword} className="mt-5 space-y-4">
                <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">New Password</span><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10" placeholder="Enter new password" /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">Confirm Password</span><input type={showPassword ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10" placeholder="Confirm new password" /></label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> Show password</label>
                {error && <div className="rounded-2xl border border-red-400/25 bg-red-950/35 p-3 text-xs font-semibold leading-5 text-red-200">{error}</div>}
                <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-4 py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60">{busy ? 'Updating…' : 'Set New Password'}{!busy && <ArrowRight className="h-4 w-4" />}</button>
              </form>
            ) : <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-950/35 p-4 text-xs font-semibold leading-5 text-red-200">{error || 'Recovery link එක verify වෙමින් පවතී. Email එකේ Reset Password link එක නැවත touch කරන්න.'}</div>}
          </>
        ) : (
          <div className="mt-5 space-y-4"><div className="rounded-2xl border border-emerald-400/25 bg-emerald-950/30 p-4 text-sm font-bold leading-6 text-emerald-200">{message}</div><button type="button" onClick={goToLogin} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white">Back to Login <ArrowRight className="h-4 w-4" /></button></div>
        )}
      </div>
    </div>
  );
};
