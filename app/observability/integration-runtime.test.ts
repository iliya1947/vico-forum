import {it,expect,vi} from "vitest";
import {observeRequiredLocalizationRead,googleParametersPresent} from "./integration-runtime";
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
