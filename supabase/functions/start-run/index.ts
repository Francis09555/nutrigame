import { cors,json,context } from '../_shared/common.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const {user,admin}=await context(req);const body=await req.json();
  const name=String(body.playerName||'').trim(),avatar=String(body.avatar||'🦸');
  if(!name||name.length>20||avatar.length>16)return json({error:'Invalid profile'},400);
  const {error:profileError}=await admin.from('profiles').upsert({id:user.id,player_name:name,avatar},{onConflict:'id'});
  if(profileError)throw profileError;
  const {data,error}=await admin.from('run_sessions').insert({player_id:user.id,mode:'endless'}).select('id,nonce,started_at').single();
  if(error)throw error;return json({session:data,serverTime:new Date().toISOString()});
 }catch(e){return json({error:e.message||'Unable to start run'},e.message==='Unauthorized'?401:400)}
});
