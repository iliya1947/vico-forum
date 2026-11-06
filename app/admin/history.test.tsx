import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { AdminHistoryEvent, UserMeasureHistoryChange, UserMeasureHistoryState } from "../../db/admin-history";
import { HistoryEvents } from "./history";

afterEach(cleanup);

const initial:UserMeasureHistoryState={
  version:1,restrictions:["replies.create"],expiresAt:"2026-11-07T00:00:00.000Z",lifted:false,
};
const changed:UserMeasureHistoryState={
  version:2,restrictions:["topics.create"],expiresAt:null,lifted:false,
};
const lifted:UserMeasureHistoryState={...changed,version:3,lifted:true};

function event(id:string,change:UserMeasureHistoryChange):AdminHistoryEvent {
  return {
    id,at:"2026-11-06T09:00:00.000Z",actorId:"manager-id",actorLabel:"Moderator",
    reason:change.reason,change,
  };
}
function measureChange(action:UserMeasureHistoryChange["action"],
  before:UserMeasureHistoryState|null,after:UserMeasureHistoryState,
  extras:Partial<UserMeasureHistoryChange["context"]>={}):UserMeasureHistoryChange {
  return {
    action,targetType:"user-measure",targetId:"measure-id",targetLabel:"Account",
    reason:"Administrative decision",
    context:{targetUserId:"account-id",operationId:"private-operation",fingerprint:"private-fingerprint",
      before,after,...extras},
  };
}
const common=Object.fromEntries(
  Object.entries(canonicalEnglishCatalog.common).flatMap(([key,descriptor])=>
    typeof descriptor.source==="string"?[[key,descriptor.source]]:
      Object.entries(descriptor.source).map(([suffix,value])=>[key+"_"+suffix,value]),
  ),
);
function translate(){
  return createTranslationRuntime({
    locale:{translationLocale:"en",direction:"ltr",fallbackLocales:[],
      formatting:{locale:"en",timeZone:"UTC"},nativeName:"English",presentationMetadata:{}},
    fallbackLocales:[],resourcesByLocale:{en:{common}},bundleVersions:{en:{common:"test"}},staleKeys:{},
  });
}

describe("AP10-MIRA-06 administrative measure History rendering",()=>{
  it("renders create/change/lift actual before/after data with localized field labels",()=>{
    const changes=[
      measureChange("measure.created",null,initial),
      measureChange("measure.changed",initial,changed),
      measureChange("measure.lifted",changed,lifted),
    ];
    const {container}=render(<I18nextProvider i18n={translate()}>
      <HistoryEvents locale="en" events={changes.map((c,i)=>event(String(i),c))}/>
    </I18nextProvider>);
    const rows=[...container.querySelectorAll(".admin-history-events > li")];
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("User measure created");
    expect(rows[0]).toHaveTextContent("None");
    expect(rows[0]).toHaveTextContent("replies.create");
    expect(rows[0]).toHaveTextContent("End time (UTC)");
    expect(rows[1]).toHaveTextContent("User measure changed");
    expect(rows[1]).toHaveTextContent("replies.create");
    expect(rows[1]).toHaveTextContent("topics.create");
    expect(rows[1]).toHaveTextContent("Permanent");
    expect(rows[1]).toHaveTextContent("1 → 2");
    expect(rows[2]).toHaveTextContent("User measure lifted");
    expect(rows[2]).toHaveTextContent("Active");
    expect(rows[2]).toHaveTextContent("Lifted");
    expect(rows[2]).toHaveTextContent("2 → 3");
    expect(rows[2]).toHaveTextContent("Moderator");
    expect(container).not.toHaveTextContent("private-operation");
    expect(container).not.toHaveTextContent("private-fingerprint");
  });
  it("renders accepted appeal outcome/remedy and keeps rejected no-change history explicit",()=>{
    const accepted=measureChange("measure.appealResolved",changed,lifted,{
      appealId:"appeal-accepted",outcome:"accepted",remedy:"lift",
    });
    const rejected=measureChange("measure.appealResolved",initial,initial,{
      appealId:"appeal-rejected",outcome:"rejected",
    });
    const {container}=render(<I18nextProvider i18n={translate()}>
      <HistoryEvents locale="en" events={[event("1",accepted),event("2",rejected)]}/>
    </I18nextProvider>);
    const rows=[...container.querySelectorAll(".admin-history-events > li")];
    expect(rows[0]).toHaveTextContent("appeal-accepted");
    expect(rows[0]).toHaveTextContent("Accepted");
    expect(rows[0]).toHaveTextContent("Decision remedy");
    expect(rows[0]).toHaveTextContent("Lift measure");
    expect(rows[0]).toHaveTextContent("Active");
    expect(rows[0]).toHaveTextContent("Lifted");
    expect(rows[1]).toHaveTextContent("appeal-rejected");
    expect(rows[1]).toHaveTextContent("Rejected");
    expect(rows[1]).not.toHaveTextContent("Decision remedy");
    expect(rows[1]!.querySelector(".admin-measure-history-change")).toBeNull();
    expect(container).not.toHaveTextContent("private-fingerprint");
  });
});
