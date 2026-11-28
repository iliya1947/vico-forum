import {useTranslation} from "react-i18next";
import type {StructureHistoryChange} from "../../db/admin-history";

/** Closed projection of stored structural facts. Never renders arbitrary context
 * or reads the topic source/current names to reconstruct an old event. */
export function StructureHistoryDetails({change}:{change:StructureHistoryChange}){
  const {t}=useTranslation("common");
  const {before,after}=change.context;
  const value=(text:string|null|undefined)=>text===null||text===undefined?t("historyNoValue"):<bdi dir="auto">{text}</bdi>;
  return <dl className="admin-structure-history-change">
    <dt>{t("historyStructureBeforeVersion")}</dt><dd>{value(change.context.previousVersion)}</dd>
    <dt>{t("historyStructureAfterVersion")}</dt><dd>{value(change.context.version)}</dd>
    {"name" in after?<>
      <dt>{t("historyStructureBeforeName")}</dt><dd>{value(before&&"name" in before?before.name:null)}</dd>
      <dt>{t("historyStructureAfterName")}</dt><dd>{value(after.name)}</dd>
      <dt>{t("historyStructureBeforeSortPosition")}</dt><dd>{value(before&&"sortPosition" in before?before.sortPosition:null)}</dd>
      <dt>{t("historyStructureAfterSortPosition")}</dt><dd>{value(after.sortPosition)}</dd>
    </>:null}
    {"categoryId" in after?<>
      <dt>{t("historyStructureBeforeCategoryId")}</dt><dd>{value(before&&"categoryId" in before?before.categoryId:null)}</dd>
      <dt>{t("historyStructureAfterCategoryId")}</dt><dd>{value(after.categoryId)}</dd>
    </>:null}
    {change.action==="topic.moved"?<>
      <dt>{t("historyStructureBeforeCategoryName")}</dt><dd>{value(change.context.before.categoryName)}</dd>
      <dt>{t("historyStructureAfterCategoryName")}</dt><dd>{value(change.context.after.categoryName)}</dd>
      <dt>{t("historyStructureBeforeSectionId")}</dt><dd>{value(change.context.before.sectionId)}</dd>
      <dt>{t("historyStructureAfterSectionId")}</dt><dd>{value(change.context.after.sectionId)}</dd>
      <dt>{t("historyStructureBeforeSectionName")}</dt><dd>{value(change.context.before.sectionName)}</dd>
      <dt>{t("historyStructureAfterSectionName")}</dt><dd>{value(change.context.after.sectionName)}</dd>
    </>:null}
    {"neighborId" in change.context?<>
      <dt>{t("historyStructureNeighborId")}</dt><dd>{value(change.context.neighborId)}</dd>
      <dt>{t("historyStructureNeighborBeforePosition")}</dt><dd>{value(change.context.neighborBeforePosition)}</dd>
      <dt>{t("historyStructureNeighborAfterPosition")}</dt><dd>{value(change.context.neighborAfterPosition)}</dd>
    </>:null}
  </dl>;
}
