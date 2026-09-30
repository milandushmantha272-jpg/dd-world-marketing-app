import React from 'react';
import { Heart, MessageCircle, Lightbulb, Send, Trophy, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

type Post = { id:string; author_user_id:string; author_name:string|null; post_type:string; content:string; created_at:string; };
type Reward = { reward_month:string; amount:number; candidate_user_id:string|null; candidate_score:number|null; candidate_breakdown:any; status:string; };

export const EmployeeHubPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [posts,setPosts]=React.useState<Post[]>([]);
  const [reward,setReward]=React.useState<Reward|null>(null);
  const [text,setText]=React.useState('');
  const [type,setType]=React.useState('discussion');
  const [loading,setLoading]=React.useState(true);
  const [sending,setSending]=React.useState(false);
  const [message,setMessage]=React.useState<string|null>(null);

  const load=React.useCallback(async()=>{
    setLoading(true);
    const {data,error}=await supabase.from('community_posts').select('id,author_user_id,author_name,post_type,content,created_at').eq('status','published').order('created_at',{ascending:false}).limit(50);
    if(error) setMessage(error.message); else setPosts((data||[]) as Post[]);
    const rr=await supabase.from('employee_star_rewards').select('*').order('reward_month',{ascending:false}).limit(1).maybeSingle();
    if(!rr.error) setReward(rr.data as Reward|null);
    setLoading(false);
  },[]);
  React.useEffect(()=>{void load();},[load]);

  const publish=async()=>{
    const body=text.trim();
    if(!body||!currentUser||sending)return;
    setSending(true);setMessage(null);
    const {error}=await supabase.from('community_posts').insert({author_user_id:currentUser.id,post_type:type,content:body});
    if(error)setMessage(error.message); else {setText('');await load();}
    setSending(false);
  };

  const reactTo=async(postId:string)=>{
    if(!currentUser)return;
    const {error}=await supabase.from('community_reactions').insert({post_id:postId,user_id:currentUser.id,reaction_type:'like'});
    if(error && !/duplicate|unique/i.test(error.message)) setMessage(error.message);
  };

  const approveReward=async()=>{
    if(currentUser?.role!=='owner'||!reward?.candidate_user_id)return;
    const {error}=await supabase.from('employee_star_rewards').update({status:'approved',approved_by:currentUser.id,approved_at:new Date().toISOString()}).eq('id',(reward as any).id);
    if(error)setMessage(error.message); else await load();
  };

  return <section className="dd-page-shell min-h-screen px-3 py-4 sm:px-5 md:px-6">
    <div className="mx-auto w-full max-w-3xl">
      <div className="dd-card rounded-3xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-red-300">DD WORLD</div><h1 className="mt-1 text-2xl font-black text-white">Employee Hub</h1><p className="mt-1 text-sm text-slate-300">එකිනෙකා සමඟ තොරතුරු, අදහස් සහ ජයග්‍රහණ බෙදාගන්න.</p></div>
          <button onClick={()=>void load()} className="min-h-11 min-w-11 rounded-xl bg-white/10 p-2 text-white" aria-label="Refresh"><RefreshCw className="mx-auto h-5 w-5"/></button>
        </div>
      </div>

      <div className="mt-4 dd-card rounded-3xl p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-white"><Lightbulb className="h-5 w-5 text-amber-300"/><span className="font-black">Share with DD WORLD</span></div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {['discussion','idea','achievement','update'].map(v=><button key={v} onClick={()=>setType(v)} className={`min-h-10 rounded-xl px-2 text-xs font-black ${type===v?'bg-red-500 text-white':'bg-white/10 text-slate-300'}`}>{v==='discussion'?'Discussion':v==='idea'?'Idea':v==='achievement'?'Achievement':'Update'}</button>)}
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={4} maxLength={5000} placeholder="ඔබගේ අදහස මෙතැන ලියන්න..." className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-red-400 resize-none"/>
        <button disabled={!text.trim()||sending} onClick={()=>void publish()} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 font-black text-white disabled:opacity-50"><Send className="h-4 w-4"/>{sending?'Sending...':'Publish'}</button>
      </div>

      <div className="mt-4 dd-card rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2 text-white"><Trophy className="h-5 w-5 text-amber-300"/><span className="font-black">DD WORLD Employee Star</span></div>
        <p className="mt-1 text-sm text-slate-300">මාසික recognition reward — <strong className="text-white">Rs. 2,500</strong></p>
        {reward ? <div className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-slate-200"><div>Status: <strong className="text-white">{reward.status}</strong></div>{currentUser?.role==='owner' && reward.candidate_user_id && <><div className="mt-1">Automatic candidate score: <strong>{reward.candidate_score}</strong></div><div className="mt-1 text-xs text-slate-400">Posts: {reward.candidate_breakdown?.posts ?? 0} · Comments: {reward.candidate_breakdown?.comments ?? 0} · Reactions: {reward.candidate_breakdown?.reactions ?? 0}</div><button onClick={()=>void approveReward()} className="mt-3 min-h-11 w-full rounded-xl bg-amber-400 px-4 font-black text-slate-950">Owner Approve Rs. 2,500</button></>}</div> : <div className="mt-3 text-sm text-slate-400">මෙම මාසයේ reward cycle එක තවම candidate එකක් generate කරලා නැහැ.</div>}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <div className="dd-card rounded-2xl p-5 text-sm text-slate-300">Loading Employee Hub...</div> : posts.length===0 ? <div className="dd-card rounded-2xl p-5 text-sm text-slate-300">තවම post එකක් නැහැ. පළමු අදහස share කරන්න.</div> : posts.map(post=><article key={post.id} className="dd-card rounded-3xl p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><div className="font-black text-white">{post.author_name || 'DD WORLD Employee'}</div><div className="text-[11px] text-slate-400">{post.post_type} · {new Date(post.created_at).toLocaleString()}</div></div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{post.content}</p><div className="mt-3 flex gap-2"><button onClick={()=>void reactTo(post.id)} className="min-h-10 rounded-xl bg-white/10 px-3 text-xs font-bold text-slate-200"><Heart className="mr-1 inline h-4 w-4"/>Like</button><button className="min-h-10 rounded-xl bg-white/10 px-3 text-xs font-bold text-slate-200"><MessageCircle className="mr-1 inline h-4 w-4"/>Comment</button></div></article>)}
      </div>
      {message&&<div className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-200">{message}</div>}
    </div>
  </section>;
};
