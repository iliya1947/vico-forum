import "./attachment-presentation.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Attachment {
  id: string;
  fileName: string;
  byteSize: number;
  detectedType: string;
}

/** Only server-verified raster media can use the controlled inline route. */
export function ForumAttachmentDisplay({ attachment, url, deferImage = false, compact = false }: {
  attachment: Attachment;
  url: string;
  deferImage?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const raster = ["png", "jpeg", "gif", "webp"].includes(attachment.detectedType);
  const textPreview = attachment.detectedType === "text" && attachment.byteSize <= 1_000_000;
  return (
    <div className="forum-attachment-display">
      {raster && (!deferImage || expanded) ? (
        <a href={url + "&view=inline"} target="_blank" rel="noopener noreferrer" aria-label={`Open original ${attachment.fileName}`}>
          <img src={url + "&view=inline"} loading="lazy" decoding="async" alt={attachment.fileName} />
        </a>
      ) : null}
      <div className="forum-attachment-details">
        {compact ? (
          <a href={url} download={attachment.fileName} aria-label={`Download ${attachment.fileName}`}>↓</a>
        ) : <a href={url} download={attachment.fileName}>
          <bdi dir="auto">{attachment.fileName}</bdi>
        </a>}
        {!compact ? <span>{new Intl.NumberFormat().format(attachment.byteSize)} B</span> : null}
        {raster && deferImage && !expanded ? (
          <button type="button" onClick={() => setExpanded(true)}>{t("editorModePreview")}</button>
        ) : null}
        {textPreview ? (
          <a href={url + "&view=text"} target="_blank" rel="noopener noreferrer">{t("editorModePreview")}</a>
        ) : null}
      </div>
    </div>
  );
}
