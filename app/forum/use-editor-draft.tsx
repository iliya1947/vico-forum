import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ForumEditorDraftPayload } from "../../db/schema";
import {
  clearLocalEditorDraft, draftStorageKey, fetchDraftContent, fetchDraftMetadata,
  mutateDraft, readLocalEditorDraft, writeLocalEditorDraft,
  DraftMutationRejectedError,
  type DraftMetadata, type DraftRemote, type LocalEditorDraft,
} from "./draft-client";

interface Props {
  ownerId: string | null;
  contextKey: string | undefined;
  locale: string | undefined;
  initialPayload: ForumEditorDraftPayload;
  restore(payload: ForumEditorDraftPayload): void;
}
type Status = "idle" | "saved" | "pending" | "saving" | "restored" | "conflict" | "error";
type Conflict = { local: LocalEditorDraft; server: DraftRemote | DraftMetadata };
type Runtime = {
  identity: string;
  ownerId: string;
  contextKey: string;
  locale: string;
  draftId: string;
  local: LocalEditorDraft | null;
  payload: ForumEditorDraftPayload;
  hasInput: boolean;
  startVersion: number;
  conflict: Conflict | null;
  rejectedSyncEditedAt: string | null;
  syncing: boolean;
  reading: boolean;
  disposed: boolean;
  epoch: number;
  serverCycle: Promise<void> | null;
  publishing: boolean;
};

const blank = (): ForumEditorDraftPayload => ({ body: "", title: "", tags: "" });

export function useEditorDraft({ ownerId, contextKey, locale, initialPayload, restore }: Props) {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<Status>("idle");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const runtimeRef = useRef<Runtime | null>(null);
  const callbacksRef = useRef({ restore });
  callbacksRef.current = { restore };
  const identity = ownerId && contextKey && locale ? JSON.stringify([ownerId, contextKey, locale]) : null;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  function current(ctx: Runtime) {
    return !ctx.disposed && runtimeRef.current === ctx && identityRef.current === ctx.identity;
  }
  function currentAt(ctx: Runtime, epoch: number) {
    return current(ctx) && ctx.epoch === epoch;
  }
  function updateConflict(ctx: Runtime, next: Conflict | null) {
    if (!current(ctx)) return;
    ctx.conflict = next;
    setConflict(next);
    if (next) setStatus("conflict");
  }
  function capture(ctx: Runtime, final = false) {
    if (final ? ctx.disposed : !current(ctx)) return;
    const payload = ctx.payload;
    const previous = ctx.local;
    if (!previous && !payload.body.trim() && !payload.title.trim() && !payload.tags.trim()) return;
    if (previous && JSON.stringify(previous.payload) === JSON.stringify(payload)) { ctx.hasInput = false; return; }
    const next: LocalEditorDraft = {
      ownerId: ctx.ownerId, contextKey: ctx.contextKey,
      draftId: previous?.draftId ?? ctx.draftId,
      payload: { ...payload }, editedAt: new Date().toISOString(),
      baseVersion: previous?.baseVersion ?? ctx.startVersion,
      syncedEditedAt: previous?.syncedEditedAt ?? null,
    };
    if (!writeLocalEditorDraft(next)) {
      if (!final && current(ctx)) setStatus("error");
      return;
    }
    ctx.local = next;
    ctx.hasInput = false;
    if (final) return;
    if (ctx.conflict) updateConflict(ctx, { ...ctx.conflict, local: next });
    else setStatus("pending");
  }
  function reset(ctx: Runtime, startVersion = 0) {
    if (!current(ctx)) return;
    ctx.epoch++;
    clearLocalEditorDraft(ctx.ownerId, ctx.contextKey);
    ctx.local = null;
    ctx.payload = blank();
    ctx.hasInput = false;
    ctx.syncing = false;
    ctx.reading = false;
    ctx.publishing = false;
    ctx.startVersion = startVersion;
    ctx.draftId = crypto.randomUUID();
    ctx.conflict = null;
    ctx.rejectedSyncEditedAt = null;
    callbacksRef.current.restore(blank());
    setDraftId(ctx.draftId);
    setExpectedVersion(startVersion);
    setConflict(null);
    setStatus("idle");
  }
  function applyRemote(ctx: Runtime, remote: DraftRemote) {
    if (!current(ctx)) return;
    const next: LocalEditorDraft = {
      ownerId: ctx.ownerId, contextKey: ctx.contextKey, draftId: remote.draftId,
      editedAt: remote.editedAt,
      baseVersion: remote.version, syncedEditedAt: remote.editedAt,
      payload: remote.payload,
    };
    if (!writeLocalEditorDraft(next)) { setStatus("error"); return; }
    ctx.local = next;
    ctx.draftId = remote.draftId;
    ctx.payload = { ...remote.payload };
    ctx.hasInput = false;
    ctx.rejectedSyncEditedAt = null;
    setDraftId(remote.draftId);
    setExpectedVersion(remote.version);
    callbacksRef.current.restore(remote.payload);
    setStatus("restored");
  }

  async function checkRemote(ctx: Runtime) {
    if (!current(ctx) || ctx.syncing || ctx.reading || ctx.conflict) return;
    const epoch = ctx.epoch;
    ctx.reading = true;
    try {
      const meta = (await fetchDraftMetadata(ctx.locale))
        .find((entry) => entry.contextKey === ctx.contextKey);
      if (!currentAt(ctx, epoch)) return;
      if (ctx.hasInput) capture(ctx); // Never overwrite unpersisted typing on a late fetch.
      const local = ctx.local;
      if (!meta) return;
      if (meta.status !== "active") {
        if (local?.draftId === meta.draftId) {
          reset(ctx, meta.version); // Same generation was published/deleted elsewhere.
        } else if (local?.baseVersion === meta.version) {
          // This is a new generation explicitly based on the terminal marker.
          ctx.startVersion = meta.version;
          setExpectedVersion(meta.version);
        } else if (local) {
          // Different instance without the terminal CAS base is ambiguous.
          updateConflict(ctx, { local, server: meta });
        } else {
          // New input in this form can start a fresh generation at the next 60s sync.
          ctx.startVersion = meta.version;
          setExpectedVersion(meta.version);
        }
        return;
      }
      if (local && meta.version === local.baseVersion && meta.draftId === local.draftId) return;
      const remote = await fetchDraftContent(ctx.locale, ctx.contextKey);
      if (!currentAt(ctx, epoch) || !remote) return;
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
        ctx.draftId = remote.draftId;
        setDraftId(remote.draftId);
        setExpectedVersion(remote.version);
        writeLocalEditorDraft(next);
        setStatus("saved");
        return;
      }
      updateConflict(ctx, { local: latest, server: remote });
    } catch {
      if (currentAt(ctx, epoch) && ctx.local && !ctx.conflict) setStatus("pending");
    } finally {
      if (ctx.epoch === epoch) ctx.reading = false;
    }
  }

  async function sync(ctx: Runtime) {
    if (!current(ctx) || ctx.syncing || ctx.reading || ctx.conflict) return;
    const sent = ctx.local;
    if (
      !sent
      || sent.editedAt === sent.syncedEditedAt
      || sent.editedAt === ctx.rejectedSyncEditedAt
    ) return;
    const epoch = ctx.epoch;
    ctx.syncing = true;
    setStatus("saving");
    try {
      const result = await mutateDraft(ctx.locale, {
        intent: "save", contextKey: ctx.contextKey, draftId: sent.draftId,
        payload: sent.payload, expectedVersion: sent.baseVersion,
      });
      if (!currentAt(ctx, epoch)) return;
      if (result.outcome === "saved" && result.draft) {
        const latest = ctx.local;
        if (!latest || latest.draftId !== sent.draftId) return;
        const next = { ...latest, baseVersion: result.draft.version,
          syncedEditedAt: latest === sent ? sent.editedAt : latest.syncedEditedAt };
        ctx.local = next;
        ctx.rejectedSyncEditedAt = null;
        writeLocalEditorDraft(next);
        setExpectedVersion(result.draft.version);
        setStatus(next.editedAt === next.syncedEditedAt ? "saved" : "pending");
      } else if (result.outcome === "conflict" || result.outcome === "gone") {
        ctx.rejectedSyncEditedAt = null;
        // Refetch authoritative metadata, not a client clock or an assumed deletion.
        const meta = (await fetchDraftMetadata(ctx.locale))
          .find((entry) => entry.contextKey === ctx.contextKey);
        if (!currentAt(ctx, epoch)) return;
        if (!meta) return;
        if (meta.status !== "active" && meta.draftId === sent.draftId) {
          reset(ctx, meta.version);
        } else if (meta.status !== "active") {
          const latest = ctx.local;
          if (latest) updateConflict(ctx, { local: latest, server: meta });
        } else {
          const remote = await fetchDraftContent(ctx.locale, ctx.contextKey);
          if (!currentAt(ctx, epoch) || !remote) return;
          const latest = ctx.local;
          if (latest) updateConflict(ctx, { local: latest, server: remote });
          else applyRemote(ctx, remote);
        }
      }
    } catch (error) {
      if (currentAt(ctx, epoch) && !ctx.conflict) {
        if (error instanceof DraftMutationRejectedError) {
          ctx.rejectedSyncEditedAt = sent.editedAt;
          setStatus("error");
        } else {
          setStatus("pending");
        }
      }
    }
    finally {
      if (ctx.epoch === epoch) ctx.syncing = false;
    }
  }

  function runServerCycle(ctx: Runtime) {
    if (!current(ctx) || ctx.publishing) return Promise.resolve();
    if (ctx.serverCycle) return ctx.serverCycle;
    const task = (async () => {
      await sync(ctx);
      await checkRemote(ctx);
    })();
    ctx.serverCycle = task;
    void task.then(
      () => { if (ctx.serverCycle === task) ctx.serverCycle = null; },
      () => { if (ctx.serverCycle === task) ctx.serverCycle = null; },
    );
    return task;
  }

  async function preparePublication() {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || ctx.conflict) return null;
    const epoch = ctx.epoch;
    ctx.publishing = true;
    const inFlight = ctx.serverCycle;
    if (inFlight) {
      try {
        await inFlight;
      } catch {
        if (currentAt(ctx, epoch)) {
          ctx.publishing = false;
          setStatus(ctx.local ? "pending" : "idle");
        }
        return null;
      }
    }
    if (!currentAt(ctx, epoch) || ctx.conflict) {
      if (current(ctx)) ctx.publishing = false;
      return null;
    }
    if (ctx.hasInput) capture(ctx);
    const local = ctx.local;
    return {
      draftId: local?.draftId ?? ctx.draftId,
      expectedVersion: local?.baseVersion ?? ctx.startVersion,
    };
  }

  function releasePublication() {
    const ctx = runtimeRef.current;
    if (ctx && current(ctx)) ctx.publishing = false;
  }

  function noteEdit(body: string, immediate = false) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx)) return;
    ctx.payload = { ...ctx.payload, body };
    ctx.hasInput = true;
    if (immediate || /\s$/u.test(body) || body.length === 0) capture(ctx);
  }
  function noteFields(patch: Partial<Omit<ForumEditorDraftPayload, "body">>, immediate = false) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx)) return;
    ctx.payload = { ...ctx.payload, ...patch };
    ctx.hasInput = true;
    if (immediate) capture(ctx);
  }
  function seedFields(patch: Partial<Omit<ForumEditorDraftPayload, "body">>) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || ctx.local || ctx.hasInput) return;
    ctx.payload = { ...ctx.payload, ...patch };
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
      if ("payload" in conflictNow.server) applyRemote(ctx, conflictNow.server);
      else reset(ctx, conflictNow.server.version);
    } else {
      // Explicit selection is the only way to replace another generation.
      const local = conflictNow.local;
      const next = { ...local, baseVersion: conflictNow.server.version, syncedEditedAt: null,
        draftId: conflictNow.server.status === "active" ? conflictNow.server.draftId : local.draftId };
      ctx.local = next;
      ctx.draftId = next.draftId;
      ctx.payload = { ...next.payload };
      ctx.hasInput = false;
      ctx.rejectedSyncEditedAt = null;
      writeLocalEditorDraft(next);
      setDraftId(next.draftId);
      setExpectedVersion(next.baseVersion);
      callbacksRef.current.restore(next.payload);
      setStatus("pending");
    }
    updateConflict(ctx, null);
  }

  function acknowledgePublished(publishedDraftId: string, publishedVersion: number) {
    const ctx = runtimeRef.current;
    if (
      !ctx
      || !current(ctx)
      || !Number.isSafeInteger(publishedVersion)
      || publishedVersion < 1
      || (ctx.local?.draftId ?? ctx.draftId) !== publishedDraftId
    ) return;
    reset(ctx, publishedVersion);
  }

  useEffect(() => {
    if (!identity || !ownerId || !contextKey || !locale) {
      runtimeRef.current = null;
      setStatus("idle");
      setConflict(null);
      setReady(false);
      return;
    }
    const ctx: Runtime = {
      identity, ownerId, contextKey, locale, draftId: crypto.randomUUID(),
      local: null, payload: { ...initialPayload }, hasInput: false, startVersion: 0, conflict: null,
      rejectedSyncEditedAt: null,
      syncing: false, reading: false, disposed: false, epoch: 0,
      serverCycle: null, publishing: false,
    };
    runtimeRef.current = ctx;
    setDraftId(ctx.draftId);
    setExpectedVersion(0);
    setConflict(null);
    setStatus("idle");
    setReady(false);
    const local = readLocalEditorDraft(ownerId, contextKey);
    if (local) {
      ctx.local = local;
      ctx.draftId = local.draftId;
      ctx.payload = { ...local.payload };
      setDraftId(local.draftId);
      setExpectedVersion(local.baseVersion);
      callbacksRef.current.restore(local.payload);
      setStatus("restored");
    }
    void checkRemote(ctx).finally(() => {
      if (current(ctx)) setReady(true);
    });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") capture(ctx);
      else void checkRemote(ctx);
    };
    const onPageHide = () => capture(ctx);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== draftStorageKey(ownerId, contextKey)) return;
      const other = readLocalEditorDraft(ownerId, contextKey);
      if (!other) { reset(ctx); return; }
      // Storage events can arrive while this tab has unflushed typing.
      // Never restore the other tab over that still-live editor buffer.
      if (ctx.hasInput) capture(ctx);
      if (!ctx.local || ctx.local.editedAt === ctx.local.syncedEditedAt) {
        ctx.local = other;
        ctx.payload = { ...other.payload };
        ctx.draftId = other.draftId;
        ctx.hasInput = false;
        ctx.rejectedSyncEditedAt = null;
        callbacksRef.current.restore(other.payload);
        setDraftId(other.draftId);
        setExpectedVersion(other.baseVersion);
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
      void runServerCycle(ctx);
    }, 60_000);
    return () => {
      // Capture the old owner/context before discarding its runtime.
      capture(ctx, true);
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
  const conflictRemotePayload = conflict && "payload" in conflict.server ? conflict.server.payload : null;
  const conflictTitleLabel = contextKey === "help:new"
    ? t("helpSolutionsQuestionTitleLabel")
    : t("topicTitleLabel");
  const renderConflictPayload = (
    payload: ForumEditorDraftPayload,
    other: ForumEditorDraftPayload,
  ) => (
    <>
      {payload.title || other.title ? <p><strong>{conflictTitleLabel}:</strong> {payload.title || "—"}</p> : null}
      {payload.tags || other.tags ? <p><strong>{t("topicTagsLabel")}:</strong> {payload.tags || "—"}</p> : null}
      {payload.parentPostId || other.parentPostId
        ? <p><strong>{t("replyToMessage")}:</strong> {payload.parentPostId || "—"}</p>
        : null}
      <pre>{payload.body}</pre>
    </>
  );
  return {
    noteEdit, noteFields, seedFields, saveLocal, draftId, expectedVersion, ready, acknowledgePublished,
    preparePublication, releasePublication,
    element: ownerId && contextKey ? (
      <div className="markdown-editor-draft-state" aria-live="polite">
        <span>{labels[status]}</span>
        {conflict ? <div className="markdown-editor-draft-conflict" role="group" aria-label={t("editorDraftConflict")}>
          <p>{t("editorDraftConflict")}</p>
          <div className="markdown-editor-draft-versions">
            <section>
              <strong>{t("editorDraftThisDevice")}</strong>
              {conflictRemotePayload
                ? renderConflictPayload(conflict.local.payload, conflictRemotePayload)
                : <pre>{conflict.local.payload.body}</pre>}
            </section>
            <section>
              <strong>{t("editorDraftOtherDevice")}</strong>
              {conflictRemotePayload
                ? renderConflictPayload(conflictRemotePayload, conflict.local.payload)
                : <pre>{t("editorDraftNoRemoteVersion")}</pre>}
            </section>
          </div>
          <button type="button" onClick={() => chooseVersion("local")}>{t("editorDraftKeepLocal")}</button>
          <button type="button" onClick={() => chooseVersion("server")}>{t("editorDraftKeepServer")}</button>
        </div> : null}
      </div>
    ) : null,
  };
}
