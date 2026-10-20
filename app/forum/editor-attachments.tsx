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
    uncertainCommit: boolean;
};
interface Props {
    ownerId: string | null;
    contextKey?: string;
    disabled: boolean;
    publishedAttachments?: readonly {
        id: string;
        url: string;
        fileName: string;
        byteSize: number;
        detectedType: string;
    }[];
    insertImage(id: string, name: string): void;
    removeImage(id: string): void;
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
export function useEditorAttachments({ ownerId, contextKey, disabled, publishedAttachments = [], insertImage, removeImage }: Props) {
    const { t, i18n } = useTranslation("common");
    const [draftId, setOperationId] = useState("");
    const [entries, setEntries] = useState<UploadEntry[]>([]);
    const [publicationWarning, setPublicationWarning] = useState(false);
    const entriesRef = useRef(entries);
    entriesRef.current = entries;
    const callbacksRef = useRef({ insertImage, removeImage });
    callbacksRef.current = { insertImage, removeImage };
    const identity = JSON.stringify([ownerId, contextKey, draftId]);
    const identityRef = useRef(identity);
    identityRef.current = identity;
    const requestsRef = useRef(new Map<string, XMLHttpRequest>());
    const previousScope = useRef(JSON.stringify([ownerId, contextKey]));
    const headers = { "X-Vico-Editor-Context": encoded(contextKey ?? ""), "X-Vico-Operation-Id": draftId };
    function initialEntries(): UploadEntry[] {
        return publishedAttachments.map((file) => restoredEntry({ ...file, responseMime: "application/octet-stream", verificationStatus: "type-checked" }, draftId));
    }
    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
        const scope = JSON.stringify([ownerId, contextKey]);
        if (!initialized || previousScope.current !== scope) {
            previousScope.current = scope;
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
    const attachmentUrl = (id: string, generation: string) => publishedAttachments.find((file) => file.id === id)?.url
        ?? `/api/attachments/file/${encoded(id)}?operation=${encoded(generation)}&context=${encoded(contextKey ?? "")}`;
    const canAdd = !!ownerId && !!contextKey && initialized && !disabled;
    const hasUnsettled = entries.some((entry) => entry.status !== "stored");
    const blocking = !!contextKey && (!initialized || hasUnsettled);
    const selectedIds = entries.filter((entry) => entry.status === "stored" && !publishedAttachments.some((file) => file.id === entry.id)).map((entry) => entry.id).sort();
    const retainedAttachmentIds = entries.filter((entry) => entry.status === "stored" && publishedAttachments.some((file) => file.id === entry.id)).map((entry) => entry.id).sort();
    function setEntry(id: string, update: (entry: UploadEntry) => UploadEntry) {
        setEntries((current) => current.map((entry) => entry.id === id ? update(entry) : entry));
    }
    function reset() { setOperationId(crypto.randomUUID()); setEntries(initialEntries()); setPublicationWarning(false); }
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
            status: "uploading", progress: 0, file: namedFile, attachment: null, error: null, removeError: false, uncertainCommit: false };
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
                setEntry(stableId, () => restoredEntry(attachment, draftId));
                return;
            }
            setEntry(stableId, (current) => ({ ...current, status: "error", progress: null,
                error: typeof payload?.reason === "string" ? payload.reason : typeof payload?.error === "string" ? payload.error : "unavailable",
                uncertainCommit: request.status >= 500 || !payload }));
        };
        const failure = () => { requestsRef.current.delete(stableId); if (active())
            setEntry(stableId, (current) => ({ ...current, status: "error", progress: null, error: "unavailable", uncertainCommit: true })); };
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
    function retry(entry: UploadEntry) { if (entry.file)
        startUpload(entry.file, entry.id, true); }
    async function remove(entry: UploadEntry) {
        if (entry.status === "uploading" || entry.status === "removing" || entry.uncertainCommit)
            return;
        const identityAtStart = identity;
        setEntry(entry.id, current => ({ ...current, status: "removing", removeError: false }));
        try {
            if (!publishedAttachments.some((file) => file.id === entry.id)) {
                const response = await fetch("/api/attachments", { method: "DELETE", credentials: "same-origin", headers: { ...headers, "X-Vico-Attachment-Id": entry.id } });
                if (!response.ok && response.status !== 404)
                    throw new Error("remove failed");
            }
            if (identityRef.current !== identityAtStart)
                return;
            callbacksRef.current.removeImage(entry.id);
            setEntries(current => current.filter(item => item.id !== entry.id));
        }
        catch {
            if (identityRef.current === identityAtStart)
                setEntry(entry.id, current => ({ ...current, status: entry.status, removeError: true }));
        }
    }
    function handleDrop(event: DragEvent<HTMLElement>) { if (event.dataTransfer.files.length) {
        event.preventDefault();
        event.stopPropagation();
        addFiles(event.dataTransfer.files);
    } }
    function handleDragOver(event: DragEvent<HTMLElement>) { if (event.dataTransfer.types.includes("Files"))
        event.preventDefault(); }
    function handlePaste(event: ClipboardEvent<HTMLElement>) {
        const files = Array.from(event.clipboardData.files).filter(file => file.type.startsWith("image/"));
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
              {entry.status === "stored" && entry.attachment && contextKey ? (<ForumAttachmentDisplay attachment={entry.attachment} url={attachmentUrl(entry.id, draftId)} deferImage compact/>) : null}
              <div className="markdown-editor-attachment-actions">
                {entry.status === "error" ? (<button type="button" disabled={disabled} onClick={() => retry(entry)}>
                    {t("editorAttachmentRetry")}
                  </button>) : null}
                {entry.status !== "uploading"
                    && entry.status !== "selecting"
                    && entry.status !== "removing"
                    && !entry.uncertainCommit ? (<button type="button" disabled={disabled} onClick={() => void remove(entry)}>
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
        previewAttachments: entries.filter((entry) => entry.status === "stored" && entry.attachment && contextKey)
            .map((entry) => ({
            id: entry.id,
            fileName: entry.fileName,
            byteSize: entry.byteSize,
            detectedType: entry.attachment!.detectedType,
            url: attachmentUrl(entry.id, entry.draftId),
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
