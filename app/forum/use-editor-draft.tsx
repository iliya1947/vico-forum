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
  const [status, setStatus] = useState<Status>("idle");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const localRef = useRef<LocalEditorDraft | null>(null);
  const dirtyBodyRef = useRef("");
  const hasUnsavedRef = useRef(false);
  const busyRef = useRef(false);
  const statusRef = useRef<Status>("idle");
  const callbacks = useRef({ readPayload, restore });
  callbacks.current = { readPayload, restore };
  const identity = ownerId && contextKey && locale ? ownerId + ":" + contextKey + ":" + locale : null;
  const { t } = useTranslation("common");

  function state(next: Status) { statusRef.current = next; setStatus(next); }

  function saveLocal() {
    if (!ownerId || !contextKey || !identity || conflict) return;
    const payload = callbacks.current.readPayload(dirtyBodyRef.current);
    if (!payload.body.trim() && !payload.title.trim() && !payload.tags.trim()) return;
    const previous = localRef.current;
    const changed = !previous || JSON.stringify(previous.payload) !== JSON.stringify(payload);
    if (!changed && !hasUnsavedRef.current) return;
    const updated: LocalEditorDraft = {
      ownerId, contextKey, payload,
      editedAt: changed ? new Date().toISOString() : previous!.editedAt,
      baseVersion: previous?.baseVersion ?? 0,
      syncedEditedAt: previous?.syncedEditedAt ?? null,
    };
    if (writeLocalEditorDraft(updated)) {
      localRef.current = updated;
      hasUnsavedRef.current = false;
      state(updated.editedAt === updated.syncedEditedAt ? "saved" : "pending");
    } else state("error");
  }

  function noteEdit(body: string, immediate = false) {
    dirtyBodyRef.current = body;
    hasUnsavedRef.current = true;
    if (immediate || /\s$/u.test(body) || body.length === 0) saveLocal();
  }

  async function sync() {
    if (!identity || !ownerId || !locale || !contextKey || busyRef.current || conflict) return;
    const local = localRef.current;
    if (!local || local.editedAt === local.syncedEditedAt) return;
    busyRef.current = true;
    state("saving");
    try {
      const result = await mutateDraft(locale, {
        intent: "save", contextKey,
        payload: local.payload, expectedVersion: local.baseVersion, editedAt: local.editedAt,
      });
      if (result.outcome === "saved" && result.draft) {
        const latest = localRef.current;
        if (latest && latest.editedAt === local.editedAt) {
          const saved = { ...latest, baseVersion: result.draft.version, syncedEditedAt: latest.editedAt };
          localRef.current = saved;
          writeLocalEditorDraft(saved);
          state("saved");
        } else if (latest) {
          // An older upload cannot mark a newer local edit as synchronized.
          const updated = { ...latest, baseVersion: result.draft.version };
          localRef.current = updated;
          writeLocalEditorDraft(updated);
          state("pending");
        }
      } else if (result.outcome === "gone") {
        clearLocalEditorDraft(ownerId, contextKey);
        localRef.current = null;
        callbacks.current.restore({ body: "", title: "", tags: "" });
        state("idle");
      } else if (result.outcome === "conflict") {
        const remote = await fetchDraftContent(locale, contextKey);
        if (remote) {
          setConflict({ local, server: remote });
          state("conflict");
        }
      }
    } catch { state("pending"); }
    finally { busyRef.current = false; }
  }

  async function checkRemote() {
    if (!ownerId || !contextKey || !locale || busyRef.current || conflict) return;
    try {
      const metadata = (await fetchDraftMetadata(locale)).find((draft) => draft.contextKey === contextKey);
      const local = localRef.current;
      if (metadata && metadata.status !== "active") {
        clearLocalEditorDraft(ownerId, contextKey);
        localRef.current = null;
        callbacks.current.restore({ body: "", title: "", tags: "" });
        state("idle");
        return;
      }
      if (!metadata || (local && metadata.version === local.baseVersion)) return;
      const remote = await fetchDraftContent(locale, contextKey);
      if (!remote) return;
      if (!local || JSON.stringify(local.payload) === JSON.stringify(remote.payload)) {
        const next: LocalEditorDraft = {
          ownerId, contextKey, payload: remote.payload,
          editedAt: remote.editedAt, baseVersion: remote.version, syncedEditedAt: remote.editedAt,
        };
        localRef.current = next;
        writeLocalEditorDraft(next);
        callbacks.current.restore(remote.payload);
        dirtyBodyRef.current = remote.payload.body;
        state("restored");
        return;
      }
      setConflict({ local, server: remote });
      state("conflict");
    } catch {
      // Local edits remain available while disconnected.
      if (localRef.current) state("pending");
    }
  }

  function chooseVersion(kind: "local" | "server") {
    const current = conflict;
    if (!current || !ownerId || !contextKey) return;
    if (kind === "server") {
      const next: LocalEditorDraft = {
        ownerId, contextKey, payload: current.server.payload,
        editedAt: current.server.editedAt,
        baseVersion: current.server.version, syncedEditedAt: current.server.editedAt,
      };
      localRef.current = next;
      writeLocalEditorDraft(next);
      callbacks.current.restore(next.payload);
      dirtyBodyRef.current = next.payload.body;
      state("restored");
    } else {
      const next = { ...current.local, baseVersion: current.server.version };
      localRef.current = next;
      writeLocalEditorDraft(next);
      callbacks.current.restore(next.payload);
      dirtyBodyRef.current = next.payload.body;
      state("pending");
    }
    setConflict(null);
  }

  useEffect(() => {
    if (!identity || !ownerId || !contextKey || !locale) {
      localRef.current = null;
      dirtyBodyRef.current = "";
      hasUnsavedRef.current = false;
      state("idle");
      return;
    }
    let active = true;
    const local = readLocalEditorDraft(ownerId, contextKey);
    localRef.current = local;
    if (local) {
      callbacks.current.restore(local.payload);
      dirtyBodyRef.current = local.payload.body;
      state("restored");
    }
    void (async () => { if (active) await checkRemote(); })();
    const persist = () => saveLocal();
    const onVisibility = () => { if (document.visibilityState === "hidden") persist(); else void checkRemote(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== draftStorageKey(ownerId, contextKey) || !event.newValue) return;
      const other = readLocalEditorDraft(ownerId, contextKey);
      const mine = localRef.current;
      if (other && mine && other.editedAt !== mine.editedAt) {
        const server: DraftRemote = {
          ...other.payload, payload: other.payload,
          title: other.payload.title, snippet: other.payload.body.slice(0, 140),
          contextKey, version: other.baseVersion, status: "active",
          updatedAt: other.editedAt, editedAt: other.editedAt,
        };
        setConflict({ local: mine, server }); state("conflict");
      }
    };
    window.addEventListener("pagehide", persist);
    window.addEventListener("online", onVisibility);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    const clock = window.setInterval(() => { if (active) { saveLocal(); void sync().then(() => checkRemote()); } }, 60_000);
    return () => {
      active = false;
      persist();
      window.clearInterval(clock);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("online", onVisibility);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  // An account / context switch creates a new isolated working draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const labels: Record<Status, string> = {
    idle: "", saved: t("editorDraftSaved"),
    pending: t("editorDraftPending"),
    saving: t("editorDraftSaving"),
    restored: t("editorDraftRestored"),
    conflict: t("editorDraftConflict"),
    error: t("editorDraftLocalError"),
  };
  return {
    noteEdit, saveLocal, status, conflict, chooseVersion,
    element: ownerId && contextKey ? (
      <div className="markdown-editor-draft-state" aria-live="polite">
        <span>{labels[status]}</span>
        {conflict ? <div className="markdown-editor-draft-conflict" role="alertdialog" aria-label={t("editorDraftConflict")}>
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
