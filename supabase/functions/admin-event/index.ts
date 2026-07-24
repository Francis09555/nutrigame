import { cors,json,context } from '../_shared/common.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const {user,admin}=await context(req),b=await req.json(),event=String(b.event||'');
  const {data:role}=await admin.from('developer_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!role)return json({error:'Administrator access required'},403);

  // Private administrator-only room list. No gameplay state is exposed.
  if(event==='list_active'){
   const cutoff=new Date(Date.now()-90000).toISOString();
   const {data:rooms,error}=await admin.from('multiplayer_rooms').select('id,code,status,last_active,host_id').eq('status','playing').gte('last_active',cutoff).order('last_active',{ascending:false});
   if(error)throw error;const ids=(rooms||[]).map((r:any)=>r.id);
   let members:any[]=[];if(ids.length){const q=await admin.from('multiplayer_members').select('room_id,player_id,player_name,avatar,last_seen,connected').in('room_id',ids).eq('connected',true).gte('last_seen',cutoff);if(q.error)throw q.error;members=q.data||[]}
   return json({rooms:(rooms||[]).map((r:any)=>({...r,players:members.filter(m=>m.room_id===r.id).map(m=>({id:m.player_id,name:m.player_name,avatar:m.avatar,lastSeen:m.last_seen}))})),serverTime:new Date().toISOString()});
  }

  if(event!=='surprise_swarm')return json({error:'Invalid live event'},400);
  const scope=b.scope==='global'?'global':'room',code=String(b.roomCode||'').trim().toUpperCase();
  if(scope==='room'&&!/^[A-Z2-9]{6}$/.test(code))return json({error:'Choose an active room'},400);
  // Server-side rate limit prevents accidental spam or abuse.
  const since=new Date(Date.now()-30000).toISOString();
  const {count}=await admin.from('admin_event_log').select('id',{count:'exact',head:true}).eq('admin_id',user.id).gte('created_at',since);
  if((count||0)>0)return json({error:'Wait 30 seconds before sending another live event'},429);
  let query=admin.from('multiplayer_rooms').select('code').eq('status','playing').gte('last_active',new Date(Date.now()-90000).toISOString());if(scope==='room')query=query.eq('code',code);
  const {data:rooms,error:roomError}=await query;if(roomError)throw roomError;if(!rooms?.length)return json({error:'No active matching rooms'},404);
  const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const messages=rooms.slice(0,100).map((r:any)=>({topic:`room:${r.code}`,event:'admin_swarm',payload:{type:'surprise_swarm',scope,issuedAt:new Date().toISOString()},private:false}));
  const response=await fetch(`${url}/realtime/v1/api/broadcast`,{method:'POST',headers:{'Content-Type':'application/json','apikey':service,'Authorization':`Bearer ${service}`},body:JSON.stringify({messages})});
  if(!response.ok)throw new Error('Realtime broadcast failed');
  await admin.from('admin_event_log').insert({admin_id:user.id,event_type:event,room_code:scope==='room'?code:null,scope});
  return json({sent:true,scope,rooms:rooms.length});
 }catch(e){return json({error:e.message||'Unable to process live event'},e.message==='Unauthorized'?401:400)}
});
