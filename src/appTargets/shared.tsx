import React from 'react';
import {DataProvider} from '../context/DataContext';
import {AuthProvider,useAuth} from '../context/AuthContext';
import {LoginModal} from '../components/LoginModal';
export type AppTarget='agent'|'management'|'audit';
export const allowedRoles:Record<AppTarget,string[]>={agent:['agent'],management:['owner','team_leader'],audit:['dialog_officer']};
export const FatalDenied:React.FC<{target:AppTarget}>=({target})=><div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'#f5f8fc',color:'#14213d'}}><div style={{maxWidth:420,width:'100%',padding:24,borderRadius:20,border:'1px solid #d8e3ef',background:'#fff',textAlign:'center'}}><div style={{fontSize:22,fontWeight:900}}>DD WORLD — Access Denied</div><div style={{marginTop:10,fontSize:13,lineHeight:1.6}}>This application bundle is restricted to its assigned role. Access to the {target} app is denied.</div></div></div>;
export const TargetShell:React.FC<{target:AppTarget;children:React.ReactNode}>=({target,children})=>{const {currentUser}=useAuth();if(!currentUser)return <LoginModal/>;if(!allowedRoles[target].includes(currentUser.role))return <FatalDenied target={target}/>;return <>{children}</>;};
export const Providers:React.FC<{children:React.ReactNode}>=({children})=><DataProvider><AuthProvider>{children}</AuthProvider></DataProvider>;