import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile,rm,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {test} from "node:test";

test("Complaints smoke preserves a pre-existing config on EEXIST and early failure",async()=>{
  assert.equal(process.env.CI,"true","Only run against disposable CI PostgreSQL");
  const url=process.env.DATABASE_URL;
  assert.ok(url,"Disposable PostgreSQL URL required");
  const db=new URL(url);
  assert.ok(["127.0.0.1","localhost"].includes(db.hostname)&&db.pathname.endsWith("_test"),
    "Ownership probe requires loopback *_test PostgreSQL");
  const vars=resolve(".dev.vars"),marker="P7_PREEXISTING_CONFIG_MARKER\n";
  let created=false;
  try{
    await writeFile(vars,marker,{flag:"wx",mode:0o600});
    created=true;
    const run=(databaseUrl)=>spawnSync("pnpm",["exec","tsx","scripts/smoke-complaints-local.ts"],{
      cwd:process.cwd(),env:{...process.env,DATABASE_URL:databaseUrl},
      encoding:"utf8",timeout:20000
    });
    const collision=run(url);
    assert.equal(collision.status,1,"Existing config must fail exclusive create");
    assert.match(collision.stderr,/EEXIST/,"Expected exclusive-create refusal");
    assert.equal(await readFile(vars,"utf8"),marker,"EEXIST must preserve existing config");

    const missingDatabase=new URL(url);
    missingDatabase.port="1";
    const early=run(missingDatabase.toString());
    assert.equal(early.status,1,"Database failure must stop before config creation");
    assert.match(early.stderr,/ECONNREFUSED/,"Expected disposable database connection failure");
    assert.equal(await readFile(vars,"utf8"),marker,"Early failure must preserve existing config");
  }finally{
    if(created)await rm(vars,{force:true});
  }
});
