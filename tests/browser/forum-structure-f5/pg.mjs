/** Disposable F5 connected-browser fixture. No production connection or generated secrets. */
import readline from "node:readline";
import crypto from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { DrizzleForumRepository } from "../../../db/forum-repository.ts";
const databaseUrl=process.env.DATABASE_URL;
if(process.env.CI!=="true" || !databaseUrl)throw new Error("CI test database is required");
const target=new URL(databaseUrl);
if(!["localhost","127.0.0.1"].includes(target.hostname) || target.pathname!=="/vico_f5_browser_test")
  throw new Error("F5 fixture must use its own disposable loopback database");
const client=new pg.Client({connectionString:databaseUrl});
await client.connect();
const forum=new DrizzleForumRepository(drizzle(client),{cooldownMs:0,now:()=>new Date()});
process.stdout.write("READY\n");
try{
  for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
    if(!line.trim())continue;
    try{
      const input=JSON.parse(line);
      let result;
      if(input.op==="sql"){
        result=(await client.query(input.sql,input.params??[])).rows;
      }else if(input.op==="topic"){
        const topicId="f5-"+crypto.randomUUID();
        const postId=crypto.randomUUID();
        const answerId=crypto.randomUUID();
        await forum.createTopicWithInitialPost({
          id:topicId,sectionId:input.sectionId,authorId:input.authorId,
          titleRevision:{id:crypto.randomUUID(),originalContent:"F5 original topic title",sourceLocale:"en"},
          initialPost:{id:postId,topicId,authorId:input.authorId,
            bodyRevision:{id:crypto.randomUUID(),originalContent:"F5 original topic body",sourceLocale:"en"}},
        });
        await forum.createPost({id:answerId,topicId,authorId:input.authorId,
          bodyRevision:{id:crypto.randomUUID(),originalContent:"F5 published answer",sourceLocale:"en"}});
        result={topicId,postId,answerId};
      }else throw new Error("Unknown F5 fixture operation");
      process.stdout.write(JSON.stringify({result})+"\n");
    }catch(error){
      process.stdout.write(JSON.stringify({error:String(error),code:error?.code})+"\n");
    }
  }
}finally{await client.end();}
