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
  syncPromise: Promise<boolean> | null;
  syncUncertain: boolean;
  submissionPaused: boolean;
  reading: boolean;
  disposed: boolean;
  epoch: number;
};

const blank = (): ForumEditorDraftPayload => ({ body: "", title: "", tags: "" });
const samePayload = (left: ForumEditorDraftPayload, right: ForumEditorDraftPayload) =>
  JSON.stringify(left) === JSON.stringify(right);

export function useEditorDraft({ ownerId, contextKey, locale, initialPayload, restore }: Props) {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<Status>("idle");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());
  const [expectedVersion, setExpectedVersion] = useState(0);
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
    if (previous && samePayload(previous.payload, payload)) { ctx.hasInput = false; return; }
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
    ctx.syncPromise = null;
    ctx.syncUncertain = false;
    ctx.submissionPaused = false;
    ctx.reading = false;
    ctx.startVersion = startVersion;
    ctx.draftId = crypto.randomUUID();
    ctx.conflict = null;
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
    ctx.syncUncertain = false;
    setDraftId(remote.draftId);
    setExpectedVersion(remote.version);
    callbacksRef.current.restore(remote.payload);
    setStatus("restored");
  }

  async function checkRemote(ctx: Runtime) {
    if (!current(ctx) || ctx.syncPromise || ctx.submissionPaused || ctx.reading || ctx.conflict) return;
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

  async function syncOnce(ctx: Runtime): Promise<boolean> {
    if (!current(ctx) || ctx.reading || ctx.conflict || ctx.submissionPaused) return false;
    const sent = ctx.local;
    if (!sent || sent.editedAt === sent.syncedEditedAt) {
      ctx.syncUncertain = false;
      return true;
    }
    const epoch = ctx.epoch;
    setStatus("saving");
    try {
      const result = await mutateDraft(ctx.locale, {
        intent: "save", contextKey: ctx.contextKey, draftId: sent.draftId,
        payload: sent.payload, expectedVersion: sent.baseVersion,
      });
      if (!currentAt(ctx, epoch)) return false;
      ctx.syncUncertain = false;
      if (result.outcome === "saved" && result.draft) {
        const latest = ctx.local;
        if (!latest || latest.draftId !== sent.draftId) return false;
        const next = { ...latest, baseVersion: result.draft.version,
          syncedEditedAt: latest === sent ? sent.editedAt : latest.syncedEditedAt };
        ctx.local = next;
        writeLocalEditorDraft(next);
        setExpectedVersion(result.draft.version);
        setStatus(next.editedAt === next.syncedEditedAt ? "saved" : "pending");
        return true;
      }
      if (result.outcome === "conflict" || result.outcome === "gone") {
        const meta = (await fetchDraftMetadata(ctx.locale))
          .find((entry) => entry.contextKey === ctx.contextKey);
        if (!currentAt(ctx, epoch)) return false;
        if (!meta) return false;
        if (meta.status !== "active" && meta.draftId === sent.draftId) {
          reset(ctx, meta.version);
        } else if (meta.status !== "active") {
          const latest = ctx.local;
          if (latest) updateConflict(ctx, { local: latest, server: meta });
        } else {
          const remote = await fetchDraftContent(ctx.locale, ctx.contextKey);
          if (!currentAt(ctx, epoch) || !remote) return false;
          const latest = ctx.local;
          if (latest) updateConflict(ctx, { local: latest, server: remote });
          else applyRemote(ctx, remote);
        }
      }
      return false;
    } catch {
      if (currentAt(ctx, epoch) && !ctx.conflict) {
        ctx.syncUncertain = true;
        setStatus("pending");
      }
      return false;
    }
  }

  function startSync(ctx: Runtime): Promise<boolean> | null {
    if (!current(ctx) || ctx.reading || ctx.conflict || ctx.submissionPaused) return null;
    if (ctx.syncPromise) return ctx.syncPromise;
    const running = syncOnce(ctx).finally(() => {
      if (ctx.syncPromise === running) ctx.syncPromise = null;
    });
    ctx.syncPromise = running;
    return running;
  }

  function patchPayload(patch: Partial<ForumEditorDraftPayload>, immediate = false) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx)) return;
    const next = { ...ctx.payload, ...patch };
    if (samePayload(ctx.payload, next)) {
      if (immediate) capture(ctx);
      return;
    }
    ctx.payload = next;
    ctx.hasInput = true;
    ctx.submissionPaused = false;
    if (immediate) capture(ctx);
  }
  function noteEdit(body: string, immediate = false) {
    patchPayload({ body }, immediate);
  }
  function noteFields(patch: Partial<Omit<ForumEditorDraftPayload, "body">>, immediate = false) {
    patchPayload(patch, immediate);
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
  function beginSubmission(): Promise<boolean> | null {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx)) return null;
    if (ctx.conflict || ctx.syncUncertain) return Promise.resolve(false);
    ctx.submissionPaused = true;
    capture(ctx);
    const pending = ctx.syncPromise;
    if (!pending) return null;
    return pending.then((settled) => {
      if (!current(ctx) || !settled || ctx.conflict || ctx.syncUncertain) {
        if (current(ctx)) ctx.submissionPaused = false;
        return false;
      }
      return true;
    });
  }
  function resumeSubmission() {
    const ctx = runtimeRef.current;
    if (ctx && current(ctx)) ctx.submissionPaused = false;
  }
  function publicationFence() {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx)) return null;
    return {
      draftId: ctx.local?.draftId ?? ctx.draftId,
      expectedVersion: ctx.local?.baseVersion ?? ctx.startVersion,
    };
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
      ctx.syncUncertain = false;
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
      return;
    }
    const ctx: Runtime = {
      identity, ownerId, contextKey, locale, draftId: crypto.randomUUID(),
      local: null, payload: { ...initialPayload }, hasInput: false, startVersion: 0, conflict: null,
      syncPromise: null, syncUncertain: false, submissionPaused: false,
      reading: false, disposed: false, epoch: 0,
    };
    runtimeRef.current = ctx;
    setDraftId(ctx.draftId);
    setExpectedVersion(0);
    setConflict(null);
    setStatus("idle");
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
    void checkRemote(ctx);
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
      const running = startSync(ctx);
      if (running) void running.then((settled) => {
        if (settled) void checkRemote(ctx);
      });
      else void checkRemote(ctx);
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
  return {
    noteEdit, noteFields, seedFields, saveLocal, beginSubmission, resumeSubmission,
    publicationFence, draftId, expectedVersion, acknowledgePublished,
    element: ownerId && contextKey ? (
      <div className="markdown-editor-draft-state" aria-live="polite">
        <span>{labels[status]}</span>
        {conflict ? <div className="markdown-editor-draft-conflict" role="group" aria-label={t("editorDraftConflict")}>
          <p>{t("editorDraftConflict")}</p>
          <div className="markdown-editor-draft-versions">
            <section><strong>{t("editorDraftThisDevice")}</strong><pre>{conflict.local.payload.body}</pre></section>
            <section><strong>{t("editorDraftOtherDevice")}</strong><pre>{"payload" in conflict.server ? conflict.server.payload.body : t("editorDraftNoRemoteVersion")}</pre></section>
          </div>
          <button type="button" onClick={() => chooseVersion("local")}>{t("editorDraftKeepLocal")}</button>
          <button type="button" onClick={() => chooseVersion("server")}>{t("editorDraftKeepServer")}</button>
        </div> : null}
      </div>
    ) : null,
  };
}
