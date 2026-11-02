import {describe,it,expect} from "vitest";
import {strictPageQuery} from "./page-query";

describe("strict Package 5 pagination",()=>{
 it("bounds a single page and rejects unknown, duplicate and invalid keys",()=>{
  expect(strictPageQuery(new URLSearchParams(),["page"])).toBe(0);
  expect(strictPageQuery(new URLSearchParams("page=10000"),["page"])).toBe(10000);
  for(const value of ["page=1&page=2","unexpected=1","page=01","page=-1",
    "page=10001","page=1.0","page=Infinity","page=not-a-number"]){
    expect(()=>strictPageQuery(new URLSearchParams(value),["page"])).toThrowError(Response);
    try{strictPageQuery(new URLSearchParams(value),["page"])}catch(error){
      expect(error).toMatchObject({status:400});
    }
  }
 });
 it("allows only declared framework-normalized Attention application keys",()=>{
  expect(strictPageQuery(new URLSearchParams("mode=complaints&group=group3&page=2"),
    ["mode","group","page"])).toBe(2);
  for(const raw of ["mode=complaints&group=group3&group=group3",
    "mode=complaints&mode=complaints&group=group3",
    "mode=complaints&group=group3&_routes=routes%2Fattention"]){
    expect(()=>strictPageQuery(new URLSearchParams(raw),["mode","group","page"])).toThrow();
  }
 });
});
