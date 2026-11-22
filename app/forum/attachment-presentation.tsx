import "./attachment-presentation.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAttachmentUrlResolver, type AttachmentReference } from "./attachment-url";

interface Attachment {
  id: string;
  fileName: string;
  byteSize: number;
  detectedType: string;
}

/** Only server-verified raster media can use the controlled inline route. */
export function ForumAttachmentDisplay({ attachment, reference, deferImage = false, compact = false }: {
  attachment: Attachment;
  reference: AttachmentReference;
  deferImage?: boolean;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const resolve = useAttachmentUrlResolver();
  const raster = ["png", "jpeg", "gif", "webp"].includes(attachment.detectedType);
  const textPreview = attachment.detectedType === "text" && attachment.byteSize <= 1_000_000;
  const downloadUrl = resolve(reference, "download");
  const inlineUrl = raster && (!deferImage || expanded) ? resolve(reference, "inline") : null;
  const textUrl = textPreview ? resolve(reference, "text") : null;
  return (
    <div className="forum-attachment-display">
      {inlineUrl ? (
        <a href={inlineUrl} target="_blank" rel="noopener noreferrer" aria-label={t("editorAttachmentOpenOriginal", { file: attachment.fileName })}>
          <img src={inlineUrl} loading="lazy" decoding="async" alt={attachment.fileName} />
        </a>
      ) : null}
      <div className="forum-attachment-details">
        {compact ? (
          <a href={downloadUrl} download={attachment.fileName} aria-label={t("editorAttachmentDownload", { file: attachment.fileName })}>↓</a>
        ) : <a href={downloadUrl} download={attachment.fileName}>
          <bdi dir="auto">{attachment.fileName}</bdi>
        </a>}
        {!compact ? <span>{new Intl.NumberFormat(i18n.language).format(attachment.byteSize)} B</span> : null}
        {raster && deferImage && !expanded ? (
          <button type="button" onClick={() => setExpanded(true)}>{t("editorModePreview")}</button>
        ) : null}
        {textPreview ? (
          <a href={textUrl!} target="_blank" rel="noopener noreferrer">{t("editorModePreview")}</a>
        ) : null}
      </div>
    </div>
  );
}
