/** Strict application-owned pagination. Never feed raw Framework .data/_routes URL here. */
export function strictPageQuery(query: URLSearchParams, allowedKeys:readonly string[]):number {
 for(const key of query.keys()){
  if(!allowedKeys.includes(key)||query.getAll(key).length!==1)
   throw new Response("Invalid pagination",{status:400,headers:{"Cache-Control":"private, no-store"}});
 }
 const raw=query.get("page")??"0";
 if(!/^(0|[1-9][0-9]{0,4})$/.test(raw)||Number(raw)>10000)
  throw new Response("Invalid pagination",{status:400,headers:{"Cache-Control":"private, no-store"}});
 return Number(raw);
}
