import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ForumEditorDraftPayload } from "../../db/schema";
import {
  clearLocalEditorDraft, draftStorageKey, fetchDraftContent, fetchDraftMetadata,
  mutateDraft, readLocalEditorDraft, writeLocalEditorDraft,
  type DraftRemote, type LocalEditorDraft,
} from "./draft-client";

interface Props {
  ownerId: string | null;
  contextKey: string | undefined;
  locale: string | undefined;
  readPayload(body: string): ForumEditorDraftPayload;
  restore(payload: ForumEditorDraftPayload): void;
}
type Status = "idle" | "saved" | "pending" | "saving" | "restored" | "conflict" | "error";
type Conflict = { local: LocalEditorDraft; server: DraftRemote };

export function useEditorDraft({ ownerId, contextKey, locale, readPayload, restore }: Props) {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<Status>("idle");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const localRef = useRef<LocalEditorDraft | null>(null);
  const conflictRef = useRef<Conflict | null>(null);
  const bodyRef = useRef("");
  const busyRef = useRef(false);
  const callbacks = useRef({ readPayload, restore });
  callbacks.current = { readPayload, restore };
  const identity = ownerId && contextKey && locale ? ownerId + ":" + contextKey + ":" + locale : null;
  const identityRef = useRef(identity);
  const renderedIdentityRef = useRef(identity);
  renderedIdentityRef.current = identity;
  function chooseConflict(value: Conflict | null) {
    conflictRef.current = value;
    setConflict(value);
  }
  function flushLocal() {
    if (!identity || !ownerId || !contextKey) return;
    const payload = callbacks.current.readPayload(bodyRef.current);
    if (!payload.body.trim() && !payload.title.trim() && !payload.tags.trim()) return;
    const previous = localRef.current;
    if (previous && JSON.stringify(previous.payload) === JSON.stringify(payload)) return;
    const next: LocalEditorDraft = {
      ownerId, contextKey, draftId: previous?.draftId ?? draftId, payload,
      editedAt: new Date().toISOString(),
      baseVersion: previous?.baseVersion ?? 0, syncedEditedAt: previous?.syncedEditedAt ?? null,
    };
    if (!writeLocalEditorDraft(next)) { setStatus("error"); return; }
    localRef.current = next;
    if (conflictRef.current) {
      chooseConflict({ ...conflictRef.current, local: next });
      setStatus("conflict");
    } else setStatus("pending");
  }
  function noteEdit(body: string, immediate = false) {
    bodyRef.current = body;
    if (immediate || /\s$/u.test(body) || body.length === 0) flushLocal();
  }
  function restoreDraft(draft: DraftRemote) {
    if (!ownerId || !contextKey) return;
    const next: LocalEditorDraft = {
      ownerId, contextKey, draftId: draft.draftId,
      payload: draft.payload, editedAt: draft.editedAt,
      baseVersion: draft.version, syncedEditedAt: draft.editedAt,
    };
    localRef.current = next;
    writeLocalEditorDraft(next);
    setDraftId(draft.draftId);
    callbacks.current.restore(next.payload);
    bodyRef.current = next.payload.body;
    setStatus("restored");
  }
  function clearFinished() {
    if (!ownerId || !contextKey) return;
    clearLocalEditorDraft(ownerId, contextKey);
    localRef.current = null;
    chooseConflict(null);
    callbacks.current.restore({ title: "", body: "", tags: "" });
    bodyRef.current = "";
    setDraftId(crypto.randomUUID());
    setStatus("idle");
  }
  async function checkRemote() {
    if (!identity || !ownerId || !contextKey || !locale || busyRef.current || conflictRef.current) return;
    try {
      const meta = (await fetchDraftMetadata(locale)).find((entry) => entry.contextKey === contextKey);
      if (identityRef.current !== identity) return;
      const local = localRef.current;
      if (meta?.status !== undefined && meta.status !== "active") {
        // A tombstone is authoritative only for the same working draft.
        if (!local || local.draftId === meta.draftId) clearFinished();
        return;
      }
      if (!meta || (local && meta.version === local.baseVersion && meta.draftId === local.draftId)) return;
      const remote = await fetchDraftContent(locale, contextKey);
      if (identityRef.current !== identity || !remote) return;
      if (!local || JSON.stringify(local.payload) === JSON.stringify(remote.payload)
        || local.editedAt === local.syncedEditedAt) {
        restoreDraft(remote);
      } else {
        chooseConflict({ local, server: remote });
        setStatus("conflict");
      }
    } catch {
      if (identityRef.current === identity && localRef.current) setStatus("pending");
    }
  }
  async function sync() {
    if (!identity || !ownerId || !contextKey || !locale || busyRef.current || conflictRef.current) return;
    const local = localRef.current;
    if (!local || local.editedAt === local.syncedEditedAt) return;
    busyRef.current = true;
    setStatus("saving");
    try {
      const result = await mutateDraft(locale, {
        intent: "save", contextKey, draftId: local.draftId,
        payload: local.payload, expectedVersion: local.baseVersion, editedAt: local.editedAt,
      });
      if (identityRef.current !== identity) return;
      if (result.outcome === "saved" && result.draft) {
        const latest = localRef.current;
        if (!latest || latest.draftId !== local.draftId) return;
        const next: LocalEditorDraft = { ...latest, baseVersion: result.draft.version,
          syncedEditedAt: latest.editedAt === local.editedAt ? latest.editedAt : local.syncedEditedAt };
        localRef.current = next;
        writeLocalEditorDraft(next);
        setStatus(next.editedAt === next.syncedEditedAt ? "saved" : "pending");
      } else if (result.outcome === "gone") {
        clearFinished();
      } else if (result.outcome === "conflict") {
        const remote = await fetchDraftContent(locale, contextKey);
        if (identityRef.current === identity && remote) {
          chooseConflict({ local: localRef.current ?? local, server: remote });
          setStatus("conflict");
        }
      }
    } catch { if (identityRef.current === identity) setStatus("pending"); }
    finally { busyRef.current = false; }
  }
  function chooseVersion(which: "local" | "server") {
    const current = conflictRef.current;
    if (!current || !ownerId || !contextKey) return;
    if (which === "server") restoreDraft(current.server);
    else {
      const next: LocalEditorDraft = {
        ...current.local, draftId: current.server.draftId, baseVersion: current.server.version,
      };
      localRef.current = next;
      setDraftId(next.draftId);
      writeLocalEditorDraft(next);
      callbacks.current.restore(next.payload);
      bodyRef.current = next.payload.body;
      setStatus("pending");
    }
    chooseConflict(null);
  }
  useEffect(() => {
    identityRef.current = identity;
    chooseConflict(null);
    if (!identity || !ownerId || !contextKey || !locale) {
      localRef.current = null;
      bodyRef.current = "";
      setStatus("idle");
      return;
    }
    let live = true;
    const local = readLocalEditorDraft(ownerId, contextKey);
    localRef.current = local;
    if (local) {
      callbacks.current.restore(local.payload);
      bodyRef.current = local.payload.body;
      setDraftId(local.draftId);
      setStatus("restored");
    }
    void checkRemote();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushLocal();
      else void checkRemote();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== draftStorageKey(ownerId, contextKey)) return;
      const other = readLocalEditorDraft(ownerId, contextKey);
      const mine = localRef.current;
      if (!other || other.editedAt === mine?.editedAt) return;
      if (!mine || mine.editedAt === mine.syncedEditedAt) {
        localRef.current = other;
        setDraftId(other.draftId);
        callbacks.current.restore(other.payload);
        bodyRef.current = other.payload.body;
        setStatus("restored");
        return;
      }
      chooseConflict({ local: mine, server: {
        contextKey, draftId: other.draftId, version: other.baseVersion, status: "active",
        title: other.payload.title, snippet: other.payload.body.slice(0, 140),
        updatedAt: other.editedAt, editedAt: other.editedAt, payload: other.payload,
      } });
      setStatus("conflict");
    };
    const onPageHide = () => flushLocal();
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onVisibility);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => { if (live) void sync().then(() => checkRemote()); }, 60_000);
    return () => {
      live = false;
      if (renderedIdentityRef.current === identity) flushLocal();
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("online", onVisibility);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // Rebind draft lifecycle only when account/form identity changes.
  }, [identity]);

  const labels: Record<Status, string> = {
    idle: "", saved: t("editorDraftSaved"), pending: t("editorDraftPending"),
    saving: t("editorDraftSaving"), restored: t("editorDraftRestored"),
    conflict: t("editorDraftConflict"), error: t("editorDraftLocalError"),
  };
  return {
    noteEdit, saveLocal: flushLocal, draftId,
    element: ownerId && contextKey ? (
      <div className="markdown-editor-draft-state" aria-live="polite">
        <span>{labels[status]}</span>
        {conflict ? <div className="markdown-editor-draft-conflict" role="group" aria-label={t("editorDraftConflict")}>
          <p>{t("editorDraftConflict")}</p>
          <div className="markdown-editor-draft-versions">
            <section><strong>{t("editorDraftThisDevice")}</strong><pre>{conflict.local.payload.body}</pre></section>
            <section><strong>{t("editorDraftOtherDevice")}</strong><pre>{conflict.server.payload.body}</pre></section>
          </div>
          <button type="button" onClick={() => chooseVersion("local")}>{t("editorDraftKeepLocal")}</button>
          <button type="button" onClick={() => chooseVersion("server")}>{t("editorDraftKeepServer")}</button>
        </div> : null}
      </div>
    ) : null,
  };
}
