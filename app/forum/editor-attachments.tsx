import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
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

type UploadStatus = "uploading" | "stored" | "error" | "removing";
type UploadEntry = {
  id: string;
  fileName: string;
  byteSize: number;
  status: UploadStatus;
  progress: number | null;
  file: File | null;
  attachment: DraftAttachment | null;
  error: string | null;
  removeError: boolean;
  uncertainCommit: boolean;
};

interface Props {
  contextKey?: string;
  draftId: string;
  draftReady: boolean;
  rebindFrom: string | null;
  disabled: boolean;
  reserveGeneration(): string | null;
  completeRebind(fromDraftId: string, toDraftId: string): boolean;
  retryDraftReconciliation(): void;
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

function restoredEntry(attachment: DraftAttachment): UploadEntry {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    byteSize: attachment.byteSize,
    status: "stored",
    progress: 100,
    file: null,
    attachment,
    error: null,
    removeError: false,
    uncertainCommit: false,
  };
}

function likelySecretFile(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return lower === ".env" || lower.startsWith(".env.");
}

export function useEditorAttachments({
  contextKey,
  draftId,
  draftReady,
  rebindFrom,
  disabled,
  reserveGeneration,
  completeRebind,
  retryDraftReconciliation,
}: Props) {
  const { t, i18n } = useTranslation("common");
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [restoredScope, setRestoredScope] = useState<string | null>(null);
  const [restoreState, setRestoreState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [rebindState, setRebindState] = useState<"idle" | "loading" | "error">("idle");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [rebindAttempt, setRebindAttempt] = useState(0);
  const [publicationWarning, setPublicationWarning] = useState(false);
  const requestsRef = useRef(new Map<string, XMLHttpRequest>());
  const callbacksRef = useRef({
    reserveGeneration,
    completeRebind,
    retryDraftReconciliation,
  });
  callbacksRef.current = {
    reserveGeneration,
    completeRebind,
    retryDraftReconciliation,
  };
  const scope = contextKey ? `${contextKey}\u0000${draftId}` : null;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => () => {
    scopeRef.current = null;
  }, []);

  useEffect(() => {
    setEntries([]);
    setRestoredScope(null);
    setRestoreState("idle");
    setRebindState("idle");
    setPublicationWarning(false);
  }, [scope]);

  useEffect(() => {
    if (!contextKey || !rebindFrom) {
      setRebindState("idle");
      return;
    }
    const scopeAtStart = scope;
    const fromDraftId = rebindFrom;
    const toDraftId = draftId;
    setRebindState("loading");
    void fetch("/api/attachments", {
      method: "PATCH",
      headers: {
        "X-Vico-Draft-Context": encoded(contextKey),
        "X-Vico-Draft-Id": toDraftId,
        "X-Vico-Attachment-From-Draft-Id": fromDraftId,
      },
      credentials: "same-origin",
    }).then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      if (scopeRef.current !== scopeAtStart) return;
      if (!callbacksRef.current.completeRebind(fromDraftId, toDraftId)) return;
      setRebindState("idle");
      setRestoredScope(null);
      setRestoreState("idle");
    }).catch(() => {
      if (scopeRef.current === scopeAtStart) setRebindState("error");
    });
  }, [contextKey, draftId, rebindFrom, rebindAttempt, scope]);

  useEffect(() => {
    if (!contextKey || !draftReady || rebindFrom || restoredScope === scope) return;
    const scopeAtStart = scope;
    setRestoreState("loading");
    void fetch("/api/attachments", {
      method: "GET",
      headers: {
        "X-Vico-Draft-Context": encoded(contextKey),
        "X-Vico-Draft-Id": draftId,
      },
      credentials: "same-origin",
    }).then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      const payload = await response.json() as { attachments?: unknown[] };
      const restored = (payload.attachments ?? [])
        .map(storedAttachment)
        .filter((item): item is DraftAttachment => item !== null)
        .map(restoredEntry);
      if (scopeRef.current !== scopeAtStart) return;
      setEntries(restored);
      setRestoredScope(scopeAtStart);
      setRestoreState("ready");
    }).catch(() => {
      if (scopeRef.current === scopeAtStart) setRestoreState("error");
    });
  }, [contextKey, draftId, draftReady, rebindFrom, restoreAttempt, restoredScope, scope]);

  const restoreReady = !!scope && restoredScope === scope && restoreState === "ready";
  const canAdd = !!contextKey && draftReady && !rebindFrom && rebindState !== "loading"
    && restoreReady && !disabled;
  const hasUnsettled = entries.some((entry) => entry.status !== "stored");
  // Publication promotion/download is the next bounded Stage 5 unit. Until then a stored
  // attachment must never be silently discarded by a text-only publication.
  const blocking = !!contextKey && (
    !draftReady
    || !!rebindFrom
    || !restoreReady
    || entries.length > 0
  );

  useEffect(() => {
    if (!blocking) setPublicationWarning(false);
  }, [blocking]);

  function setEntry(id: string, update: (entry: UploadEntry) => UploadEntry) {
    setEntries((current) => current.map((entry) => entry.id === id ? update(entry) : entry));
  }

  function startUpload(
    file: File,
    stableId = crypto.randomUUID(),
    replacing = false,
    uncertainCommit = false,
  ) {
    if (!contextKey || !canAdd) return;
    const generation = callbacksRef.current.reserveGeneration();
    if (!generation || generation !== draftId) return;

    const namedFile = file.name.trim()
      ? file
      : new File([file], fallbackClipboardName(file), {
          type: file.type,
          lastModified: file.lastModified,
        });
    if (likelySecretFile(namedFile.name) && !window.confirm(t("editorAttachmentSecretWarning"))) return;

    const scopeAtStart = `${contextKey}\u0000${generation}`;
    const next: UploadEntry = {
      id: stableId,
      fileName: namedFile.name,
      byteSize: namedFile.size,
      status: "uploading",
      progress: 0,
      file: namedFile,
      attachment: null,
      error: null,
      removeError: false,
      uncertainCommit,
    };
    if (replacing) setEntry(stableId, () => next);
    else setEntries((current) => [...current, next]);
    setPublicationWarning(false);

    const request = new XMLHttpRequest();
    requestsRef.current.set(stableId, request);
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || scopeRef.current !== scopeAtStart) return;
      const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      setEntry(stableId, (current) => ({ ...current, progress }));
    };
    request.onload = () => {
      requestsRef.current.delete(stableId);
      if (scopeRef.current !== scopeAtStart) return;
      const payload = parseJson(request.responseText);
      const attachment = storedAttachment(payload?.attachment);
      if (request.status === 201 && payload?.outcome === "stored" && attachment) {
        setEntry(stableId, () => restoredEntry(attachment));
        return;
      }
      const reason = typeof payload?.reason === "string"
        ? payload.reason
        : typeof payload?.error === "string" ? payload.error : null;
      setEntry(stableId, (current) => ({
        ...current,
        status: "error",
        progress: null,
        error: reason,
      }));
    };
    const transportFailure = () => {
      requestsRef.current.delete(stableId);
      if (scopeRef.current !== scopeAtStart) return;
      setEntry(stableId, (current) => ({
        ...current,
        status: "error",
        progress: null,
        error: "unavailable",
        uncertainCommit: true,
      }));
    };
    request.onerror = transportFailure;
    request.onabort = transportFailure;
    request.open("POST", "/api/attachments");
    request.responseType = "text";
    request.setRequestHeader("Content-Type", namedFile.type || "application/octet-stream");
    request.setRequestHeader("X-Vico-Attachment-Id", stableId);
    request.setRequestHeader("X-Vico-Attachment-Name", encoded(namedFile.name));
    request.setRequestHeader("X-Vico-Attachment-Size", String(namedFile.size));
    request.setRequestHeader("X-Vico-Draft-Context", encoded(contextKey));
    request.setRequestHeader("X-Vico-Draft-Id", generation);
    request.send(namedFile);
  }

  function addFiles(files: FileList | readonly File[]) {
    if (!canAdd) return;
    for (const file of Array.from(files)) startUpload(file);
  }

  function retry(entry: UploadEntry) {
    if (!entry.file || entry.status !== "error") return;
    startUpload(entry.file, entry.id, true, entry.uncertainCommit);
  }

  async function remove(entry: UploadEntry) {
    if (
      !contextKey
      || entry.status === "uploading"
      || entry.status === "removing"
      || entry.uncertainCommit
    ) return;
    const scopeAtStart = scope;
    const previousStatus = entry.attachment ? "stored" as const : "error" as const;
    setEntry(entry.id, (current) => ({ ...current, status: "removing", removeError: false }));
    try {
      const response = await fetch("/api/attachments", {
        method: "DELETE",
        headers: {
          "X-Vico-Draft-Context": encoded(contextKey),
          "X-Vico-Draft-Id": draftId,
          "X-Vico-Attachment-Id": entry.id,
        },
        credentials: "same-origin",
      });
      if (!response.ok && response.status !== 404) throw new Error(String(response.status));
      if (scopeRef.current === scopeAtStart) {
        setEntries((current) => current.filter((item) => item.id !== entry.id));
      }
    } catch {
      if (scopeRef.current === scopeAtStart) {
        setEntry(entry.id, (current) => ({
          ...current,
          status: previousStatus,
          removeError: true,
        }));
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    event.stopPropagation();
    if (canAdd) addFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (event.dataTransfer.types.includes("Files")) event.preventDefault();
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const files = Array.from(event.clipboardData?.files ?? [])
      .filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (canAdd) addFiles(files);
  }

  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  function formattedBytes(bytes: number): string {
    if (bytes < 1024) return t("editorAttachmentBytes", { count: bytes });
    if (bytes < 1024 * 1024) {
      return t("editorAttachmentKilobytes", { size: number.format(bytes / 1024) });
    }
    return t("editorAttachmentMegabytes", { size: number.format(bytes / (1024 * 1024)) });
  }

  const lifecycleMessage = rebindFrom
    ? rebindState === "error" ? "editorAttachmentRebindUnavailable" : "editorAttachmentRebinding"
    : !draftReady
      ? "editorAttachmentDraftWaiting"
      : restoreState === "loading"
        ? "editorAttachmentRestoring"
        : restoreState === "error"
          ? "editorAttachmentListUnavailable"
          : null;

  const element = contextKey ? (
    <section className="markdown-editor-attachments" aria-label={t("editorAttachments")}>
      <div className="markdown-editor-attachment-controls">
        <label className={"markdown-editor-attach-button" + (!canAdd ? " is-disabled" : "")}>
          <input
            type="file"
            multiple
            aria-label={t("editorAttach")}
            disabled={!canAdd}
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

      {lifecycleMessage ? (
        <div className="markdown-editor-attachment-status" role="status">
          <span>{t(lifecycleMessage)}</span>
          {rebindFrom && rebindState === "error" ? (
            <button type="button" disabled={disabled} onClick={() => setRebindAttempt((value) => value + 1)}>
              {t("editorAttachmentRetry")}
            </button>
          ) : !rebindFrom && !draftReady ? (
            <button type="button" disabled={disabled} onClick={() => callbacksRef.current.retryDraftReconciliation()}>
              {t("editorAttachmentRetry")}
            </button>
          ) : restoreState === "error" ? (
            <button type="button" disabled={disabled} onClick={() => setRestoreAttempt((value) => value + 1)}>
              {t("editorAttachmentRetry")}
            </button>
          ) : null}
        </div>
      ) : null}

      {entries.length > 0 ? (
        <ul className="markdown-editor-attachment-list">
          {entries.map((entry) => (
            <li key={entry.id} className={"markdown-editor-attachment is-" + entry.status}>
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
                ) : entry.status === "removing" ? (
                  <span>{t("editorAttachmentRemoving")}</span>
                ) : (
                  <span className="is-error">{t(uploadErrorKey(entry.error))}</span>
                )}
                {entry.removeError ? (
                  <span className="is-error">{t("editorAttachmentRemoveError")}</span>
                ) : null}
              </div>
              <div className="markdown-editor-attachment-actions">
                {entry.status === "error" && entry.file ? (
                  <button type="button" disabled={disabled} onClick={() => retry(entry)}>
                    {t("editorAttachmentRetry")}
                  </button>
                ) : null}
                {entry.status !== "uploading"
                  && entry.status !== "removing"
                  && !entry.uncertainCommit ? (
                    <button type="button" disabled={disabled} onClick={() => void remove(entry)}>
                      {t("editorAttachmentRemove")}
                    </button>
                  ) : null}
              </div>
              {entry.status === "uploading" && entry.progress !== null ? (
                <progress
                  value={entry.progress}
                  max={100}
                  aria-label={t("editorAttachmentProgress", { file: entry.fileName })}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {publicationWarning && blocking ? (
        <p className="markdown-editor-attachment-error" role="alert">
          {t(hasUnsettled || !restoreReady || !draftReady || !!rebindFrom
            ? "editorAttachmentPublicationBlocked"
            : "editorAttachmentPublicationUnavailable")}
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
