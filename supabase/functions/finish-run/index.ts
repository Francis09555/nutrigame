import { cors,json,context } from '../_shared/common.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const {user,admin}=await context(req),b=await req.json();
  const elapsed=Math.floor(Number(b.survivalTime)),score=Math.floor(Number(b.score)),level=Math.floor(Number(b.level)),bosses=Math.floor(Number(b.bosses)),kills=Math.floor(Number(b.kills));
  if([elapsed,score,level,bosses,kills].some(x=>!Number.isFinite(x)||x<0))return json({error:'Invalid values'},400);
  const {data:s,error}=await admin.from('run_sessions').select('*').eq('id',b.sessionId).eq('player_id',user.id).eq('completed',false).single();
  if(error||!s||Date.parse(s.expires_at)<Date.now())return json({error:'Invalid or duplicate run'},409);
  const wall=Math.floor((Date.now()-Date.parse(s.started_at))/1000),required=elapsed>=120?1:0;
  const plausible=elapsed<=wall+5&&s.checkpoint_count>=required&&elapsed>=s.last_elapsed&&score>=s.last_score&&score<=elapsed*2000+5000&&level<=5+Math.floor(elapsed/4)&&bosses<=Math.floor(elapsed/600)&&kills<=elapsed*30+100;
  if(!plausible)return json({error:'Run failed server validation'},422);
  const ev=Array.isArray(b.evolutions)?b.evolutions.slice(0,10).map(String):[];
  const {data:runId,error:rpcError}=await admin.rpc('apply_validated_run',{p_session:s.id,p_player:user.id,p_score:score,p_time:elapsed,p_level:Math.max(1,level),p_bosses:bosses,p_kills:kills,p_weapon:b.favoriteWeapon?String(b.favoriteWeapon).slice(0,40):null,p_evolutions:ev});
  if(rpcError)throw rpcError;
  const {data:rows}=await admin.from('global_endless_leaderboard').select('player_id,score,survival_time,level,bosses').order('score',{ascending:false}).order('survival_time',{ascending:false}).order('level',{ascending:false}).order('bosses',{ascending:false});
  const rank=(rows||[]).findIndex((r:any)=>r.player_id===user.id)+1;
  return json({accepted:true,runId,rank:rank||null,top100:rank>0&&rank<=100});
 }catch(e){return json({error:e.message||'Submission failed'},e.message==='Unauthorized'?401:400)}
});
