import {describe,it,expect} from "vitest";
import {loader} from "./under-development";
describe("completed Forum destination",()=>{
 it.each(["en","ru","he"])("redirects old Forum links to the protected canonical %s route",locale=>{
  const response=loader({params:{locale},request:new Request(`https://vico.test/${locale}/under-development?feature=admin-forum`)});
  expect(response).toBeInstanceOf(Response);expect((response as Response).status).toBe(302);expect((response as Response).headers.get("Location")).toBe(`/${locale}/admin/forum`);
 });
 it("keeps the Settings placeholder",()=>{
  expect(loader({params:{locale:"he"},request:new Request("https://vico.test/he/under-development?feature=admin-settings")})).toEqual({locale:"he",requestedFeature:"admin-settings"});
 });
});
