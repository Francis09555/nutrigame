import { cors,json,context } from '../_shared/common.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const {user,admin}=await context(req),b=await req.json(),elapsed=Math.floor(Number(b.elapsed)),score=Math.floor(Number(b.score));
  const {data:s,error}=await admin.from('run_sessions').select('*').eq('id',b.sessionId).eq('player_id',user.id).eq('completed',false).single();
  if(error||!s||Date.parse(s.expires_at)<Date.now())return json({error:'Invalid session'},400);
  const wall=Math.floor((Date.now()-Date.parse(s.started_at))/1000);
  if(elapsed<s.last_elapsed||score<s.last_score||elapsed>wall+5||score>elapsed*2000+5000)return json({error:'Checkpoint rejected'},422);
  const {error:u}=await admin.from('run_sessions').update({last_checkpoint_at:new Date().toISOString(),checkpoint_count:s.checkpoint_count+1,last_elapsed:elapsed,last_score:score}).eq('id',s.id);
  if(u)throw u;return json({accepted:true,serverTime:new Date().toISOString()});
 }catch(e){return json({error:e.message||'Checkpoint failed'},e.message==='Unauthorized'?401:400)}
});
