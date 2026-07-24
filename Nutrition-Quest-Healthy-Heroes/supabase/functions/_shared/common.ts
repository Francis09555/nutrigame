import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
export const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
export async function context(req:Request){
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const auth=req.headers.get('Authorization')||'';
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await userClient.auth.getUser();
 if(error||!user)throw new Error('Unauthorized');
 return {user,admin:createClient(url,service,{auth:{persistSession:false}})};
}
