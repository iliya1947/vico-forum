/** Only original F2/F3 structural Admin History facts are projected here. */
export const STRUCTURE_ADMIN_ACTION_KINDS = ["category.created","category.renamed","category.reordered","section.created","section.renamed","section.moved","section.reordered","topic.moved"] as const;
export const STRUCTURE_ADMIN_ACTION_SQL = STRUCTURE_ADMIN_ACTION_KINDS.map(kind => "'"+kind+"'").join(",");

/** Closed, bounded original before/after projection for Owner primitive-value
 * renderer. Does not copy arbitrary context or hidden topic title/author. */
export const ADMIN_STRUCTURE_HISTORY_VALUES_SQL =
  "case when a.action in ("+STRUCTURE_ADMIN_ACTION_SQL+") then "+
  "jsonb_strip_nulls(jsonb_build_object("+
  "'beforeExists',a.action not in ('category.created','section.created'),"+
  "'beforeName',left(a.context#>>'{before,name}',200),\n    'afterName',left(a.context#>>'{after,name}',200),\n    'beforeSortPosition',left(a.context#>>'{before,sortPosition}',20),\n    'afterSortPosition',left(a.context#>>'{after,sortPosition}',20),\n    'beforeCategoryId',left(a.context#>>'{before,categoryId}',2048),\n    'afterCategoryId',left(a.context#>>'{after,categoryId}',2048),\n    'beforeCategoryName',left(a.context#>>'{before,categoryName}',200),\n    'afterCategoryName',left(a.context#>>'{after,categoryName}',200),\n    'beforeSectionId',left(a.context#>>'{before,sectionId}',2048),\n    'afterSectionId',left(a.context#>>'{after,sectionId}',2048),\n    'beforeSectionName',left(a.context#>>'{before,sectionName}',200),\n    'afterSectionName',left(a.context#>>'{after,sectionName}',200),\n    'neighborId',left(a.context#>>'{neighborId}',2048),\n    'neighborBeforePosition',left(a.context#>>'{neighborBeforePosition}',20),\n    'neighborAfterPosition',left(a.context#>>'{neighborAfterPosition}',20),\n    'beforeStructureVersion',left(a.context#>>'{previousVersion}',20),\n    'afterStructureVersion',left(a.context#>>'{version}',20)"+
  ")) else '{}'::jsonb end";
