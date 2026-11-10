import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { account, session, user } from "../../db/schema";
import type { AuthTransitionFact } from "../../db/owner-auth-facts";

type Created = Extract<AuthTransitionFact, {kind:"account.created"|"auth.methodLinked"|"auth.sessionCreated"}>;
type Receipt =
  | {model:"user";id:string}
  | {model:"account";id:string;userId:string;providerId:"google"|"credential"}
  | {model:"session";id:string;userId:string};
const ID = /^[A-Za-z0-9._:-]{1,200}$/;
const LIMIT = 64;
const safeId = (value:unknown):value is string => typeof value==="string" && ID.test(value);
const key = (kind:Created["kind"],id:string) => kind+":"+id;

/**
 * Better Auth 1.7.7 may discard deferred create.after hooks when an operation
 * subsequently fails, even though the default transaction:false PostgreSQL
 * adapter has already committed a preceding insert. Capture only adapter
 * confirmed create IDs and recheck their committed rows after the operation.
 * In a true rollback no row remains, so no success fact can be emitted.
 */
export class AuthCreationEvidence {
  private readonly receipts = new Map<string,Receipt>();
  private readonly observed = new Set<string>();
  private overflow = 0;

  constructor(
    private readonly database:NodePgDatabase,
    private readonly capture:(fact:AuthTransitionFact)=>void,
    private readonly trustedActorFor:(userId:string)=>string|null,
    private readonly missed:(count:number)=>void,
  ) {}

  noteAdapterCreate(arg:unknown,value:unknown):void {
    const spec=arg as {model?:unknown}|null;
    const row=value as {id?:unknown;userId?:unknown;providerId?:unknown}|null;
    if(!spec || !row || !safeId(row.id)) return;
    let receipt:Receipt;
    if(spec.model==="user") receipt={model:"user",id:row.id};
    else if(spec.model==="session" && safeId(row.userId))
      receipt={model:"session",id:row.id,userId:row.userId};
    else if(spec.model==="account" && safeId(row.userId) &&
      (row.providerId==="google" || row.providerId==="credential"))
      receipt={model:"account",id:row.id,userId:row.userId,providerId:row.providerId};
    else return;
    const identifier=receipt.model+":"+receipt.id;
    if(this.receipts.has(identifier)) return;
    if(this.receipts.size>=LIMIT){this.overflow++;return;}
    this.receipts.set(identifier,receipt);
  }

  /** PostgreSQL INSERT ... RETURNING from the canonical Better Auth schema. */
  noteNativeInsert(statement:unknown,result:unknown):void {
    const sql=typeof statement==="string" ? statement :
      statement && typeof statement==="object" && "text" in statement
        ? (statement as {text:unknown}).text : null;
    if(typeof sql!=="string" || !/\breturning\b/i.test(sql)) return;
    const matched=/^insert into "(user|account|session)"\s*\(/i.exec(sql);
    if(!matched) return;
    const native=result as {rowCount?:unknown;rows?:unknown;fields?:unknown}|null;
    if(native?.rowCount!==1 || !Array.isArray(native.rows) || native.rows.length!==1){
      this.missed(1);return;
    }
    // Drizzle ORM 0.45.2 executes returning queries in node-postgres
    // rowMode:'array'; the column order comes from PG result.fields, not
    // a presumed static SELECT/RETURNING layout.
    const raw=native.rows[0];
    let fieldValue:(name:string)=>unknown;
    if(Array.isArray(raw) && Array.isArray(native.fields) &&
      raw.length===native.fields.length) {
      const fieldNames=native.fields.map((field:unknown)=>
        field && typeof field==="object" && "name" in field
          ? (field as {name:unknown}).name : null);
      fieldValue=(name)=>{const index=fieldNames.indexOf(name);return index<0?undefined:raw[index];};
    } else if(raw && typeof raw==="object" && !Array.isArray(raw)){
      const row=raw as Record<string,unknown>;
      fieldValue=(name)=>row[name];
    } else {this.missed(1);return;}
    const id=fieldValue("id");
    if(!safeId(id)){this.missed(1);return;}
    if(matched[1]==="user") this.noteAdapterCreate({model:"user"},{id});
    else if(matched[1]==="account")
      this.noteAdapterCreate({model:"account"},{
        id,userId:fieldValue("user_id"),providerId:fieldValue("provider_id"),
      });
    else this.noteAdapterCreate({model:"session"},{
      id,userId:fieldValue("user_id"),
    });
  }

  noteHook(fact:AuthTransitionFact):void {
    if(fact.kind==="account.created") this.observed.add(key(fact.kind,fact.userId));
    if(fact.kind==="auth.methodLinked") this.observed.add(key(fact.kind,fact.accountId));
    if(fact.kind==="auth.sessionCreated") this.observed.add(key(fact.kind,fact.sessionId));
  }

  async flush():Promise<void> {
    const receipts=[...this.receipts.values()];
    this.receipts.clear();
    if(this.overflow){this.missed(this.overflow);this.overflow=0;}
    const newUsers=new Set(receipts.filter(r=>r.model==="user").map(r=>r.id));
    for(const receipt of receipts){
      const kind:Created["kind"]=receipt.model==="user"?"account.created":
        receipt.model==="account"?"auth.methodLinked":"auth.sessionCreated";
      if(this.observed.has(key(kind,receipt.id))) continue;
      try {
        let fact:Created|null=null;
        if(receipt.model==="user"){
          const rows=await this.database.select({id:user.id}).from(user)
            .where(eq(user.id,receipt.id)).limit(1);
          if(rows[0]?.id===receipt.id)
            fact={kind:"account.created",userId:receipt.id};
        }else if(receipt.model==="account"){
          const rows=await this.database.select({
            id:account.id,userId:account.userId,providerId:account.providerId,
          }).from(account).where(eq(account.id,receipt.id)).limit(1);
          const saved=rows[0];
          if(saved?.id===receipt.id && saved.userId===receipt.userId &&
             saved.providerId===receipt.providerId){
            const method=receipt.providerId==="credential"?"password":"google";
            const trusted=this.trustedActorFor(receipt.userId);
            fact={kind:"auth.methodLinked",userId:receipt.userId,
              accountId:receipt.id,method,actorUserId:trusted,
              linkContext:newUsers.has(receipt.userId)?"registration":
                trusted && method==="google"?"explicit-link":"unknown"};
          }
        }else{
          const rows=await this.database.select({id:session.id,userId:session.userId})
            .from(session).where(eq(session.id,receipt.id)).limit(1);
          if(rows[0]?.id===receipt.id && rows[0].userId===receipt.userId)
            fact={kind:"auth.sessionCreated",userId:receipt.userId,
              sessionId:receipt.id,actorUserId:this.trustedActorFor(receipt.userId)};
        }
        if(fact){
          this.observed.add(key(fact.kind,receipt.id));
          this.capture(fact);
        }
      }catch{
        // Query failure or telemetry callback failure: not a verified transition.
        this.missed(1);
      }
    }
  }
}
