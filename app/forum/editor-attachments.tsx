import { ForumAttachmentDisplay } from "./attachment-presentation";
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
  draftId: string;
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
  ownerId: string | null;
  contextKey?: string;
  draftId: string;
  draftReady: boolean;
  draftRevision: number;
  selectionEpoch: number;
  rebindFrom: string | null;
  rebindVersion: number | null;
  disabled: boolean;
  reserveGeneration(): string | null;
  completeRebind(fromDraftId: string, toDraftId: string, retired?: boolean): boolean;
  retryDraftReconciliation(): void;
  noteAttachmentChange(draftId: string): void;
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function notifyAttachmentChange(identity: string): void {
  window.dispatchEvent(new CustomEvent("vico:attachment-change", { detail: identity }));
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
  if (reason === "gone") return "editorDraftNoRemoteVersion";
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

function restoredEntry(attachment: DraftAttachment, draftId: string): UploadEntry {
  return {
    id: attachment.id,
    draftId,
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
  ownerId,
  contextKey,
  draftId,
  draftReady,
  draftRevision,
  selectionEpoch,
  rebindFrom,
  rebindVersion,
  disabled,
  reserveGeneration,
  completeRebind,
  retryDraftReconciliation,
  noteAttachmentChange,
}: Props) {
  const { t, i18n } = useTranslation("common");
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
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
    noteAttachmentChange,
  });
  callbacksRef.current = {
    reserveGeneration,
    completeRebind,
    retryDraftReconciliation,
    noteAttachmentChange,
  };
  const identity = ownerId && contextKey ? JSON.stringify([ownerId, contextKey]) : null;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const draftIdRef = useRef(draftId);
  draftIdRef.current = draftId;
  const previousIdentityRef = useRef(identity);
  const previousSelectionEpochRef = useRef(selectionEpoch);
  const removedIdsRef = useRef(new Set<string>());
  // A confirmed explicit server selection invalidates losing local attachment state,
  // even when the text draft ID is unchanged. Routine refresh does not change it.
  const scope = identity ? `${identity}\u0000${draftId}\u0000${selectionEpoch}` : null;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const selectionEpochRef = useRef(selectionEpoch);
  selectionEpochRef.current = selectionEpoch;

  useEffect(() => () => {
    scopeRef.current = null;
    identityRef.current = null;
  }, []);

  useEffect(() => {
    const changed = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== identity) return;
      setRestoredScope(null);
      setRestoreAttempt((value) => value + 1);
    };
    window.addEventListener("vico:attachment-change", changed);
    return () => window.removeEventListener("vico:attachment-change", changed);
  }, [identity]);

  // Successful metadata checks must refresh refs even if React batches ready=false→true.
  useEffect(() => { setRestoredScope(null); }, [draftRevision]);

  useEffect(() => {
    const retaining = identity === previousIdentityRef.current
      && selectionEpoch === previousSelectionEpochRef.current && !!rebindFrom;
    if (!retaining) {
      setEntries([]);
      removedIdsRef.current.clear();
    }
    previousIdentityRef.current = identity;
    previousSelectionEpochRef.current = selectionEpoch;
    setRestoredScope(null);
    setRestoreState("idle");
    setRebindState("idle");
    setPublicationWarning(false);
  }, [scope]);

  useEffect(() => {
    if (!contextKey || !rebindFrom || rebindVersion === null) {
      setRebindState("idle");
      return;
    }
    const scopeAtStart = scope;
    const fromDraftId = rebindFrom;
    const toDraftId = draftId;
    let ignore = false;
    setRebindState("loading");
    void fetch("/api/attachments", {
      method: "PATCH",
      headers: {
        "X-Vico-Draft-Context": encoded(contextKey),
        "X-Vico-Draft-Id": toDraftId,
        "X-Vico-Attachment-From-Draft-Id": fromDraftId,
        "X-Vico-Draft-Version": String(rebindVersion),
      },
      credentials: "same-origin",
    }).then(async (response) => {
      if (ignore || scopeRef.current !== scopeAtStart) return;
      if (response.status === 410) {
        if (!callbacksRef.current.completeRebind(fromDraftId, toDraftId, true)) {
          throw new Error("retired generation not reconciled");
        }
        setEntries([]);
        setRebindState("idle");
        setRestoredScope(null);
        setRestoreState("idle");
        return;
      }
      if (response.status === 409) callbacksRef.current.retryDraftReconciliation();
      if (!response.ok) throw new Error(String(response.status));
      if (!callbacksRef.current.completeRebind(fromDraftId, toDraftId)) throw new Error("local rebind not saved");
      setRebindState("idle");
      setRestoredScope(null);
      setRestoreState("idle");
    }).catch(() => {
      if (!ignore && scopeRef.current === scopeAtStart) setRebindState("error");
    });
    return () => { ignore = true; };
  }, [contextKey, draftId, rebindFrom, rebindVersion, rebindAttempt, scope]);

  useEffect(() => {
    if (!draftReady) {
      setRestoredScope(null);
      return;
    }
    if (!contextKey || !draftReady || rebindFrom || restoredScope === scope) return;
    const scopeAtStart = scope;
    const entriesAtStart = new Map(entriesRef.current.map((entry) => [entry.id, entry]));
    let ignore = false;
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
        .map((attachment) => restoredEntry(attachment, draftId));
      if (ignore || scopeRef.current !== scopeAtStart) return;
      // A list is a server snapshot. Keep mutations made while that snapshot was read.
      setEntries((current) => {
        const mutations = current.filter((entry) => entry.status !== "stored"
          || entry !== entriesAtStart.get(entry.id));
        return [
          ...restored.filter((entry) => !removedIdsRef.current.has(entry.id)
            && !mutations.some((item) => item.id === entry.id)),
          ...mutations,
        ];
      });
      setRestoredScope(scopeAtStart);
      setRestoreState("ready");
    }).catch(() => {
      if (!ignore && scopeRef.current === scopeAtStart) setRestoreState("error");
    });
    return () => { ignore = true; };
  }, [contextKey, draftId, draftReady, draftRevision, rebindFrom, restoreAttempt, restoredScope, scope]);

  const restoreReady = !!scope && restoredScope === scope && restoreState === "ready";
  const canAdd = !!contextKey && draftReady && !rebindFrom && rebindState !== "loading"
    && restoreReady && !disabled;
  const hasUnsettled = entries.some((entry) => entry.status !== "stored");
  // A published snapshot contains only settled files; all pending operations block submit.
  const blocking = !!contextKey && (
    !draftReady
    || !!rebindFrom
    || !restoreReady
    || hasUnsettled
  );
  const selectedAttachmentIds = entries.filter((entry) => entry.status === "stored")
    .map((entry) => entry.id).sort();

  useEffect(() => {
    if (!blocking) setPublicationWarning(false);
  }, [blocking]);

  function setEntry(id: string, update: (entry: UploadEntry) => UploadEntry) {
    setEntries((current) => current.map((entry) => entry.id === id ? update(entry) : entry));
  }

  function startUpload(
    file: File,
    stableId: string = crypto.randomUUID(),
    replacing = false,
    uncertainCommit = false,
    originalDraftId?: string,
  ) {
    if (!contextKey || !identity || disabled || (!originalDraftId && !canAdd)) return;
    const namedFile = file.name.trim()
      ? file
      : new File([file], fallbackClipboardName(file), {
          type: file.type,
          lastModified: file.lastModified,
        });
    if (!replacing && likelySecretFile(namedFile.name) && !window.confirm(t("editorAttachmentSecretWarning"))) return;

    const generation = originalDraftId ?? callbacksRef.current.reserveGeneration();
    if (!generation || (!originalDraftId && generation !== draftId)) return;
    const identityAtStart = identity;
    const selectionAtStart = selectionEpoch;
    const next: UploadEntry = {
      id: stableId,
      draftId: generation,
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
    const active = () => selectionEpochRef.current === selectionAtStart
      && identityRef.current === identityAtStart
      && entriesRef.current.some((entry) => entry.id === stableId
        && entry.draftId === generation && entry.status === "uploading");
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !active()) return;
      const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      setEntry(stableId, (current) => ({ ...current, progress }));
    };
    request.onload = () => {
      requestsRef.current.delete(stableId);
      const payload = parseJson(request.responseText);
      const attachment = storedAttachment(payload?.attachment);
      if (request.status === 201 && payload?.outcome === "stored" && attachment) {
        // The originating editor may have unmounted while R2 was streaming.
        // A reopened editor restores its own exact generation, never this response's files.
        if (!active()) {
          notifyAttachmentChange(identityAtStart);
          return;
        }
        setEntry(stableId, () => restoredEntry(attachment, generation));
        callbacksRef.current.noteAttachmentChange(draftIdRef.current);
        return;
      }
      if (!active()) {
        // A failure response can hide a committed ref in the chosen generation.
        notifyAttachmentChange(identityAtStart);
        return;
      }
      const reason = typeof payload?.reason === "string"
        ? payload.reason
        : typeof payload?.error === "string" ? payload.error : null;
      if (reason === "gone") callbacksRef.current.retryDraftReconciliation();
      setEntry(stableId, (current) => ({
        ...current,
        status: "error",
        progress: null,
        error: reason,
        // A dependency/server failure may hide a committed DB write. Only explicit
        // validation rejections establish that this attempt did not commit.
        uncertainCommit: reason !== "gone" && (current.uncertainCommit || request.status >= 500
          || !payload || (request.status >= 200 && request.status < 300)),
      }));
    };
    const transportFailure = () => {
      requestsRef.current.delete(stableId);
      if (!active()) {
        notifyAttachmentChange(identityAtStart);
        return;
      }
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
    startUpload(entry.file, entry.id, true, entry.uncertainCommit, entry.draftId);
  }

  async function remove(entry: UploadEntry) {
    if (
      !contextKey
      || !identity
      || entry.status === "uploading"
      || entry.status === "removing"
      || entry.uncertainCommit
    ) return;
    const identityAtStart = identity;
    const selectionAtStart = selectionEpoch;
    if (entry.error === "gone") {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      return;
    }
    const previousStatus = entry.attachment ? "stored" as const : "error" as const;
    setEntry(entry.id, (current) => ({ ...current, status: "removing", removeError: false }));
    const activeRemoval = () => selectionEpochRef.current === selectionAtStart
      && identityRef.current === identityAtStart
      && entriesRef.current.some((item) => item.id === entry.id
        && item.draftId === entry.draftId && item.status === "removing");
    try {
      const response = await fetch("/api/attachments", {
        method: "DELETE",
        headers: {
          "X-Vico-Draft-Context": encoded(contextKey),
          "X-Vico-Draft-Id": entry.draftId,
          "X-Vico-Attachment-Id": entry.id,
        },
        credentials: "same-origin",
      });
      if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error(String(response.status));
      if (activeRemoval()) {
        removedIdsRef.current.add(entry.id);
        setEntries((current) => current.filter((item) => item.id !== entry.id));
        if (response.status === 410) callbacksRef.current.retryDraftReconciliation();
        else callbacksRef.current.noteAttachmentChange(draftIdRef.current);
      } else {
        // A late commit can invalidate the new selection's GET snapshot. Refresh
        // authoritative refs without applying this obsolete UI operation.
        notifyAttachmentChange(identityAtStart);
      }
    } catch {
      if (activeRemoval()) {
        setEntry(entry.id, (current) => ({
          ...current,
          status: previousStatus,
          removeError: true,
        }));
      } else {
        // A lost acknowledgement does not establish that DELETE rolled back.
        notifyAttachmentChange(identityAtStart);
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
              {entry.status === "stored" && entry.attachment && contextKey ? (
                <ForumAttachmentDisplay attachment={entry.attachment}
                  url={`/api/attachments/file/${encoded(entry.id)}?draft=${encoded(draftId)}&context=${encoded(contextKey)}`}
                  deferImage compact />
              ) : null}
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
    selectedAttachmentIds,
    element,
    handleDrop,
    handleDragOver,
    handlePaste,
    markPublicationAttempt() {
      if (blocking) setPublicationWarning(true);
    },
  };
}
