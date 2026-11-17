import type {Client,Pool} from "pg";
import {it,expect,vi} from "vitest";
import {createHyperdriveOwnerLocalization} from "./hyperdrive-owner-localization";
import {OwnerSystemUnavailableError} from "./hyperdrive-owner-system";
it("keeps localization input on its own connection and releases both capabilities on source failure",async()=>{
  const failure=Object.assign(new Error("PRIVATE_LOCALIZATION_SQL"),{code:"42501"});
  const local={connect:vi.fn(async()=>undefined),query:vi.fn(async()=>{throw failure;}),end:vi.fn(async()=>undefined)};
  const web={connect:vi.fn(),query:vi.fn(),end:vi.fn(async()=>undefined)};
  const factories={web:vi.fn(()=>web as unknown as Pool),localization:vi.fn(()=>local as unknown as Client)};
  const read=createHyperdriveOwnerLocalization("web-only-connection","localization-only-connection","owner",factories);
  await expect(read.readCurrent()).rejects.toBeInstanceOf(OwnerSystemUnavailableError);
  expect(factories.web).toHaveBeenCalledExactlyOnceWith("web-only-connection");expect(factories.localization).toHaveBeenCalledExactlyOnceWith("localization-only-connection");
  expect(web.connect).not.toHaveBeenCalled();expect(web.query).not.toHaveBeenCalled();expect(local.end).toHaveBeenCalledOnce();expect(web.end).toHaveBeenCalledOnce();
});
it("does not create either database capability without the Owner binding",async()=>{
  const factories={web:vi.fn(),localization:vi.fn()};
  await expect(createHyperdriveOwnerLocalization("web","local",undefined,factories).readCurrent()).rejects.toThrow("binding missing");
  expect(factories.web).not.toHaveBeenCalled();expect(factories.localization).not.toHaveBeenCalled();
});
