import { useTranslation } from "react-i18next";

import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import { ForumMarkdown } from "./markdown";

function TranslationProvenance({
  presentation,
}: {
  presentation: ContentTranslationPresentation;
}) {
  const { t } = useTranslation("common");
  if (presentation.selected !== "translation" || !presentation.provenance) return null;

  return (
    <div className="translation-provenance">
      <span>
        {t(
          presentation.provenance.origin === "machine"
            ? "automaticTranslation"
            : "manualTranslation",
        )}
      </span>
      {presentation.provenance.attribution && (
        <span className="translation-attribution">
          {presentation.provenance.attribution}
        </span>
      )}
    </div>
  );
}

function OriginalDisclosure({
  presentation,
  markdown,
}: {
  presentation: ContentTranslationPresentation;
  markdown: boolean;
}) {
  const { t } = useTranslation("common");
  if (presentation.selected !== "translation") return null;

  return (
    <details className="translation-original">
      <summary>
        <span className="translation-show-original">{t("showOriginal")}</span>
        <span className="translation-show-translation">{t("showTranslation")}</span>
      </summary>
      <div
        lang={presentation.originalLocale}
        dir={presentation.originalDirection}
        className="translation-original-content"
      >
        {markdown
          ? <ForumMarkdown>{presentation.originalContent}</ForumMarkdown>
          : <p>{presentation.originalContent}</p>}
      </div>
    </details>
  );
}

export function TopicTitlePresentation({
  presentation,
}: {
  presentation: ContentTranslationPresentation;
}) {
  return (
    <>
      <h1
        lang={presentation.contentLocale}
        dir={presentation.contentDirection}
      >
        {presentation.content}
      </h1>
      <TranslationProvenance presentation={presentation} />
      <OriginalDisclosure presentation={presentation} markdown={false} />
    </>
  );
}

export function PostBodyPresentation({
  presentation,
}: {
  presentation: ContentTranslationPresentation;
}) {
  return (
    <div className="content-translation-presentation">
      <div
        lang={presentation.contentLocale}
        dir={presentation.contentDirection}
      >
        <ForumMarkdown>{presentation.content}</ForumMarkdown>
      </div>
      <TranslationProvenance presentation={presentation} />
      <OriginalDisclosure presentation={presentation} markdown />
    </div>
  );
}
