import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { render,screen,cleanup } from "@testing-library/react";
import { afterEach,it,expect } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues,hebrewCommonValues } from "../localization/manual-values";
import { ComplaintQueueList } from "./queue-view";
import type { ComplaintQueueCase } from "./queue-contract";
afterEach(cleanup);
it.each(["en","ru","he"])("renders actual Case context, global totals and bounded paging in %s",async locale=>{
  const i18n=createInstance();const common=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:
    Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,v])=>[k,v.source]));
  await i18n.init({lng:locale,resources:{[locale]:{common}},defaultNS:"common",initAsync:false});
  const item:ComplaintQueueCase={id:"case",version:1,state:"open",kind:"post",topicId:"topic",postId:"post",revisionId:"revision",
    topicTitle:"Topic עברית",topicLocale:"he",topicDirection:"rtl",excerptDirection:"ltr",excerpt:"Reported text",sourceLocale:"en",reasons:{threats:2,spam:1},reportCount:3,
    firstReportedAt:"2026-10-30T00:00:00Z",lastReportedAt:"2026-10-30T01:00:00Z",automaticPriority:3,priority:3,priorityOverride:null,activeElsewhere:true};
  render(<I18nextProvider i18n={i18n}><MemoryRouter><ComplaintQueueList locale={locale} queue={{cases:[item],total:52,page:1,hasMore:true}}/></MemoryRouter></I18nextProvider>);
  expect(screen.getByText(i18n.t("complaintQueueTotal",{total:new Intl.NumberFormat(locale).format(52)}))).toBeTruthy();
  expect(screen.getByRole("link",{name:i18n.t("complaintOpenCase")}).getAttribute("href")).toBe(`/${locale}/attention/complaints/case`);
  expect(screen.getByRole("link",{name:i18n.t("attentionCaseNext")}).getAttribute("href")).toContain("page=2");
  expect(screen.getByRole("status").textContent).toBe(i18n.t("complaintActivityOther"));
  expect(screen.getByText("Topic עברית").getAttribute("lang")).toBe("he");
  expect(screen.getByText("Topic עברית").getAttribute("dir")).toBe("rtl");
});
