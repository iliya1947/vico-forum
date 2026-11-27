import {it,expect,vi} from "vitest";
import {observeRequiredLocalizationRead,googleParametersPresent,mailConfigurationPresence} from "./integration-runtime";
import {loadPersistentRegistry} from "../localization/persistent-registry";
it('observes the already required request-local load once without changing its result',async()=>{
  const loaded=await loadPersistentRegistry({readAll:async()=>[]}),loader=vi.fn(async()=>loaded),observed=observeRequiredLocalizationRead(loader);
  expect(observed.current()).toBeNull();expect(await observed.load()).toBe(loaded);expect(await observed.load()).toBe(loaded);expect(loader).toHaveBeenCalledOnce();
  expect(observed.current()).toMatchObject({source:'required-localization-registry-load',phase:'read-and-validation',quality:'measured',outcome:'valid-registry-returned'});
});
it('keeps classified degraded provenance distinct from an actual web measurement',async()=>{
  const loaded=await loadPersistentRegistry({readAll:async()=>{throw {code:'ECONNREFUSED'};}}),observed=observeRequiredLocalizationRead(async()=>loaded);
  await observed.load();expect(observed.current()).toMatchObject({quality:'unavailable',outcome:'dependency-unavailable'});
});
it('preserves an unexpected loader exception without inventing a database outage',async()=>{
  const failure=Error('SA07_I_PRIVATE_UNEXPECTED'),observed=observeRequiredLocalizationRead(async()=>{throw failure;});
  await expect(observed.load()).rejects.toBe(failure);expect(observed.current()).toBeNull();
});
it('returns only combined presence for the existing two Google parameters',()=>{
  expect(googleParametersPresent({})).toBe(false);expect(googleParametersPresent({GOOGLE_CLIENT_ID:'id',GOOGLE_CLIENT_SECRET:' '})).toBe(false);
  expect(googleParametersPresent({GOOGLE_CLIENT_ID:'SA07_I_PRIVATE_ID',GOOGLE_CLIENT_SECRET:'SA07_I_PRIVATE_SECRET'})).toBe(true);
});

it("describes mail configuration presence without interpreting it as activation or exposing credentials",()=>{
  expect(mailConfigurationPresence({})).toEqual({mailModeRequested:"disabled",mailProviderParametersPresent:false});
  const result=mailConfigurationPresence({AUTH_MAIL_MODE:"provider",AUTH_MAIL_PROVIDER:"resend",
    AUTH_MAIL_FROM_ADDRESS:"private@example.test",AUTH_MAIL_RESEND_KEY:"PRIVATE_KEY"});
  expect(result).toEqual({mailModeRequested:"provider",mailProviderParametersPresent:true});
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
  expect(mailConfigurationPresence({AUTH_MAIL_MODE:"PRIVATE_INVALID"}).mailModeRequested).toBe("invalid");
});
