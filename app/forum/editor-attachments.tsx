import { ForumAttachmentDisplay } from "./attachment-presentation";
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
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
type UploadStatus = "uploading" | "selecting" | "stored" | "error" | "removing";
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
    publishedUrl: string | null;
};
interface Props {
    ownerId: string | null;
    contextKey?: string;
    disabled: boolean;
    publishedEdit?: boolean;
    publishedAttachments?: readonly {
        id: string;
        url: string;
        fileName: string;
        byteSize: number;
        detectedType: string;
    }[];
    insertImage(id: string, name: string): void;
    removeImage(id: string): void;
    replaceImage?(oldId: string, newId: string): void;
}
function encoded(value: string): string {
    return encodeURIComponent(value);
}
function fallbackClipboardName(file: File): string {
    if (file.name.trim())
        return file.name;
    const extension = file.type === "image/jpeg" ? "jpg"
        : file.type === "image/gif" ? "gif"
            : file.type === "image/webp" ? "webp"
                : "png";
    return `pasted-image-${Date.now()}.${extension}`;
}
function uploadErrorKey(reason: string | null): UiKey<"common"> {
    if (reason === "gone")
        return "editorAttachmentErrorUnavailable";
    if (reason === "too-large")
        return "editorAttachmentErrorTooLarge";
    if (reason === "empty")
        return "editorAttachmentErrorEmpty";
    if (reason === "invalid-name")
        return "editorAttachmentErrorName";
    if (reason === "forbidden-extension"
        || reason === "forbidden-mime"
        || reason === "executable-signature")
        return "editorAttachmentErrorUnsafe";
    if (reason === "signature-mismatch"
        || reason === "mime-mismatch"
        || reason === "binary-content"
        || reason === "insufficient-evidence"
        || reason === "invalid-structure")
        return "editorAttachmentErrorType";
    if (reason === "unsupported-extension")
        return "editorAttachmentErrorUnsupported";
    if (reason === "unauthenticated")
        return "editorAttachmentErrorUnauthenticated";
    if (reason === "forbidden")
        return "editorAttachmentErrorForbidden";
    if (reason === "notFound")
        return "editorAttachmentErrorContext";
    if (reason === "unavailable")
        return "editorAttachmentErrorUnavailable";
    return "editorAttachmentErrorGeneric";
}
function parseJson(text: string): Record<string, unknown> | null {
    try {
        const value = JSON.parse(text);
        return value && typeof value === "object" ? value as Record<string, unknown> : null;
    }
    catch {
        return null;
    }
}
function storedAttachment(value: unknown): DraftAttachment | null {
    if (!value || typeof value !== "object")
        return null;
    const item = value as Record<string, unknown>;
    if (typeof item.id !== "string"
        || typeof item.fileName !== "string"
        || typeof item.detectedType !== "string"
        || typeof item.responseMime !== "string"
        || typeof item.byteSize !== "number"
        || item.verificationStatus !== "type-checked")
        return null;
    return {
        id: item.id,
        fileName: item.fileName,
        detectedType: item.detectedType,
        responseMime: item.responseMime,
        byteSize: item.byteSize,
        verificationStatus: "type-checked",
    };
}
function restoredEntry(attachment: DraftAttachment, draftId: string, publishedUrl: string | null = null): UploadEntry {
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
        publishedUrl,
    };
}
function likelySecretFile(name: string): boolean {
    const lower = name.trim().toLowerCase();
    return lower === ".env" || lower.startsWith(".env.");
}
export function useEditorAttachments({ ownerId, contextKey, disabled, publishedEdit = false, publishedAttachments = [], insertImage, removeImage, replaceImage }: Props) {
    const { t, i18n } = useTranslation("common");
    const [draftId, setOperationId] = useState("");
    const [entries, setEntries] = useState<UploadEntry[]>([]);
    const [publicationWarning, setPublicationWarning] = useState(false);
    const entriesRef = useRef(entries);
    entriesRef.current = entries;
    const callbacksRef = useRef({ insertImage, removeImage, replaceImage });
    callbacksRef.current = { insertImage, removeImage, replaceImage };
    const identity = JSON.stringify([ownerId, contextKey, draftId]);
    const identityRef = useRef(identity);
    identityRef.current = identity;
    const requestsRef = useRef(new Map<string, XMLHttpRequest>());
    const previousScope = useRef(JSON.stringify([ownerId, contextKey]));
    const removedPublishedIds = useRef(new Set<string>());
    const headers = { "X-Vico-Editor-Context": encoded(contextKey ?? ""), "X-Vico-Operation-Id": draftId };
    function initialEntries(): UploadEntry[] {
        return publishedAttachments.map((file) => restoredEntry({ ...file, responseMime: "application/octet-stream", verificationStatus: "type-checked" }, draftId, file.url));
    }
    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
        const scope = JSON.stringify([ownerId, contextKey]);
        if (!initialized || previousScope.current !== scope) {
            previousScope.current = scope;
            removedPublishedIds.current.clear();
            setEntries(initialEntries());
            setInitialized(true);
            setOperationId(crypto.randomUUID());
        }
    }, [ownerId, contextKey, initialized]);
    useEffect(() => {
        identityRef.current = identity;
        const requests = requestsRef.current;
        return () => { identityRef.current = ""; for (const request of requests.values())
            request.abort(); requests.clear(); };
    }, [identity]);
    const attachmentUrl = (entry: UploadEntry) => entry.publishedUrl
        ?? `/api/attachments/file/${encoded(entry.id)}?operation=${encoded(entry.draftId)}&context=${encoded(contextKey ?? "")}`;
    const canAdd = !!ownerId && !!contextKey && initialized && !disabled;
    const hasUnsettled = entries.some((entry) => entry.status !== "stored");
    const blocking = !!contextKey && (!initialized || hasUnsettled);
    const selectedIds = entries.filter((entry) => entry.status === "stored" && entry.publishedUrl === null).map((entry) => entry.id).sort();
    const retainedAttachmentIds = entries.filter((entry) => entry.status === "stored" && entry.publishedUrl !== null).map((entry) => entry.id).sort();
    function setEntry(id: string, update: (entry: UploadEntry) => UploadEntry) {
        setEntries((current) => current.map((entry) => entry.id === id ? update(entry) : entry));
    }
    function reset() { removedPublishedIds.current.clear(); setOperationId(crypto.randomUUID()); setEntries(initialEntries()); setPublicationWarning(false); }
    function freshOperation() {
        const next = crypto.randomUUID();
        identityRef.current = JSON.stringify([ownerId, contextKey, next]);
        for (const request of requestsRef.current.values()) request.abort();
        requestsRef.current.clear();
        setOperationId(next);
        return next;
    }
    function rebasePublishedAttachments(completedOperationId?: string) {
        if (!initialized) return false;
        const publishedIds = new Set(publishedAttachments.map(file => file.id));
        const baseline = initialEntries().filter(entry => !removedPublishedIds.current.has(entry.id));
        const restart = !!completedOperationId && completedOperationId === draftId;
        const operation = restart ? freshOperation() : draftId;
        // An ACK-lost upload can already be published. It is retained exactly once.
        // Other uploads from a completed operation keep their File for explicit Retry.
        setEntries(current => [...baseline, ...current.filter(entry => entry.publishedUrl === null && !publishedIds.has(entry.id))
            .map(entry => entry.draftId !== operation ? { ...entry, status: "error" as const, progress: null, error: "unavailable" } : entry)]);
        return true;
    }
    function cancel() {
        const operationHeaders = headers;
        for (const request of requestsRef.current.values())
            request.abort();
        requestsRef.current.clear();
        if (ownerId && contextKey)
            void fetch("/api/attachments", { method: "DELETE", credentials: "same-origin", headers: operationHeaders }).catch(() => { });
        reset();
    }
    function startUpload(file: File, stableId: string = crypto.randomUUID(), replacing = false) {
        if (!canAdd)
            return;
        const namedFile = file.name.trim() ? file : new File([file], fallbackClipboardName(file), { type: file.type });
        if (!replacing && likelySecretFile(namedFile.name) && !window.confirm(t("editorAttachmentSecretWarning")))
            return;
        const identityAtStart = identity;
        const entry: UploadEntry = { id: stableId, draftId, fileName: namedFile.name, byteSize: namedFile.size,
            status: "uploading", progress: 0, file: namedFile, attachment: null, error: null, removeError: false, publishedUrl: null };
        if (replacing)
            setEntry(stableId, () => entry);
        else
            setEntries((current) => [...current, entry]);
        setPublicationWarning(false);
        if (!replacing && namedFile.type.startsWith("image/"))
            callbacksRef.current.insertImage(stableId, namedFile.name);
        const request = new XMLHttpRequest();
        requestsRef.current.set(stableId, request);
        const active = () => identityRef.current === identityAtStart;
        request.upload.onprogress = (event) => {
            if (active() && event.lengthComputable)
                setEntry(stableId, (current) => ({ ...current, progress: Math.round(event.loaded / event.total * 100) }));
        };
        request.onload = () => {
            requestsRef.current.delete(stableId);
            if (!active())
                return;
            const payload = parseJson(request.responseText), attachment = storedAttachment(payload?.attachment);
            if (request.status === 201 && payload?.outcome === "stored" && attachment) {
                setEntry(stableId, () => ({ ...restoredEntry(attachment, draftId), file: namedFile }));
                return;
            }
            setEntry(stableId, (current) => ({ ...current, status: "error", progress: null,
                error: typeof payload?.reason === "string" ? payload.reason : typeof payload?.error === "string" ? payload.error : "unavailable" }));
            if (publishedEdit && request.status === 410 && payload?.error === "gone") {
                // A lost Save ACK can retire the operation before this new upload.
                // Retry must be usable even while the failed file blocks Save.
                freshOperation();
                setEntries(current => current.map(entry => entry.status === "uploading"
                    ? { ...entry, status: "error", progress: null, error: "gone" } : entry));
            }
        };
        const failure = () => { requestsRef.current.delete(stableId); if (active())
            setEntry(stableId, (current) => ({ ...current, status: "error", progress: null, error: "unavailable" })); };
        request.onerror = failure;
        request.onabort = failure;
        request.open("POST", "/api/attachments");
        request.responseType = "text";
        request.setRequestHeader("Content-Type", namedFile.type || "application/octet-stream");
        request.setRequestHeader("X-Vico-Attachment-Id", stableId);
        request.setRequestHeader("X-Vico-Attachment-Name", encoded(namedFile.name));
        request.setRequestHeader("X-Vico-Attachment-Size", String(namedFile.size));
        for (const [key, value] of Object.entries(headers))
            request.setRequestHeader(key, value);
        request.send(namedFile);
    }
    function addFiles(files: FileList | readonly File[]) { for (const file of Array.from(files))
        startUpload(file); }
    function retry(entry: UploadEntry) {
        if (!entry.file) return;
        if (entry.draftId === draftId) { startUpload(entry.file, entry.id, true); return; }
        // A different operation cannot claim the previous operation's asset ID.
        const nextId = crypto.randomUUID();
        setEntries(current => current.map(item => item.id === entry.id ? { ...item, id: nextId } : item));
        callbacksRef.current.replaceImage?.(entry.id, nextId);
        startUpload(entry.file, nextId, true);
    }
    function remove(entry: UploadEntry) {
        if (disabled || entry.status === "uploading") return;
        removedPublishedIds.current.add(entry.id);
        // The private server pool is retained until operation completion/cleanup.
        // Late upload ACKs only update existing entries, so cannot reselect this ID.
        callbacksRef.current.removeImage(entry.id);
        setEntries(current => current.filter(item => item.id !== entry.id));
    }
    function handleDrop(event: DragEvent<HTMLElement>) { if (event.dataTransfer.files.length) {
        event.preventDefault();
        event.stopPropagation();
        addFiles(event.dataTransfer.files);
    } }
    function handleDragOver(event: DragEvent<HTMLElement>) { if (event.dataTransfer.types.includes("Files"))
        event.preventDefault(); }
    function handlePaste(event: ClipboardEvent<HTMLElement>) {
        const files = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith("image/"));
        if (files.length) {
            event.preventDefault();
            event.stopPropagation();
            addFiles(files);
        }
    }
    const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
    function formattedBytes(bytes: number): string {
        if (bytes < 1024)
            return t("editorAttachmentBytes", { count: bytes });
        if (bytes < 1024 * 1024) {
            return t("editorAttachmentKilobytes", { size: number.format(bytes / 1024) });
        }
        return t("editorAttachmentMegabytes", { size: number.format(bytes / (1024 * 1024)) });
    }
    const lifecycleMessage = null;
    const controls = contextKey ? (<div className="markdown-editor-attachment-controls">
        <label className={"markdown-editor-attach-button" + (!canAdd ? " is-disabled" : "")}>
          <input type="file" multiple aria-label={t("editorAttach")} disabled={!canAdd} onChange={(event) => {
            if (event.currentTarget.files)
                addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
        }}/>
          <span aria-hidden="true">📎</span>
          <span>{t("editorAttach")}</span>
        </label>
        <span className="markdown-editor-attachment-hint">{t("editorAttachmentDropHint")}</span>
      </div>) : null;
    const details = contextKey && (lifecycleMessage || entries.length > 0 || publicationWarning) ? (<section className="markdown-editor-attachments" aria-label={t("editorAttachments")}>

      {entries.length > 0 ? (<ul className="markdown-editor-attachment-list">
          {entries.map((entry) => (<li key={entry.id} className={"markdown-editor-attachment is-" + entry.status}>
              <div className="markdown-editor-attachment-copy">
                <strong dir="auto">{entry.fileName}</strong>
                <span>{formattedBytes(entry.byteSize)}</span>
                {entry.status === "uploading" || entry.status === "selecting" ? (<span>
                    {entry.progress === null
                        ? t("editorAttachmentUploading")
                        : t("editorAttachmentUploadingProgress", { progress: entry.progress })}
                  </span>) : entry.status === "stored" ? (<span>{t("editorAttachmentUploaded")}</span>) : entry.status === "removing" ? (<span>{t("editorAttachmentRemoving")}</span>) : (<span className="is-error">{t(uploadErrorKey(entry.error))}</span>)}
                {entry.removeError ? (<span className="is-error">{t("editorAttachmentRemoveError")}</span>) : null}
              </div>
              {entry.status === "stored" && entry.attachment && contextKey ? (<ForumAttachmentDisplay attachment={entry.attachment} url={attachmentUrl(entry)} deferImage compact/>) : null}
              <div className="markdown-editor-attachment-actions">
                {entry.status === "error" ? (<button type="button" disabled={disabled} onClick={() => retry(entry)}>
                    {t("editorAttachmentRetry")}
                  </button>) : null}
                {entry.status !== "uploading"
                    && entry.status !== "selecting"
                    && entry.status !== "removing" ? (<button type="button" disabled={disabled} onClick={() => void remove(entry)}>
                      {t("editorAttachmentRemove")}
                    </button>) : null}
              </div>
              {entry.status === "uploading" && entry.progress !== null ? (<progress value={entry.progress} max={100} aria-label={t("editorAttachmentProgress", { file: entry.fileName })}/>) : null}
            </li>))}
        </ul>) : null}

      {publicationWarning && blocking ? (<p className="markdown-editor-attachment-error" role="alert">
          {t(hasUnsettled
                ? "editorAttachmentPublicationBlocked"
                : "editorAttachmentPublicationUnavailable")}
        </p>) : null}
    </section>) : null;
    return {
        blocking,
        operationId: draftId,
        selectedAttachmentIds: selectedIds,
        retainedAttachmentIds,
        cancel,
        reset,
        rebasePublishedAttachments,
        previewAttachments: entries.filter((entry) => entry.status === "stored" && entry.attachment && contextKey)
            .map((entry) => ({
            id: entry.id,
            fileName: entry.fileName,
            byteSize: entry.byteSize,
            detectedType: entry.attachment!.detectedType,
            url: attachmentUrl(entry),
        })),
        controls,
        details,
        element: <>{controls}{details}</>,
        handleDrop,
        handleDragOver,
        handlePaste,
        markPublicationAttempt() {
            if (blocking)
                setPublicationWarning(true);
        },
    };
}
