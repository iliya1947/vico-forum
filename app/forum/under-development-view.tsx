import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { forumIndexPath } from "./paths";
import {
  UNDER_DEVELOPMENT_FEATURES,
  isUnderDevelopmentFeatureId,
} from "./under-development";
import { Breadcrumbs, ForumShell } from "./ui";

export function UnderDevelopmentView({
  locale,
  requestedFeature,
}: {
  locale: string;
  requestedFeature?: string | null;
}) {
  const { t } = useTranslation("common");
  const requested = isUnderDevelopmentFeatureId(requestedFeature)
    ? UNDER_DEVELOPMENT_FEATURES.find((feature) => feature.id === requestedFeature)
    : undefined;

  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[{ label: t("underDevelopmentHeading") }]} />
      <section className="under-development-page">
        <p className="eyebrow">{t("underDevelopmentEyebrow")}</p>
        <h1>{t("underDevelopmentHeading")}</h1>
        <p className="under-development-intro">{t("underDevelopmentIntro")}</p>

        {requested ? (
          <div className="under-development-requested" role="status">
            <strong>{t(requested.labelKey)}</strong>
            <p>{t("underDevelopmentRequested", { feature: t(requested.labelKey) })}</p>
          </div>
        ) : null}

        <div className="under-development-list-wrap">
          <h2>{t("underDevelopmentRemainingHeading")}</h2>
          <ul className="under-development-list">
            {UNDER_DEVELOPMENT_FEATURES.map((feature) => (
              <li key={feature.id}>
                <span className="under-development-marker" aria-hidden="true">○</span>
                <span>{t(feature.labelKey)}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link className="under-development-back" to={forumIndexPath(locale)}>
          {t("underDevelopmentBackToForum")}
        </Link>
      </section>
    </ForumShell>
  );
}
