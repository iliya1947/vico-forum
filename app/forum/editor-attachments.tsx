import { useEffect, useRef, useState, type DragEvent, type ClipboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { UiKey } from "../localization/catalog";

export interface DraftAttachment {
  id: string;
  fileName: string;
  detectedType: string;
  responseMime: string;
  byteSize: number;
  verificationStatus: "type-checked";
}

type UploadStatus = "uploading" | "stored" | "error";
type UploadEntry = {
  key: string;
  fileName: string;
  byteSize: number;
  status: UploadStatus;
  progress: number | null;
  file: File | null;
  attachment: DraftAttachment | null;
  error: string | null;
};

interface Props {
  contextKey?: string;
  draftId: string;
  disabled: boolean;
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function fallbackClipboardName(file: File): string {
  if (file.name.trim()) return file.name;
  const extension = file.type === "image/jpeg" ? "jpg"
    : file.type === "image/gif" ? "gif"
      : file.type === "image/webp" ? "webp"
        : "png";
  return `pasted-image-${Date.now()}.${extension}`;
}

function uploadErrorKey(reason: string | null): UiKey<"common"> {
  if (reason === "too-large") return "editorAttachmentErrorTooLarge";
  if (reason === "empty") return "editorAttachmentErrorEmpty";
  if (reason === "invalid-name") return "editorAttachmentErrorName";
  if (
    reason === "forbidden-extension"
    || reason === "forbidden-mime"
    || reason === "executable-signature"
  ) return "editorAttachmentErrorUnsafe";
  if (
    reason === "signature-mismatch"
    || reason === "mime-mismatch"
    || reason === "binary-content"
    || reason === "insufficient-evidence"
    || reason === "invalid-structure"
  ) return "editorAttachmentErrorType";
  if (reason === "unsupported-extension") return "editorAttachmentErrorUnsupported";
  if (reason === "unauthenticated") return "editorAttachmentErrorUnauthenticated";
  if (reason === "forbidden") return "editorAttachmentErrorForbidden";
  if (reason === "notFound") return "editorAttachmentErrorContext";
  if (reason === "unavailable") return "editorAttachmentErrorUnavailable";
  return "editorAttachmentErrorGeneric";
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function storedAttachment(value: unknown): DraftAttachment | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string"
    || typeof item.fileName !== "string"
    || typeof item.detectedType !== "string"
    || typeof item.responseMime !== "string"
    || typeof item.byteSize !== "number"
    || item.verificationStatus !== "type-checked"
  ) return null;
  return {
    id: item.id,
    fileName: item.fileName,
    detectedType: item.detectedType,
    responseMime: item.responseMime,
    byteSize: item.byteSize,
    verificationStatus: "type-checked",
  };
}

function likelySecretFile(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return lower === ".env" || lower.startsWith(".env.");
}

export function useEditorAttachments({ contextKey, draftId, disabled }: Props) {
  const { t, i18n } = useTranslation("common");
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [loadError, setLoadError] = useState<UiKey<"common"> | null>(null);
  const [publicationWarning, setPublicationWarning] = useState(false);
  const requestsRef = useRef(new Map<string, XMLHttpRequest>());
  const scope = contextKey ? `${contextKey}\u0000${draftId}` : null;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const blocking = entries.some((entry) => entry.status !== "stored");

  useEffect(() => {
    setPublicationWarning(false);
  }, [blocking]);

  useEffect(() => {
    for (const request of requestsRef.current.values()) request.abort();
    requestsRef.current.clear();
    setEntries([]);
    setLoadError(null);
    setPublicationWarning(false);
    if (!contextKey || !draftId) return;

    const controller = new AbortController();
    void fetch("/api/attachments", {
      method: "GET",
      headers: {
        "X-Vico-Draft-Context": encoded(contextKey),
        "X-Vico-Draft-Id": draftId,
      },
      credentials: "same-origin",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      const payload = await response.json() as { attachments?: unknown[] };
      const restored = (payload.attachments ?? [])
        .map(storedAttachment)
        .filter((item): item is DraftAttachment => item !== null)
        .map<UploadEntry>((attachment) => ({
          key: attachment.id,
          fileName: attachment.fileName,
          byteSize: attachment.byteSize,
          status: "stored",
          progress: 100,
          file: null,
          attachment,
          error: null,
        }));
      if (scopeRef.current === `${contextKey}\u0000${draftId}`) setEntries(restored);
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (scopeRef.current === `${contextKey}\u0000${draftId}`) {
        setLoadError("editorAttachmentListUnavailable");
      }
    });

    return () => controller.abort();
  }, [contextKey, draftId]);

  function setEntry(key: string, update: (entry: UploadEntry) => UploadEntry) {
    setEntries((current) => current.map((entry) => entry.key === key ? update(entry) : entry));
  }

  function startUpload(file: File) {
    if (!contextKey || !draftId || disabled) return;
    const namedFile = file.name.trim()
      ? file
      : new File([file], fallbackClipboardName(file), { type: file.type, lastModified: file.lastModified });
    if (likelySecretFile(namedFile.name) && !window.confirm(t("editorAttachmentSecretWarning"))) return;

    const key = crypto.randomUUID();
    const scopeAtStart = `${contextKey}\u0000${draftId}`;
    const entry: UploadEntry = {
      key,
      fileName: namedFile.name,
      byteSize: namedFile.size,
      status: "uploading",
      progress: 0,
      file: namedFile,
      attachment: null,
      error: null,
    };
    setEntries((current) => [...current, entry]);
    setPublicationWarning(false);

    const request = new XMLHttpRequest();
    requestsRef.current.set(key, request);
    request.open("POST", "/api/attachments");
    request.responseType = "text";
    request.setRequestHeader("Content-Type", namedFile.type || "application/octet-stream");
    request.setRequestHeader("X-Vico-Attachment-Name", encoded(namedFile.name));
    request.setRequestHeader("X-Vico-Attachment-Size", String(namedFile.size));
    request.setRequestHeader("X-Vico-Draft-Context", encoded(contextKey));
    request.setRequestHeader("X-Vico-Draft-Id", draftId);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || scopeRef.current !== scopeAtStart) return;
      const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      setEntry(key, (current) => ({ ...current, progress }));
    };
    request.onload = () => {
      requestsRef.current.delete(key);
      if (scopeRef.current !== scopeAtStart) return;
      const payload = parseJson(request.responseText);
      const attachment = storedAttachment(payload?.attachment);
      if (request.status === 201 && payload?.outcome === "stored" && attachment) {
        setEntry(key, (current) => ({
          ...current,
          key: attachment.id,
          fileName: attachment.fileName,
          byteSize: attachment.byteSize,
          status: "stored",
          progress: 100,
          file: null,
          attachment,
          error: null,
        }));
        return;
      }
      const reason = typeof payload?.reason === "string"
        ? payload.reason
        : typeof payload?.error === "string" ? payload.error : null;
      setEntry(key, (current) => ({ ...current, status: "error", progress: null, error: reason }));
    };
    request.onerror = () => {
      requestsRef.current.delete(key);
      if (scopeRef.current !== scopeAtStart) return;
      setEntry(key, (current) => ({
        ...current,
        status: "error",
        progress: null,
        error: "unavailable",
      }));
    };
    request.onabort = () => requestsRef.current.delete(key);
    request.send(namedFile);
  }

  function addFiles(files: FileList | readonly File[]) {
    for (const file of Array.from(files)) startUpload(file);
  }

  function retry(entry: UploadEntry) {
    if (!entry.file) return;
    setEntries((current) => current.filter((item) => item.key !== entry.key));
    startUpload(entry.file);
  }

  async function remove(entry: UploadEntry) {
    const active = requestsRef.current.get(entry.key);
    if (active) {
      active.abort();
      setEntries((current) => current.filter((item) => item.key !== entry.key));
      return;
    }
    if (!contextKey || !entry.attachment) {
      setEntries((current) => current.filter((item) => item.key !== entry.key));
      return;
    }
    setEntry(entry.key, (current) => ({ ...current, error: null }));
    try {
      const response = await fetch("/api/attachments", {
        method: "DELETE",
        headers: {
          "X-Vico-Draft-Context": encoded(contextKey),
          "X-Vico-Draft-Id": draftId,
          "X-Vico-Attachment-Id": entry.attachment.id,
        },
        credentials: "same-origin",
      });
      if (!response.ok && response.status !== 404) throw new Error(String(response.status));
      if (scopeRef.current === `${contextKey}\u0000${draftId}`) {
        setEntries((current) => current.filter((item) => item.key !== entry.key));
      }
    } catch {
      if (scopeRef.current === `${contextKey}\u0000${draftId}`) {
        setEntry(entry.key, (current) => ({ ...current, error: "unavailable" }));
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    if (!disabled) addFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (event.dataTransfer.types.includes("Files")) event.preventDefault();
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const clipboardFiles = event.clipboardData?.files;
    if (!clipboardFiles) return;
    const files = Array.from(clipboardFiles).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    event.preventDefault();
    if (!disabled) addFiles(files);
  }

  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  function formattedBytes(bytes: number): string {
    if (bytes < 1024) return t("editorAttachmentBytes", { count: bytes });
    if (bytes < 1024 * 1024) return t("editorAttachmentKilobytes", { size: number.format(bytes / 1024) });
    return t("editorAttachmentMegabytes", { size: number.format(bytes / (1024 * 1024)) });
  }

  const element = contextKey ? (
    <section className="markdown-editor-attachments" aria-label={t("editorAttachments")}>
      <div className="markdown-editor-attachment-controls">
        <label className={"markdown-editor-attach-button" + (disabled ? " is-disabled" : "")}>
          <input
            type="file"
            multiple
            disabled={disabled}
            onChange={(event) => {
              if (event.currentTarget.files) addFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <span aria-hidden="true">📎</span>
          <span>{t("editorAttach")}</span>
        </label>
        <span className="markdown-editor-attachment-hint">{t("editorAttachmentDropHint")}</span>
      </div>

      {entries.length > 0 ? (
        <ul className="markdown-editor-attachment-list">
          {entries.map((entry) => (
            <li key={entry.key} className={"markdown-editor-attachment is-" + entry.status}>
              <div className="markdown-editor-attachment-copy">
                <strong dir="auto">{entry.fileName}</strong>
                <span>{formattedBytes(entry.byteSize)}</span>
                {entry.status === "uploading" ? (
                  <span>
                    {entry.progress === null
                      ? t("editorAttachmentUploading")
                      : t("editorAttachmentUploadingProgress", { progress: entry.progress })}
                  </span>
                ) : entry.status === "stored" ? (
                  <span>{t("editorAttachmentUploaded")}</span>
                ) : (
                  <span className="is-error">{t(uploadErrorKey(entry.error))}</span>
                )}
                {entry.status === "stored" && entry.error ? (
                  <span className="is-error">{t("editorAttachmentRemoveError")}</span>
                ) : null}
              </div>
              <div className="markdown-editor-attachment-actions">
                {entry.status === "error" && entry.file ? (
                  <button type="button" disabled={disabled} onClick={() => retry(entry)}>
                    {t("editorAttachmentRetry")}
                  </button>
                ) : null}
                <button type="button" disabled={disabled} onClick={() => void remove(entry)}>
                  {t("editorAttachmentRemove")}
                </button>
              </div>
              {entry.status === "uploading" && entry.progress !== null ? (
                <progress value={entry.progress} max={100} aria-label={t("editorAttachmentProgress", { file: entry.fileName })} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {loadError ? <p className="markdown-editor-attachment-error" role="status">{t(loadError)}</p> : null}
      {publicationWarning && blocking ? (
        <p className="markdown-editor-attachment-error" role="alert">
          {t("editorAttachmentPublicationBlocked")}
        </p>
      ) : null}
    </section>
  ) : null;

  return {
    blocking,
    element,
    handleDrop,
    handleDragOver,
    handlePaste,
    markPublicationAttempt() {
      if (blocking) setPublicationWarning(true);
    },
  };
}
