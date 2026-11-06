import { describe, expect, it } from "vitest";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { meta as listMeta } from "./account-measures";
import { meta as detailMeta } from "./account-measure";

describe("AP10-MIRA-07 localized browser titles from the parent locale snapshot",()=>{
  it.each([
    ["en","My measures","Measure details"],
    ["ru","Мои ограничения","Сведения о мере"],
    ["he","ההגבלות שלי","פרטי ההגבלה"],
  ])("renders localized list/detail title for %s",(locale,listTitle,detailTitle)=>{
    const translation=locale==="ru"?russianCommonValues:hebrewCommonValues;
    const snapshot={
      locale:{translationLocale:locale,direction:locale==="he"?"rtl":"ltr",
        formatting:{locale,timeZone:"UTC"},nativeName:locale,presentationMetadata:{}},
      fallbackLocales:locale==="en"?[]:["en"],
      resourcesByLocale:{
        en:{common:{productName:"Vico Forum",measuresOwn:"My measures",measuresDetail:"Measure details"}},
        ...(locale==="en"?{}:{[locale]:{common:{
          productName:"Vico Forum",measuresOwn:translation.measuresOwn,measuresDetail:translation.measuresDetail,
        }}}),
      },
    };
    const matches=[{id:"root"},{id:"routes/locale-boundary",loaderData:snapshot}] as never;
    expect(listMeta({matches})).toEqual([{title:`${listTitle} · Vico Forum`}]);
    expect(detailMeta({matches})).toEqual([{title:`${detailTitle} · Vico Forum`}]);
  });

  it("keeps canonical English fallback when no locale snapshot exists",()=>{
    const matches=[{id:"root"}] as never;
    expect(listMeta({matches})).toEqual([{title:"My measures · Vico Forum"}]);
    expect(detailMeta({matches})).toEqual([{title:"Measure details · Vico Forum"}]);
  });
});
