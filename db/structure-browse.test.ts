import {describe,it,expect} from "vitest";
import {decodeStructureCursor,encodeStructureCursor,type StructureBrowseScope} from "./structure-browse";
import {StructureValidationError} from "./forum-structure";
const scope:StructureBrowseScope={kind:"sections",parent:"c/עברית",search:"literal %_😀"};
const order=["9223372036854775807","c/עברית","9007199254740993","s/😀"];
const encode=(value:unknown)=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
describe("versioned order cursor",()=>{
 it("roundtrips Unicode and full bigint without Number coercion",()=>{const value=encodeStructureCursor(scope,order);expect(decodeStructureCursor(scope,value)).toEqual(order);expect(decodeStructureCursor(scope)).toBeNull();});
 it.each(["0","01","-1","9223372036854775808","1\n"])("rejects invalid position %j (zero is accepted separately)",value=>{
  if(value==="0"){expect(decodeStructureCursor(scope,encodeStructureCursor(scope,[value,"c","0","s"]))).toEqual(["0","c","0","s"]);return;}
  expect(()=>encodeStructureCursor(scope,[value,"c","0","s"])).toThrow(StructureValidationError);
 });
 it.each([{},null,[],{v:2,...scope,order:["0","c","0","s"]},{v:1,...scope,order:[0,"c","0","s"]},{v:1,...scope,order:["0","c","0","s"],extra:true}])("rejects malformed closed shape",value=>expect(()=>decodeStructureCursor(scope,encode(value))).toThrow(StructureValidationError));
 it.each(["bare-id","!","e30","a".repeat(16385)])("rejects legacy/truncated/oversize cursor",value=>expect(()=>decodeStructureCursor(scope,value)).toThrow(StructureValidationError));
});
