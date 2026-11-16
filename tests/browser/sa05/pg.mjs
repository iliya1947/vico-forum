/** Disposable SA05 fixture/inspection process; no server or production port. */
import readline from "node:readline";
import process from "node:process";
import crypto from "node:crypto";
import { URL } from "node:url";
import console from "node:console";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { DrizzleForumRepository } from "../../../db/forum-repository.ts";
const connectionString=process.env.DATABASE_URL;
if(process.env.CI!=="true" || !connectionString)throw new Error("Disposable CI database required");
const db=new URL(connectionString);
if(!["127.0.0.1","localhost"].includes(db.hostname)||db.pathname!=="/vico_sa05_browser_test")throw new Error("Only own loopback SA05 test database allowed");
const client=new pg.Client({connectionString});await client.connect();
const forum=new DrizzleForumRepository(drizzle(client),{cooldownMs:0,now:()=>new Date()});
console.log("READY");
try{
  for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
    if(!line.trim())continue;
    try{
      const input=JSON.parse(line);let result;
      if(input.operation==="sql")result=(await client.query(input.sql,input.params??[])).rows;
      else if(input.operation==="seed"){
        const topic=crypto.randomUUID(),post=crypto.randomUUID(),revision=crypto.randomUUID(),title=crypto.randomUUID();
        await forum.createCategory({id:input.prefix,name:"SA05 retained category"});
        await forum.createSection({id:input.prefix,categoryId:input.prefix,name:"SA05 retained section"});
        await forum.createTopicWithInitialPost({id:topic,sectionId:input.prefix,authorId:input.author,
          titleRevision:{id:title,originalContent:"SA05 retained topic",sourceLocale:"en"},
          initialPost:{id:post,topicId:topic,authorId:input.author,bodyRevision:{id:revision,originalContent:"SA05 retained published text",sourceLocale:"en"}}});
        const reply=crypto.randomUUID();
        await forum.createPost({id:reply,topicId:topic,authorId:input.other,
          bodyRevision:{id:crypto.randomUUID(),originalContent:"SA05 retained answer",sourceLocale:"en"}});
        await forum.updateProfile(input.author,{bio:input.marker,githubUrl:null,websiteUrl:"https://example.test/"+input.marker});
        result={topic,post,revision,title,reply,section:input.prefix};
      }else if(input.operation==="publish-file"){
        const post=crypto.randomUUID();
        await forum.createPost({id:post,topicId:input.topic,authorId:input.author,
          bodyRevision:{id:crypto.randomUUID(),originalContent:"Retained attached file: [file](/api/attachments/file/"+input.attachment+")",sourceLocale:"en"},
          publishedDraft:{contextKey:input.context,draftId:input.draft,attachmentIds:[input.attachment]}});
        result={post};
      }else throw new Error("Unknown fixture operation");
      console.log(JSON.stringify({result}));
    }catch(error){console.log(JSON.stringify({error:{message:String(error),code:error?.code}}));}
  }
}finally{await client.end();}
