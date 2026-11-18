import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {renderToStaticMarkup} from "react-dom/server";
import {createMemoryRouter,RouterProvider} from "react-router";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {hebrewCommonValues,russianCommonValues} from "../localization/manual-values";
import {NotificationsView} from "./views";

describe("shared notification card grid contract",()=>{
 it("renders distinct system and legacy layouts with the visible Decision label",async()=>{
  const i18n=createInstance();
  const en=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key,descriptor])=>[key,descriptor.source]));
  await i18n.init({lng:"en",defaultNS:"common",fallbackLng:"en",initAsync:false,
    resources:{en:{common:en}}});
  const router=createMemoryRouter([{path:"/en/notifications",
    element:<NotificationsView locale="en" notifications={[
      {id:"system",kind:"complaint-decision",actorName:null,topicId:null,topicTitle:null,
        postId:null,caseId:"case-1",createdAt:"2026-11-02T10:00:00.000Z",readAt:null},
      {id:"legacy",kind:"reply",actorName:"Ada",topicId:"topic-1",topicTitle:"Topic title",
        postId:"post-1",caseId:null,createdAt:"2026-11-02T10:00:00.000Z",readAt:null},
    ]}/>}],{initialEntries:["/en/notifications"]});
  const html=renderToStaticMarkup(<I18nextProvider i18n={i18n}>
    <RouterProvider router={router}/>
  </I18nextProvider>);
  expect(html).toContain('class="notification-card is-unread is-system"');
  expect(html).toContain('class="notification-card is-unread"');
  expect(html).toContain("Complaint decision");
  expect(html).toContain("Topic title");
  expect((html.match(/class="notification-avatar"/g)||[])).toHaveLength(1);
  const css=readFileSync("app/styles.css","utf8");
  expect(css).toMatch(/\.notification-card\s*\{[^}]*grid-template-columns:\s*3\.25rem minmax\(0, 1fr\) auto 2\.9rem/s);
  expect(css).toMatch(/\.notification-card\.is-system\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto 2\.9rem/s);
  expect(css).toMatch(/\.notification-card\.is-system \.notification-copy,[^}]*grid-column:\s*1/s);
  expect(css).toMatch(/\.notification-card\.is-system\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 2\.65rem/s);
 });

 it("renders localized neutral reply/mention actors without retained initials in EN/RU/HE",async()=>{
  const secret="SECRET_RETAINED_CARD_ACTOR";
  const english=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key,descriptor])=>[key,descriptor.source]));
  for(const [locale,localized] of [
    ["en",{}],["ru",russianCommonValues],["he",hebrewCommonValues],
  ] as const){
    const messages={...english,...localized};
    const i18n=createInstance();
    await i18n.init({lng:locale,defaultNS:"common",fallbackLng:"en",initAsync:false,
      resources:{[locale]:{common:messages}}});
    const router=createMemoryRouter([{path:`/${locale}/notifications`,
      element:<NotificationsView locale={locale} notifications={[
        {id:"deleted-reply",kind:"reply",actorName:secret,actorIdentityKind:"deleted",
          topicId:"topic-1",topicTitle:"Safe topic",postId:"post-1",
          createdAt:"2026-11-02T10:00:00.000Z",readAt:null},
        {id:"deleted-mention",kind:"mention",actorName:secret,actorIdentityKind:"deleted",
          topicId:"topic-1",topicTitle:"Second topic",postId:"post-2",
          createdAt:"2026-11-02T11:00:00.000Z",readAt:null},
        {id:"active-mention",kind:"mention",actorName:"Visible author",
          topicId:"topic-1",topicTitle:"Active topic",postId:"post-3",
          createdAt:"2026-11-02T12:00:00.000Z",readAt:null},
        {id:"decision",kind:"complaint-decision",actorName:null,
          topicId:null,topicTitle:null,postId:null,caseId:"case-1",
          createdAt:"2026-11-02T13:00:00.000Z",readAt:null},
      ]}/>}],{initialEntries:[`/${locale}/notifications`]});
    const html=renderToStaticMarkup(<I18nextProvider i18n={i18n}>
      <RouterProvider router={router}/>
    </I18nextProvider>);
    expect(html).toContain(localized && "deletedUser" in localized
      ? localized.deletedUser : "Deleted user");
    expect(html).toContain("Safe topic");
    expect(html).toContain("Second topic");
    expect(html).toContain("Visible author");
    expect(html).toContain("Active topic");
    expect(html).not.toContain(secret);
    expect(html).toContain('class="notification-avatar" aria-hidden="true"></span>');
    expect(html).toContain('class="notification-avatar" aria-hidden="true">V</span>');
    expect((html.match(/class="notification-card is-unread is-system"/g)||[])).toHaveLength(1);
  }
 });

});
