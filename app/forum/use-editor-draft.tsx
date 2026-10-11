import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ForumEditorDraftPayload } from "../../db/schema";
import {
  clearLocalEditorDraft, draftStorageKey, fetchDraftContent, fetchDraftMetadata,
  mutateDraft, readLocalEditorDraft, writeLocalEditorDraft,
  type DraftMetadata, type DraftRemote, type LocalEditorDraft,
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
type Runtime = {
  identity: string;
  ownerId: string;
  contextKey: string;
  locale: string;
  draftId: string;
  local: LocalEditorDraft | null;
  body: string;
  hasInput: boolean;
  baseVersion: number;
  conflict: Conflict | null;
  syncing: boolean;
  reading: boolean;
  disposed: boolean;
};

const blank: ForumEditorDraftPayload = { body: "", title: "", tags: "" };

function metadataAsRemote(meta: DraftMetadata): DraftRemote {
  // A tombstone contains no source text. It is never treated as an editable draft.
  return { ...meta, payload: blank };
}

export function useEditorDraft({ ownerId, contextKey, locale, readPayload, restore }: Props) {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<Status>("idle");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const runtimeRef = useRef<Runtime | null>(null);
  const callbacksRef = useRef({ readPayload, restore });
  callbacksRef.current = { readPayload, restore };
  const identity = ownerId && contextKey && locale ? JSON.stringify([ownerId, contextKey, locale]) : null;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  function current(ctx: Runtime) {
    return !ctx.disposed && runtimeRef.current === ctx && identityRef.current === ctx.identity;
  }
  function updateConflict(ctx: Runtime, next: Conflict | null) {
    if (!current(ctx)) return;
    ctx.conflict = next;
    setConflict(next);
    if (next) setStatus("conflict");
  }
  function capture(ctx: Runtime) {
    if (!current(ctx)) return;
    const payload = callbacksRef.current.readPayload(ctx.body);
    const previous = ctx.local;
    if (!previous && !payload.body.trim() && !payload.title.trim() && !payload.tags.trim()) return;
    if (previous && JSON.stringify(previous.payload) === JSON.stringify(payload)) return;
    const next: LocalEditorDraft = {
      ownerId: ctx.ownerId, contextKey: ctx.contextKey,
      draftId: previous?.draftId ?? ctx.draftId,
      startedAt: previous?.startedAt ?? new Date().toISOString(),
      payload, editedAt: new Date().toISOString(),
      baseVersion: previous?.baseVersion ?? ctx.baseVersion,
      syncedEditedAt: previous?.syncedEditedAt ?? null,
    };
    if (!writeLocalEditorDraft(next)) { setStatus("error"); return; }
    ctx.local = next;
    if (ctx.conflict) updateConflict(ctx, { ...ctx.conflict, local: next });
    else setStatus("pending");
  }
  function reset(ctx: Runtime) {
    if (!current(ctx)) return;
    clearLocalEditorDraft(ctx.ownerId, ctx.contextKey);
    ctx.local = null;
    ctx.body = "";
    ctx.hasInput = false;
    ctx.baseVersion = 0;
    ctx.draftId = crypto.randomUUID();
    callbacksRef.current.restore(blank);
    setDraftId(ctx.draftId);
    updateConflict(ctx, null);
    setStatus("idle");
  }
  function applyRemote(ctx: Runtime, remote: DraftRemote) {
    if (!current(ctx)) return;
    const next: LocalEditorDraft = {
      ownerId: ctx.ownerId, contextKey: ctx.contextKey, draftId: remote.draftId,
      startedAt: remote.editedAt, editedAt: remote.editedAt,
      baseVersion: remote.version, syncedEditedAt: remote.editedAt,
      payload: remote.payload,
    };
    if (!writeLocalEditorDraft(next)) { setStatus("error"); return; }
    ctx.local = next;
    ctx.baseVersion = remote.version;
    ctx.draftId = remote.draftId;
    ctx.body = remote.payload.body;
    ctx.hasInput = false;
    setDraftId(remote.draftId);
    callbacksRef.current.restore(remote.payload);
    setStatus("restored");
  }

  async function checkRemote(ctx: Runtime) {
    if (!current(ctx) || ctx.syncing || ctx.reading || ctx.conflict) return;
    ctx.reading = true;
    try {
      const meta = (await fetchDraftMetadata(ctx.locale))
        .find((entry) => entry.contextKey === ctx.contextKey);
      if (!current(ctx)) return;
      if (ctx.hasInput) capture(ctx); // Never overwrite unpersisted typing on a late fetch.
      const local = ctx.local;
      if (!meta) return;
      if (meta.status !== "active") {
        if (local?.draftId === meta.draftId) {
          reset(ctx); // Same generation was published/deleted elsewhere.
          ctx.baseVersion = meta.version;
        } else if (local) {
          // Different instance may be a new reply or a stale offline copy.
          // Clocks cannot establish which: require explicit user choice.
          updateConflict(ctx, { local, server: metadataAsRemote(meta) });
        } else {
          // New input in this form can start a fresh generation at the next 60s sync.
          ctx.baseVersion = meta.version;
        }
        return;
      }
      if (local && meta.version === local.baseVersion && meta.draftId === local.draftId) return;
      const remote = await fetchDraftContent(ctx.locale, ctx.contextKey);
      if (!current(ctx) || !remote) return;
      if (ctx.hasInput) capture(ctx);
      const latest = ctx.local;
      if (!latest) { applyRemote(ctx, remote); return; }
      if (latest.draftId === remote.draftId && latest.editedAt === latest.syncedEditedAt) {
        applyRemote(ctx, remote); return;
      }
      if (JSON.stringify(latest.payload) === JSON.stringify(remote.payload)) {
        const next = { ...latest, draftId: remote.draftId, baseVersion: remote.version,
          syncedEditedAt: latest.editedAt };
        ctx.local = next;
        ctx.baseVersion = remote.version;
        ctx.draftId = remote.draftId;
        setDraftId(remote.draftId);
        writeLocalEditorDraft(next);
        setStatus("saved");
        return;
      }
      updateConflict(ctx, { local: latest, server: remote });
    } catch {
      if (current(ctx) && ctx.local && !ctx.conflict) setStatus("pending");
    } finally { ctx.reading = false; }
  }

  async function sync(ctx: Runtime) {
    if (!current(ctx) || ctx.syncing || ctx.reading || ctx.conflict) return;
    const sent = ctx.local;
    if (!sent || sent.editedAt === sent.syncedEditedAt) return;
    ctx.syncing = true;
    setStatus("saving");
    try {
      const result = await mutateDraft(ctx.locale, {
        intent: "save", contextKey: ctx.contextKey, draftId: sent.draftId,
        payload: sent.payload, expectedVersion: sent.baseVersion, editedAt: sent.editedAt,
      });
      if (!current(ctx)) return;
      if (result.outcome === "saved" && result.draft) {
        const latest = ctx.local;
        if (!latest || latest.draftId !== sent.draftId) return;
        const next = { ...latest, baseVersion: result.draft.version,
          syncedEditedAt: latest === sent ? sent.editedAt : latest.syncedEditedAt };
        ctx.local = next;
        ctx.baseVersion = next.baseVersion;
        writeLocalEditorDraft(next);
        setStatus(next.editedAt === next.syncedEditedAt ? "saved" : "pending");
      } else if (result.outcome === "conflict" || result.outcome === "gone") {
        // Refetch authoritative metadata, not a client clock or an assumed deletion.
        const meta = (await fetchDraftMetadata(ctx.locale))
          .find((entry) => entry.contextKey === ctx.contextKey);
        if (!current(ctx)) return;
        if (!meta) return;
        if (meta.status !== "active" && meta.draftId === sent.draftId) {
          reset(ctx);
          ctx.baseVersion = meta.version;
        } else if (meta.status !== "active") {
          const latest = ctx.local;
          if (latest) updateConflict(ctx, { local: latest, server: metadataAsRemote(meta) });
        } else {
          const remote = await fetchDraftContent(ctx.locale, ctx.contextKey);
          if (!current(ctx) || !remote) return;
          const latest = ctx.local;
          if (latest) updateConflict(ctx, { local: latest, server: remote });
          else applyRemote(ctx, remote);
        }
      }
    } catch { if (current(ctx) && !ctx.conflict) setStatus("pending"); }
    finally { ctx.syncing = false; }
  }

  function noteEdit(body: string, immediate = false) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx)) return;
    ctx.body = body;
    ctx.hasInput = true;
    if (immediate || /\s$/u.test(body) || body.length === 0) capture(ctx);
  }
  function saveLocal() {
    const ctx = runtimeRef.current;
    if (ctx) capture(ctx);
  }
  function chooseVersion(which: "local" | "server") {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || !ctx.conflict) return;
    const conflictNow = ctx.conflict;
    if (which === "server") {
      if (conflictNow.server.status === "active") applyRemote(ctx, conflictNow.server);
      else { reset(ctx); ctx.baseVersion = conflictNow.server.version; }
    } else {
      // Explicit selection is the only way to replace another generation.
      const local = conflictNow.local;
      const next = { ...local, baseVersion: conflictNow.server.version,
        draftId: conflictNow.server.status === "active" ? conflictNow.server.draftId : local.draftId };
      ctx.local = next;
      ctx.baseVersion = next.baseVersion;
      ctx.draftId = next.draftId;
      ctx.body = next.payload.body;
      ctx.hasInput = false;
      writeLocalEditorDraft(next);
      setDraftId(next.draftId);
      callbacksRef.current.restore(next.payload);
      setStatus("pending");
    }
    updateConflict(ctx, null);
  }

  useEffect(() => {
    if (!identity || !ownerId || !contextKey || !locale) {
      runtimeRef.current = null;
      setStatus("idle");
      setConflict(null);
      return;
    }
    const ctx: Runtime = {
      identity, ownerId, contextKey, locale, draftId: crypto.randomUUID(),
      local: null, body: "", hasInput: false, baseVersion: 0, conflict: null,
      syncing: false, reading: false, disposed: false,
    };
    runtimeRef.current = ctx;
    setDraftId(ctx.draftId);
    setConflict(null);
    setStatus("idle");
    const local = readLocalEditorDraft(ownerId, contextKey);
    if (local) {
      ctx.local = local;
      ctx.draftId = local.draftId;
      ctx.baseVersion = local.baseVersion;
      ctx.body = local.payload.body;
      setDraftId(local.draftId);
      callbacksRef.current.restore(local.payload);
      setStatus("restored");
    }
    void checkRemote(ctx);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") capture(ctx);
      else void checkRemote(ctx);
    };
    const onPageHide = () => capture(ctx);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== draftStorageKey(ownerId, contextKey)) return;
      const other = readLocalEditorDraft(ownerId, contextKey);
      if (!other) { void checkRemote(ctx); return; }
      if (!ctx.local || ctx.local.editedAt === ctx.local.syncedEditedAt) {
        ctx.local = other;
        ctx.body = other.payload.body;
        ctx.baseVersion = other.baseVersion;
        ctx.draftId = other.draftId;
        ctx.hasInput = false;
        callbacksRef.current.restore(other.payload);
        setDraftId(other.draftId);
        setStatus("restored");
      } else if (other.draftId !== ctx.local.draftId
        || JSON.stringify(other.payload) !== JSON.stringify(ctx.local.payload)) {
        updateConflict(ctx, { local: ctx.local, server: {
          contextKey, draftId: other.draftId, version: other.baseVersion,
          status: "active", editedAt: other.editedAt, updatedAt: other.editedAt,
          title: other.payload.title, snippet: other.payload.body.slice(0, 140),
          payload: other.payload,
        } });
      }
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onVisibility);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => {
      void sync(ctx).then(() => checkRemote(ctx));
    }, 60_000);
    return () => {
      // Capture the old owner/context before discarding its runtime.
      capture(ctx);
      ctx.disposed = true;
      if (runtimeRef.current === ctx) runtimeRef.current = null;
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("online", onVisibility);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // The runtime is intentionally scoped to one owner + form identity.
  }, [identity]);

  const labels: Record<Status, string> = {
    idle: "", saved: t("editorDraftSaved"), pending: t("editorDraftPending"),
    saving: t("editorDraftSaving"), restored: t("editorDraftRestored"),
    conflict: t("editorDraftConflict"), error: t("editorDraftLocalError"),
  };
  return {
    noteEdit, saveLocal, draftId,
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
