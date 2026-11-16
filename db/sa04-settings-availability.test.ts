import type { Client, Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError, AccountStateUnexpectedError } from "./account-state";
import { createHyperdriveUserLocale, UserLocaleUnavailableError } from "./hyperdrive-user-locale";
import { createHyperdriveUserPrivacy, UserPrivacyUnavailableError } from "./hyperdrive-user-privacy";
import { createHyperdriveRegistrationSettings, RegistrationSettingsUnavailableError } from "./hyperdrive-registration-settings";
import { DrizzleUserPrivacyRepository } from "./user-privacy";
import { PostgresRegistrationSettingsRepository } from "./registration-settings";

afterEach(()=>vi.restoreAllMocks());
const connection="postgres://test.invalid/synthetic_test";
function operations(error:unknown){
  const c=()=>({connect:async()=>{},end:async()=>{}} as unknown as Client);
  vi.spyOn(DrizzleUserPrivacyRepository.prototype,"save").mockRejectedValue(error);
  vi.spyOn(PostgresRegistrationSettingsRepository.prototype,"update").mockRejectedValue(error);
  return [
    {type:UserLocaleUnavailableError,run:()=>createHyperdriveUserLocale(connection,
      ()=>({connect:async()=>{throw error;},end:async()=>{}} as unknown as Client)).save("owner","ru")},
    {type:UserPrivacyUnavailableError,run:()=>createHyperdriveUserPrivacy(connection,c).save("owner",false)},
    {type:RegistrationSettingsUnavailableError,run:()=>createHyperdriveRegistrationSettings(connection,"owner",
      ()=>({end:async()=>{}} as unknown as Pool)).update("owner",{
        expectedVersion:1,googleRegistrationEnabled:false,emailRegistrationEnabled:false})},
  ];
}
describe("SA04 O/P/Q shared typed availability and denial classification",()=>{
  it("bare and cause-wrapped state outages keep original cause as503-domain failures",async()=>{
    for(const error of [new AccountStateUnavailableError(),new Error("wrapped",{cause:new AccountStateUnavailableError()})]){
      for(const op of operations(error)){
        await expect(op.run()).rejects.toBeInstanceOf(op.type);
        await expect(op.run()).rejects.toMatchObject({cause:error});
      }
      vi.restoreAllMocks();
    }
  });
  it("lifecycle denial and unexpected tuple/program/schema errors are never fabricated503",async()=>{
    const cycle=new Error("cyclic");Object.assign(cycle,{cause:cycle});
    for(const error of [new AccountInactiveError(),new AccountMissingError(),new AccountStateUnexpectedError(),
      new TypeError("private programming error"),Object.assign(new Error("private schema"),{code:"42P01"}),cycle]){
      for(const op of operations(error))await expect(op.run()).rejects.toBe(error);
      vi.restoreAllMocks();
    }
  });
});
