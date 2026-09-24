import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck, UserRound, Users, BriefcaseBusiness, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import { DdWorldLogo } from './common/DdWorldLogo';
import { safeStorage } from '../utils/safeStorage';
import { sendOwnerPasswordReset } from '../services/supabaseAuth';

const blockedStatuses = new Set(['BLOCKED', 'SUSPENDED', 'EXITED', 'TEMPORARY_SUSPENDED', 'RESIGNED', 'TERMINATED', 'blocked']);
const roleMeta: Record<Exclude<UserRole, 'dialog_officer'>, { label: string; icon: React.ElementType }> = {
  owner: { label: 'Owner', icon: UserRound },
  team_leader: { label: 'Team Leader', icon: Users },
  junior_team_leader: { label: 'Junior Team Leader', icon: Users },
  agent: { label: 'Agent', icon: BriefcaseBusiness },
};

type LoginRole = Exclude<UserRole, 'dialog_officer'>;

export const LoginModal: React.FC = () => {
  const { login, loginWithoutCredentials, authError, retryAuth } = useAuth();
  const { users } = useData();
  const [selectedRole, setSelectedRole] = useState<LoginRole>('owner');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setResetSent(false);
    const value = identifier.trim().toLowerCase();
    // Preserve the exact password; whitespace can be part of a valid password.
    if (!value || !password) {
      setError('Employee ID / Agent Code / Email සහ Password දෙකම ඇතුළත් කරන්න.');
      return;
    }

    const target = users.find((user) =>
      user.id.toLowerCase() === value ||
      user.agentCode?.trim().toLowerCase() === value ||
      user.employeeId?.trim().toLowerCase() === value ||
      user.email?.trim().toLowerCase() === value,
    );
    if (!target && !value.includes('@')) {
      setError('Employee account එක හමු නොවීය. Registered email එකෙන් login කරන්න.');
      return;
    }
    if (target && target.role !== selectedRole) {
      setError(`මෙම account එක ${roleMeta[target.role as LoginRole]?.label || target.role} role එකට අයත්ය.`);
      return;
    }
    if (target && (blockedStatuses.has(String(target.employmentStatus || '')) || target.status === 'blocked')) {
      setError('මෙම account එක Owner විසින් BLOCK / SUSPEND / EXIT කර ඇත. Login denied.');
      return;
    }
    if (target && !target.email?.trim()) {
      setError('මෙම employee account එකට registered email එකක් නැත.');
      return;
    }

    setBusy(true);
    try {
      await login(target?.email?.trim().toLowerCase() || value, password, selectedRole);
      safeStorage.setItem('ddworld_last_login_id', target?.id || value);
    } catch (err: any) {
      setError(err?.message || 'Secure authentication අසාර්ථකයි.');
    } finally {
      setBusy(false);
    }
  };

  const resetOwnerPassword = async () => {
    setError('');
    setResetSent(false);
    setResetBusy(true);
    try {
      await sendOwnerPasswordReset();
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message || 'Owner password reset email එක යැවීමට නොහැකි විය.');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'#f5f8fc',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:430,background:'#fff',border:'1px solid #d8e3ef',borderRadius:24,padding:20,boxShadow:'0 12px 35px rgba(20,45,80,.12)',color:'#14213d'}}>
        <div style={{textAlign:'center'}}>
          <div style={{display:'inline-flex',width:64,height:64,borderRadius:18,alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#ef1d32,#1477e8)',color:'#fff',fontWeight:1000,fontSize:16}}>DD</div>
          <div style={{marginTop:10,fontSize:22,fontWeight:900}}>DD WORLD MARKETING</div>
          <div style={{marginTop:4,fontSize:12,color:'#718099'}}>Secure Employee Portal</div>
        </div>

        <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {(Object.keys(roleMeta) as LoginRole[]).map((role) => {
            const Icon = roleMeta[role].icon;
            const selected = selectedRole === role;
            return <button key={role} type="button" onClick={() => { setSelectedRole(role); setError(''); setResetSent(false); }}
              style={{minHeight:52,borderRadius:12,border:selected?'2px solid #1477e8':'1px solid #dce5ef',background:selected?'#1477e8':'#f7f9fc',color:selected?'#fff':'#34435b',fontWeight:800,fontSize:11,touchAction:'manipulation'}}>
              <Icon style={{width:16,height:16,margin:'0 auto 3px'}} />{roleMeta[role].label}
            </button>;
          })}
        </div>

        <button type="button" aria-label="Test Mode Login" onClick={() => { void loginWithoutCredentials(selectedRole); }}
          style={{width:'100%',minHeight:54,marginTop:14,border:0,borderRadius:14,background:'linear-gradient(90deg,#ef1d32,#1477e8)',color:'#fff',fontSize:14,fontWeight:900,touchAction:'manipulation',WebkitTapHighlightColor:'transparent',cursor:'pointer'}}>
          🧪 TEST MODE — Login
        </button>

        {authError && <div style={{marginTop:10,padding:10,borderRadius:12,background:'#fff8e7',border:'1px solid #f0d59a',color:'#8a5b00',fontSize:11}}>
          {authError} <button type="button" onClick={() => void retryAuth()} style={{marginLeft:8,padding:'5px 9px',borderRadius:8,border:0,background:'#fff',fontWeight:800}}>Retry</button>
        </div>}

        <form onSubmit={submit} style={{marginTop:16}}>
          <label style={{display:'block',fontSize:12,fontWeight:700,color:'#34435b'}}>Employee ID / Agent Code / Email
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" placeholder="Enter registered ID or email"
              style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:6,padding:'13px 14px',borderRadius:12,border:'1px solid #d6e1ed',background:'#f9fbfe',color:'#14213d',fontSize:14}} />
          </label>
          <label style={{display:'block',marginTop:12,fontSize:12,fontWeight:700,color:'#34435b'}}>Password
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter password"
              style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:6,padding:'13px 14px',borderRadius:12,border:'1px solid #d6e1ed',background:'#f9fbfe',color:'#14213d',fontSize:14}} />
          </label>
          {selectedRole === 'owner' && <button type="button" onClick={resetOwnerPassword} disabled={resetBusy}
            style={{width:'100%',marginTop:12,padding:11,borderRadius:12,border:'1px solid #c8dcf5',background:'#f3f8ff',color:'#1462b5',fontWeight:800}}>
            {resetBusy ? 'Sending…' : 'Forgot Owner Password'}
          </button>}
          {resetSent && <div style={{marginTop:10,padding:10,borderRadius:10,background:'#effbf5',color:'#087a45',fontSize:11}}>Password reset email sent.</div>}
          {error && <div style={{marginTop:10,padding:10,borderRadius:10,background:'#fff1f3',color:'#b42336',fontSize:11}}>{error}</div>}
          <button type="submit" disabled={busy}
            style={{width:'100%',marginTop:12,padding:13,borderRadius:12,border:0,background:'#14213d',color:'#fff',fontWeight:900,fontSize:13}}>
            {busy ? 'Authenticating…' : 'Secure Login'}
          </button>
        </form>
        <div style={{marginTop:12,textAlign:'center',fontSize:9,color:'#8795a8'}}>TEST MODE is temporary for app checking.</div>
      </div>
    </div>
  );
};
