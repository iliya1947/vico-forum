import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { keptAttachmentSelection, sameDraftText } from "./draft-snapshot";
import type { ForumEditorDraftPayload } from "../../db/schema";
import {
  clearLocalEditorDraft, draftStorageKey, fetchDraftContent, fetchDraftMetadata,
  mutateDraft, readLocalEditorDraft, writeLocalEditorDraft, fetchDraftHead, DRAFT_LIFETIME_MS,
  DraftMutationRejectedError,
  type DraftMetadata, type DraftRemote, type LocalEditorDraft, type PendingDraftAttachment,
} from "./draft-client";

interface Props {
  ownerId: string | null;
  contextKey: string | undefined;
  locale: string | undefined;
  initialPayload: ForumEditorDraftPayload;
  restore(payload: ForumEditorDraftPayload): void;
}
type Status = "idle" | "saved" | "pending" | "saving" | "restored" | "conflict" | "error";
type Conflict = {
  local: LocalEditorDraft;
  server: DraftRemote | DraftMetadata | null;
  localCandidate?: LocalEditorDraft;
};
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
  resolving: boolean;
  reading: boolean;
  disposed: boolean;
  epoch: number;
  serverCycle: Promise<void> | null;
  publishing: boolean;
  attachmentVerified: boolean;
  serverHead: DraftRemote | DraftMetadata | null;
  mutations: Promise<unknown>;
  readToken: object | null;
  mutating: boolean;
};

const blank = (): ForumEditorDraftPayload => ({ body: "", title: "", tags: "" });

export function useEditorDraft({ ownerId, contextKey, locale, initialPayload, restore }: Props) {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<Status>("idle");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [attachmentReady, setAttachmentReady] = useState(false);
  const [attachmentSnapshotEstablished, setAttachmentSnapshotEstablished] = useState(false);
  const [attachmentRebindFrom, setAttachmentRebindFrom] = useState<string | null>(null);
  const [attachmentRebindVersion, setAttachmentRebindVersion] = useState<number | null>(null);
  const [attachmentRevision, setAttachmentRevision] = useState(0);
  const [attachmentSelectionEpoch, setAttachmentSelectionEpoch] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<PendingDraftAttachment[]>([]);
  const runtimeRef = useRef<Runtime | null>(null);
  const callbacksRef = useRef({ restore });
  callbacksRef.current = { restore };
  const identity = ownerId && contextKey && locale ? JSON.stringify([ownerId, contextKey, locale]) : null;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  function samePayload(a: ForumEditorDraftPayload, b: ForumEditorDraftPayload) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    return keys.every((key) => JSON.stringify(a[key as keyof typeof a]) === JSON.stringify(b[key as keyof typeof b]));
  }
  function current(ctx: Runtime) {
    return !ctx.disposed && runtimeRef.current === ctx && identityRef.current === ctx.identity;
  }
  function currentAt(ctx: Runtime, epoch: number) {
    return current(ctx) && ctx.epoch === epoch;
  }
  function expireLocal(ctx: Runtime, final = false): boolean {
    if (!ctx.local || Date.now() - Date.parse(ctx.local.editedAt) < DRAFT_LIFETIME_MS) return false;
    clearLocalEditorDraft(ctx.ownerId, ctx.contextKey);
    if (final) { ctx.local = null; ctx.payload = blank(); ctx.hasInput = false; }
    else { reset(ctx, ctx.serverHead?.version ?? ctx.startVersion); void checkRemote(ctx); }
    return true;
  }
  function enqueue<T>(ctx: Runtime, operation: () => Promise<T>): Promise<T | undefined> {
    const epoch = ctx.epoch;
    const task = ctx.mutations.then(async () => {
      if (!currentAt(ctx, epoch)) return undefined;
      // Reads never block a user decision. Invalidate an older read before the
      // ordered mutation; its eventual response cannot replace the new state.
      ctx.readToken = null;
      ctx.reading = false;
      ctx.mutating = true;
      try { return await operation(); } finally { ctx.mutating = false; }
    });
    ctx.mutations = task.catch(() => {});
    return task;
  }
  function setAttachmentVerified(ctx: Runtime, verified: boolean) {
    if (!current(ctx)) return;
    ctx.attachmentVerified = verified;
    setAttachmentSnapshotEstablished(ctx.serverHead?.status === "active" && ctx.serverHead.draftId === ctx.draftId);
    const attachmentDraftId = ctx.local?.attachmentDraftId;
    const rebindFrom = !ctx.conflict
      && attachmentDraftId && attachmentDraftId !== ctx.draftId
      ? attachmentDraftId
      : null;
    setAttachmentRebindFrom(rebindFrom);
    // Only move refs after the selected text has reached its regular CAS save.
    // Waiting for R2 must never suspend that 60-second save cycle.
    setAttachmentRebindVersion(verified && rebindFrom && ctx.local
      && ctx.local.editedAt === ctx.local.syncedEditedAt ? ctx.local.baseVersion : null);
    setAttachmentReady(verified && !ctx.conflict && rebindFrom === null);
    if (verified && !ctx.conflict) setAttachmentRevision((value) => value + 1);
  }
  function updateConflict(ctx: Runtime, next: Conflict | null) {
    if (!current(ctx)) return;
    ctx.conflict = next;
    setConflict(next);
    if (next) {
      setAttachmentVerified(ctx, false);
      setStatus("conflict");
    }
  }
  function capture(ctx: Runtime, final = false) {
    if (final ? ctx.disposed : !current(ctx)) return;
    if (expireLocal(ctx, final)) return;
    // Mount/StrictMode cleanup must not turn the published source into a local
    // edit before metadata establishes its CAS base. Only capture actual input.
    if (!ctx.hasInput) return;
    const payload = ctx.payload;
    const previous = ctx.local;
    if (!previous && !payload.body.trim() && !payload.title.trim() && !payload.tags.trim()
      && !(ctx.hasInput && (payload.retainedAttachmentIds !== undefined
        || payload.draftAttachmentIds !== undefined))) return;
    if (previous && JSON.stringify(previous.payload) === JSON.stringify(payload)) { ctx.hasInput = false; return; }
    const next: LocalEditorDraft = {
      ownerId: ctx.ownerId, contextKey: ctx.contextKey,
      draftId: previous?.draftId ?? ctx.draftId,
      payload: { ...payload }, editedAt: new Date().toISOString(),
      baseVersion: previous?.baseVersion ?? ctx.startVersion,
      syncedEditedAt: previous?.syncedEditedAt ?? null,
      attachmentDraftId: previous?.attachmentDraftId,
      basePayload: previous?.basePayload ?? (ctx.serverHead && "payload" in ctx.serverHead ? ctx.serverHead.payload : undefined),
      pendingAttachments: previous?.pendingAttachments,
      selectionIntent: previous?.selectionIntent,
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
    setAttachmentVerified(ctx, false);
    clearLocalEditorDraft(ctx.ownerId, ctx.contextKey);
    ctx.local = null;
    setPendingAttachments([]);
    ctx.payload = blank();
    ctx.hasInput = false;
    ctx.syncing = false;
    ctx.reading = false;
    ctx.publishing = false;
    ctx.startVersion = startVersion;
    ctx.draftId = crypto.randomUUID();
    ctx.conflict = null;
    setAttachmentVerified(ctx, false);
    ctx.rejectedSyncEditedAt = null;
    callbacksRef.current.restore(blank());
    setDraftId(ctx.draftId);
    setExpectedVersion(startVersion);
    setConflict(null);
    setStatus("idle");
  }
  function applyRemote(
    ctx: Runtime,
    remote: DraftRemote,
    discardLocalAttachments = false,
    localCandidate?: LocalEditorDraft,
  ): boolean {
    if (!current(ctx)) return false;
    const next: LocalEditorDraft = {
      ownerId: ctx.ownerId, contextKey: ctx.contextKey, draftId: remote.draftId,
      editedAt: localCandidate ? new Date().toISOString() : remote.editedAt,
      baseVersion: remote.version, syncedEditedAt: localCandidate ? null : remote.editedAt,
      payload: remote.payload,
      basePayload: remote.payload,
      // Keep the chosen tab's provenance; a cache snapshot is not a server ACK.
      // A clean server refresh retains provenance within the same generation.
      attachmentDraftId: localCandidate
        ? localCandidate.attachmentDraftId
        : !discardLocalAttachments && ctx.local?.draftId === remote.draftId
          ? ctx.local.attachmentDraftId : undefined,
    };
    if (!writeLocalEditorDraft(next)) { setStatus("error"); return false; }
    ctx.local = next;
    setPendingAttachments([]);
    ctx.draftId = remote.draftId;
    ctx.payload = { ...remote.payload };
    ctx.hasInput = false;
    ctx.rejectedSyncEditedAt = null;
    ctx.serverHead = remote;
    setDraftId(remote.draftId);
    setExpectedVersion(remote.version);
    callbacksRef.current.restore(remote.payload);
    setStatus(localCandidate ? "pending" : "restored");
    return true;
  }

  function checkRemote(ctx: Runtime) { return checkRemoteNow(ctx); }
  async function checkRemoteNow(ctx: Runtime) {
    if (!current(ctx) || ctx.syncing || ctx.mutating || ctx.reading || ctx.conflict || ctx.publishing) return;
    expireLocal(ctx);
    const epoch = ctx.epoch;
    ctx.reading = true;
    const token = {};
    ctx.readToken = token;
    const readCurrent = () => currentAt(ctx, epoch) && ctx.readToken === token && !ctx.publishing;
    setAttachmentVerified(ctx, false);
    try {
      const listed = (await fetchDraftMetadata(ctx.locale))
        .find((entry) => entry.contextKey === ctx.contextKey);
      const meta = listed ?? await fetchDraftHead(ctx.locale, ctx.contextKey);
      if (!readCurrent()) return;
      if (ctx.serverHead?.version !== meta?.version || ctx.serverHead?.draftId !== meta?.draftId) {
        ctx.serverHead = meta ?? null;
      }
      if (!readCurrent()) return;
      if (ctx.hasInput) capture(ctx); // Never overwrite unpersisted typing on a late fetch.
      const local = ctx.local;
      if (!meta) { setAttachmentVerified(ctx, true); return; }
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
        if (!ctx.conflict) setAttachmentVerified(ctx, true);
        return;
      }
      if (local && meta.version === local.baseVersion && meta.draftId === local.draftId) {
        setAttachmentVerified(ctx, true);
        return;
      }
      const remote = listed ? await fetchDraftContent(ctx.locale, ctx.contextKey) : meta as DraftRemote;
      if (!readCurrent() || !remote) return;
      ctx.serverHead = remote;
      if (ctx.hasInput) capture(ctx);
      const latest = ctx.local;
      if (!latest) {
        if (applyRemote(ctx, remote)) setAttachmentVerified(ctx, true);
        return;
      }
      const intent = latest.selectionIntent;
      if (intent && intent.draftId === remote.draftId && remote.version === intent.expectedVersion + 1
        && latest.basePayload && sameDraftText(remote.payload, latest.basePayload)
        && JSON.stringify([...(remote.payload.draftAttachmentIds ?? [])].sort()) === JSON.stringify([...intent.attachmentIds].sort())) {
        // A reload/lost ACK may recover the exact own selection transition. Dirty
        // local text remains dirty; only the observed complete snapshot is a base.
        const next = { ...latest, baseVersion: remote.version, basePayload: remote.payload,
          selectionIntent: undefined,
          pendingAttachments: latest.pendingAttachments?.filter((item) => item.id !== intent.attachmentId) };
        if (!writeLocalEditorDraft(next)) { setStatus("error"); return; }
        ctx.local = next;
        ctx.startVersion = remote.version;
        setExpectedVersion(remote.version);
        setPendingAttachments(next.pendingAttachments ?? []);
        setAttachmentVerified(ctx, true);
        return;
      }
      const keep = latest.pendingAttachments?.length ? null
        : keptAttachmentSelection(latest.payload, remote.payload, latest.basePayload);
      if (keep) {
        let winner = remote;
        if (JSON.stringify(keep) !== JSON.stringify([...(remote.payload.draftAttachmentIds ?? [])].sort())) {
          const result = await enqueue(ctx, () => mutateDraft(ctx.locale, { intent: "attachments", contextKey: ctx.contextKey,
            draftId: remote.draftId, expectedVersion: remote.version,
            payload: { ...blank(), draftAttachmentIds: keep } }));
          if (!currentAt(ctx, epoch) || !result) return;
          if (result.outcome !== "saved" || !result.draft) {
            const head = await fetchDraftHead(ctx.locale, ctx.contextKey);
            if (currentAt(ctx, epoch)) updateConflict(ctx, { local: latest, server: head });
            return;
          }
          winner = result.draft;
        }
        if (applyRemote(ctx, winner)) setAttachmentVerified(ctx, true);
        return;
      }
      // Preserve attachment provenance even when the text copy is already clean.
      if (latest.attachmentDraftId && latest.draftId !== remote.draftId) {
        updateConflict(ctx, { local: latest, server: remote });
        return;
      }
      if (latest.draftId === remote.draftId && latest.editedAt === latest.syncedEditedAt) {
        if (applyRemote(ctx, remote)) setAttachmentVerified(ctx, true);
        return;
      }
      if (JSON.stringify(latest.payload) === JSON.stringify(remote.payload)) {
        const next = { ...latest, draftId: remote.draftId, baseVersion: remote.version,
          syncedEditedAt: latest.editedAt };
        if (!writeLocalEditorDraft(next)) { setStatus("error"); return; }
        ctx.local = next;
        ctx.draftId = remote.draftId;
        setDraftId(remote.draftId);
        setExpectedVersion(remote.version);
        setStatus("saved");
        setAttachmentVerified(ctx, true);
        return;
      }
      updateConflict(ctx, { local: latest, server: remote });
    } catch {
      if (readCurrent() && ctx.local && !ctx.conflict) setStatus("pending");
    } finally {
      if (ctx.readToken === token) { ctx.reading = false; ctx.readToken = null; }
    }
  }

  async function sync(ctx: Runtime) {
    if (!current(ctx) || ctx.syncing || ctx.reading || ctx.conflict) return;
    if (expireLocal(ctx)) return;
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
        payload: { ...sent.payload, draftAttachmentIds: sent.payload.draftAttachmentIds?.filter(
          (id) => !sent.pendingAttachments?.some((item) => item.id === id)) },
        expectedVersion: sent.baseVersion,
      });
      if (!currentAt(ctx, epoch) || ctx.conflict) return;
      if (result.outcome === "saved" && result.draft) {
        ctx.serverHead = result.draft;
        ctx.startVersion = result.draft.version;
        const latest = ctx.local;
        if (!latest || latest.draftId !== sent.draftId) return;
        const next = { ...latest, baseVersion: result.draft.version, basePayload: result.draft.payload,
          syncedEditedAt: latest === sent && !latest.pendingAttachments?.length ? sent.editedAt : latest.syncedEditedAt };
        ctx.local = next;
        ctx.rejectedSyncEditedAt = null;
        writeLocalEditorDraft(next);
        setExpectedVersion(result.draft.version);
        setStatus(next.editedAt === next.syncedEditedAt ? "saved" : "pending");
        // A successful versioned CAS also verifies the current generation.
        setAttachmentVerified(ctx, true);
      } else if (result.outcome === "conflict" || result.outcome === "gone") {
        ctx.rejectedSyncEditedAt = null;
        // Refetch authoritative metadata, not a client clock or an assumed deletion.
        const meta = await fetchDraftHead(ctx.locale, ctx.contextKey);
        ctx.serverHead = meta;
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
    const task = enqueue(ctx, () => sync(ctx)).then(() => checkRemote(ctx)).then(() => {});
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
    if (expireLocal(ctx)) return null;
    const epoch = ctx.epoch;
    ctx.publishing = true;
    const inFlight = ctx.mutations;
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
    if (ctx.local?.pendingAttachments?.length) { ctx.publishing = false; return null; }
    const selected = ctx.payload.draftAttachmentIds;
    const head = ctx.serverHead;
    const established = head?.status === "active" && "payload" in head ? head.payload.draftAttachmentIds : undefined;
    if (selected && selected.length && JSON.stringify([...selected].sort()) !== JSON.stringify([...(established ?? [])].sort())) {
      try {
        const result = await mutateDraft(ctx.locale, { intent: "attachments", contextKey: ctx.contextKey,
          draftId: ctx.draftId, expectedVersion: ctx.local?.baseVersion ?? ctx.startVersion,
          payload: { ...blank(), draftAttachmentIds: selected } });
        if (!currentAt(ctx, epoch)) return null;
        if (result.outcome !== "saved" || !result.draft) {
          ctx.publishing = false;
          await checkRemoteNow(ctx);
          return null;
        }
        ctx.serverHead = result.draft;
        ctx.startVersion = result.draft.version;
        setExpectedVersion(result.draft.version);
        if (ctx.local) {
          ctx.local = { ...ctx.local, baseVersion: result.draft.version, basePayload: result.draft.payload };
          writeLocalEditorDraft(ctx.local);
        }
      } catch { ctx.publishing = false; return null; }
    }
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
    const oldBody = ctx.payload.body;
    if (expireLocal(ctx)) {
      let prefix = 0;
      while (prefix < oldBody.length && oldBody[prefix] === body[prefix]) prefix++;
      let suffix = 0;
      while (suffix < oldBody.length - prefix && suffix < body.length - prefix
        && oldBody[oldBody.length - 1 - suffix] === body[body.length - 1 - suffix]) suffix++;
      body = body.slice(prefix, body.length - suffix);
      callbacksRef.current.restore({ ...blank(), body });
    }
    ctx.payload = { ...ctx.payload, body };
    ctx.hasInput = true;
    if (immediate || /\s$/u.test(body) || body.length === 0) capture(ctx);
  }
  function noteFields(patch: Partial<Omit<ForumEditorDraftPayload, "body">>, immediate = false) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx)) return;
    if (expireLocal(ctx)) return;
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
  function reserveAttachmentGeneration(unchanged = false): string | null {
    const ctx = runtimeRef.current;
    if (ctx && current(ctx) && expireLocal(ctx)) return null;
    if (!ctx || !current(ctx) || !ctx.attachmentVerified || ctx.conflict
      || ctx.reading || ctx.syncing || ctx.publishing) return null;
    if (ctx.local?.attachmentDraftId && ctx.local.attachmentDraftId !== ctx.draftId) return null;
    if (unchanged && ctx.local?.attachmentDraftId === ctx.draftId) return ctx.draftId;
    if (ctx.hasInput) {
      capture(ctx);
      if (ctx.hasInput && (ctx.payload.body.trim() || ctx.payload.title.trim() || ctx.payload.tags.trim())) {
        return null; // Local write failed: never upload against an unpersisted generation.
      }
    }
    const now = new Date().toISOString();
    const serverBase = ctx.serverHead && "payload" in ctx.serverHead ? ctx.serverHead.payload
      : ctx.contextKey.startsWith("post:") ? { ...blank(), body: initialPayload.body,
        publishedRevisionId: initialPayload.publishedRevisionId } : { ...blank(), draftAttachmentIds: [] };
    const next: LocalEditorDraft = ctx.local
      ? { ...ctx.local, attachmentDraftId: ctx.draftId, editedAt: now, syncedEditedAt: null,
          basePayload: ctx.local.basePayload ?? serverBase }
      : { ownerId: ctx.ownerId, contextKey: ctx.contextKey, draftId: ctx.draftId,
          payload: { ...ctx.payload }, editedAt: now, syncedEditedAt: null,
          baseVersion: ctx.startVersion, attachmentDraftId: ctx.draftId,
          basePayload: serverBase };
    if (!writeLocalEditorDraft(next)) { setStatus("error"); return null; }
    ctx.local = next;
    ctx.hasInput = false;
    setStatus("pending");
    return ctx.draftId;
  }
  function noteAttachmentChange(generation: string) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || ctx.draftId !== generation || !ctx.local || expireLocal(ctx)) return;
    if (ctx.hasInput) capture(ctx);
    const next = { ...ctx.local, editedAt: new Date().toISOString(), syncedEditedAt: null };
    if (!writeLocalEditorDraft(next)) { setStatus("error"); return; }
    ctx.local = next;
    if (ctx.conflict) updateConflict(ctx, { ...ctx.conflict, local: next });
    else setStatus("pending");
  }
  function noteAttachmentManifest(generation: string, attachmentIds: readonly string[]) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || ctx.draftId !== generation || expireLocal(ctx)) return;
    if (ctx.hasInput) capture(ctx);
    const selected = [...new Set(attachmentIds.map((id) => id.toLowerCase()))].sort();
    const existing = ctx.payload.draftAttachmentIds;
    if (existing && existing.length === selected.length
      && existing.every((id, index) => id === selected[index])) return;
    ctx.payload = { ...ctx.payload, draftAttachmentIds: selected };
    // Establishing an empty manifest must not turn untouched published source
    // into a local edit. The next real text/attachment edit will carry it.
    if (!ctx.local && selected.length === 0) return;
    ctx.hasInput = true;
    capture(ctx);
  }
  function retryAttachmentReconciliation() {
    const ctx = runtimeRef.current;
    if (ctx && current(ctx)) void checkRemote(ctx);
  }
  function completeAttachmentRebind(fromDraftId: string, toDraftId: string, retired = false): boolean {
    const ctx = runtimeRef.current;
    if (
      !ctx
      || !current(ctx)
      || ctx.conflict
      || !ctx.attachmentVerified
      || ctx.draftId !== toDraftId
    ) return false;
    const local = ctx.local;
    if (!local || local.attachmentDraftId !== fromDraftId) return false;
    const next = { ...local, attachmentDraftId: retired ? undefined : toDraftId };
    if (!writeLocalEditorDraft(next)) {
      setStatus("error");
      return false;
    }
    ctx.local = next;
    setAttachmentVerified(ctx, true);
    void checkRemote(ctx);
    return true;
  }
  async function chooseVersion(which: "local" | "server") {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || !ctx.conflict || ctx.resolving || expireLocal(ctx)) return;
    if (ctx.hasInput) capture(ctx);
    const conflictNow = ctx.conflict;
    if (!conflictNow) return;
    const seen = conflictNow.server;
    const selected = which === "local" ? conflictNow.local : conflictNow.localCandidate;
    if (!selected && (!seen || seen.status !== "active")) {
      reset(ctx, seen?.version ?? ctx.startVersion);
      setAttachmentSelectionEpoch((value) => value + 1);
      void checkRemote(ctx);
      return;
    }
    let payload = selected?.payload ?? (seen && "payload" in seen ? seen.payload : null);
    if (!payload) return;
    const other = conflictNow.localCandidate?.payload ?? (seen && "payload" in seen ? seen.payload : null);
    const keep = other && keptAttachmentSelection(conflictNow.local.payload, other, conflictNow.local.basePayload);
    if (keep) payload = { ...payload, draftAttachmentIds: keep };
    if (selected?.pendingAttachments?.length) payload = { ...payload,
      draftAttachmentIds: payload.draftAttachmentIds?.filter((id) => !selected.pendingAttachments!.some((item) => item.id === id)) };
    const targetId = seen?.status === "active" ? seen.draftId
      : selected?.draftId === seen?.draftId ? crypto.randomUUID() : selected!.draftId;
    const version = seen?.version ?? ctx.startVersion;
    const provisional: LocalEditorDraft = { ...conflictNow.local, draftId: targetId,
      payload, baseVersion: version, syncedEditedAt: null, editedAt: new Date().toISOString(),
      attachmentDraftId: selected?.attachmentDraftId, pendingAttachments: selected?.pendingAttachments };
    if (!writeLocalEditorDraft(provisional)) { setStatus("error"); return; }
    ctx.resolving = true;
    ctx.readToken = null;
    ctx.reading = false;
    try {
      await enqueue(ctx, async () => {
        // The exact seen base is immutable. Never fetch a fresh number to make
        // an old choice pass CAS; a changed head is another user decision.
        const result = await mutateDraft(ctx.locale, { intent: seen?.status === "active" ? "resolve" : "save",
          contextKey: ctx.contextKey, draftId: targetId, payload, expectedVersion: version });
        if (!current(ctx) || ctx.conflict !== conflictNow) return;
        if (result.outcome !== "saved" || !result.draft) {
          const candidate = selected ?? conflictNow.local;
          writeLocalEditorDraft(candidate);
          const head = await fetchDraftHead(ctx.locale, ctx.contextKey);
          if (current(ctx) && ctx.conflict === conflictNow) {
            ctx.serverHead = head;
            ctx.local = candidate;
            ctx.payload = { ...candidate.payload };
            callbacksRef.current.restore(candidate.payload);
            updateConflict(ctx, { local: candidate, server: head });
          }
          return;
        }
        if (!applyRemote(ctx, result.draft, true)) return;
        if ((provisional.attachmentDraftId || provisional.pendingAttachments?.length) && ctx.local) {
          ctx.local = { ...ctx.local, attachmentDraftId: provisional.attachmentDraftId,
            pendingAttachments: provisional.pendingAttachments };
          setPendingAttachments(provisional.pendingAttachments ?? []);
          writeLocalEditorDraft(ctx.local);
        }
        setAttachmentSelectionEpoch((value) => value + 1);
        updateConflict(ctx, null);
        setAttachmentVerified(ctx, true);
      });
    } catch {
      if (current(ctx)) { writeLocalEditorDraft(conflictNow.local); setStatus("conflict"); }
    } finally { if (current(ctx)) ctx.resolving = false; }
  }

  async function rebindAttachments(fromDraftId: string, toDraftId: string): Promise<Response> {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || expireLocal(ctx)) throw new Error("draft unavailable");
    const response = await enqueue(ctx, async () => {
      if (ctx.conflict || ctx.draftId !== toDraftId || expireLocal(ctx)) throw new Error("draft changed");
      return fetch("/api/attachments", { method: "PATCH", credentials: "same-origin", headers: {
        "X-Vico-Draft-Context": encodeURIComponent(ctx.contextKey), "X-Vico-Draft-Id": toDraftId,
        "X-Vico-Attachment-From-Draft-Id": fromDraftId,
        "X-Vico-Draft-Version": String(ctx.local?.baseVersion ?? ctx.startVersion),
      } });
    });
    if (!response) throw new Error("draft changed");
    return response;
  }
  async function initializeAttachments(generation: string, revisionId: string) {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || expireLocal(ctx)) throw new Error("draft unavailable");
    return enqueue(ctx, async () => {
      if (ctx.conflict || ctx.draftId !== generation || expireLocal(ctx)) throw new Error("draft changed");
      const version = ctx.local?.baseVersion ?? ctx.startVersion;
      const response = await fetch("/api/attachments", { method: "PUT", credentials: "same-origin",
        headers: { "X-Vico-Draft-Context": encodeURIComponent(ctx.contextKey),
          "X-Vico-Draft-Id": generation, "X-Vico-Post-Revision": encodeURIComponent(revisionId),
          "X-Vico-Draft-Version": String(version) } });
      if (!response.ok) {
        if (response.status === 409 || response.status === 410) await checkRemoteNow(ctx);
        throw new Error("attachment initialization unavailable");
      }
      const data = await response.json() as { attachments?: unknown[]; draft?: DraftRemote };
      if (!current(ctx) || ctx.draftId !== generation) throw new Error("draft changed");
      return data;
    });
  }
  function stageAttachment(generation: string, attachment: PendingDraftAttachment): boolean {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || expireLocal(ctx) || ctx.draftId !== generation || !ctx.local) return false;
    const pending = [...(ctx.local.pendingAttachments ?? []).filter((item) => item.id !== attachment.id), attachment];
    const next = { ...ctx.local, pendingAttachments: pending };
    if (!writeLocalEditorDraft(next)) { setStatus("error"); return false; }
    ctx.local = next;
    setPendingAttachments(pending);
    return true;
  }
  async function selectAttachment(generation: string, id: string, present: boolean): Promise<boolean> {
    const ctx = runtimeRef.current;
    if (!ctx || !current(ctx) || ctx.publishing || ctx.conflict || expireLocal(ctx)) return false;
    const epoch = ctx.epoch;
    return (await enqueue(ctx, async () => {
      if (!currentAt(ctx, epoch) || ctx.conflict || ctx.draftId !== generation || expireLocal(ctx)) return false;
      if (ctx.hasInput) capture(ctx);
      const version = ctx.local?.baseVersion ?? ctx.startVersion;
      let head = ctx.serverHead;
      if (head?.status === "active" && !("payload" in head)) {
        const observed = await fetchDraftContent(ctx.locale, ctx.contextKey);
        if (!currentAt(ctx, epoch)) return false;
        if (!observed || observed.version !== version || observed.draftId !== generation) {
          if (ctx.local) updateConflict(ctx, { local: ctx.local, server: observed });
          return false;
        }
        head = observed;
      }
      const selected = new Set(head?.status === "active" && "payload" in head
        ? head.payload.draftAttachmentIds ?? []
        : (ctx.payload.draftAttachmentIds ?? []).filter((fileId) => !ctx.local?.pendingAttachments?.some((item) => item.id === fileId)));
      if (present) selected.add(id); else selected.delete(id);
      const ids = [...selected].sort();
      const beforeText = head?.status === "active" && "payload" in head ? head.payload
        : ctx.local?.basePayload ?? blank();
      if (ctx.local) {
        const next = { ...ctx.local, basePayload: beforeText,
          selectionIntent: { draftId: generation, expectedVersion: version, attachmentIds: ids, attachmentId: id } };
        if (!writeLocalEditorDraft(next)) { setStatus("error"); return false; }
        ctx.local = next;
      }
      const provesOwnSelection = (observed: DraftRemote | null): observed is DraftRemote => !!observed
        && observed.draftId === generation && observed.version === version + 1
        && observed.status === "active" && samePayload(observed.payload, { ...beforeText, draftAttachmentIds: ids });
      let result;
      try {
        result = await mutateDraft(ctx.locale, { intent: "attachments", contextKey: ctx.contextKey,
          draftId: generation, expectedVersion: version, payload: { ...blank(), draftAttachmentIds: ids } });
      } catch {
        // A read can establish the exact own transition only at N+1, with the
        // expected complete snapshot. A later external version cannot rebase us.
        const observed = await fetchDraftHead(ctx.locale, ctx.contextKey);
        if (!provesOwnSelection(observed)) return false;
        result = { outcome: "saved", draft: observed };
      }
      if (!currentAt(ctx, epoch)) return false;
      if (result.outcome !== "saved" || !result.draft) {
        const observed = await fetchDraftHead(ctx.locale, ctx.contextKey);
        if (!currentAt(ctx, epoch)) return false;
        if (!provesOwnSelection(observed)) {
          if (ctx.local) { ctx.serverHead = observed; updateConflict(ctx, { local: ctx.local, server: observed }); }
          return false;
        }
        result = { outcome: "saved", draft: observed };
      }
      const saved = result.draft;
      if (!saved) return false;
      ctx.serverHead = saved;
      ctx.startVersion = saved.version;
      setAttachmentVerified(ctx, true);
      setExpectedVersion(saved.version);
      const localIds = new Set(ctx.payload.draftAttachmentIds ?? []);
      if (present) localIds.add(id); else localIds.delete(id);
      ctx.payload = { ...ctx.payload, draftAttachmentIds: [...localIds].sort() };
      if (ctx.local) {
        ctx.local = { ...ctx.local, baseVersion: saved.version,
          payload: ctx.payload, syncedEditedAt: null, basePayload: saved.payload, selectionIntent: undefined,
          pendingAttachments: ctx.local.pendingAttachments?.filter((item) => item.id !== id) };
        setPendingAttachments(ctx.local.pendingAttachments ?? []);
        if (!writeLocalEditorDraft(ctx.local)) { setStatus("error"); return false; }
      }
      return true;
    })) ?? false;
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
      setAttachmentReady(false);
      setAttachmentRebindFrom(null);
      setAttachmentRebindVersion(null);
      setStatus("idle");
      setConflict(null);
      return;
    }
    const ctx: Runtime = {
      identity, ownerId, contextKey, locale, draftId: crypto.randomUUID(),
      local: null, payload: { ...initialPayload }, hasInput: false, startVersion: 0, conflict: null,
      rejectedSyncEditedAt: null,
      syncing: false, resolving: false, reading: false, disposed: false, epoch: 0, attachmentVerified: false,
      serverCycle: null, publishing: false, serverHead: null, mutations: Promise.resolve(), readToken: null, mutating: false,
    };
    runtimeRef.current = ctx;
    setDraftId(ctx.draftId);
    setExpectedVersion(0);
    setConflict(null);
    setAttachmentReady(false);
    setAttachmentRebindFrom(null);
    setAttachmentRebindVersion(null);
    setStatus("idle");
    const local = readLocalEditorDraft(ownerId, contextKey);
    if (local) {
      ctx.local = local;
      ctx.draftId = local.draftId;
      ctx.payload = { ...local.payload };
      setPendingAttachments(local.pendingAttachments ?? []);
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
      if ((!ctx.local || ctx.local.editedAt === ctx.local.syncedEditedAt)
        && (!ctx.local?.attachmentDraftId || ctx.local.attachmentDraftId === other.draftId)) {
        ctx.epoch++;
        ctx.readToken = null;
        ctx.reading = false;
        setAttachmentVerified(ctx, false);
        ctx.local = other;
        ctx.payload = { ...other.payload };
        ctx.draftId = other.draftId;
        ctx.hasInput = false;
        ctx.rejectedSyncEditedAt = null;
        callbacksRef.current.restore(other.payload);
        setDraftId(other.draftId);
        setExpectedVersion(other.baseVersion);
        setStatus("restored");
        void checkRemote(ctx);
      } else if (other.draftId !== ctx.local.draftId
        || JSON.stringify(other.payload) !== JSON.stringify(ctx.local.payload)) {
        updateConflict(ctx, { local: ctx.local, localCandidate: other, server: ctx.serverHead });
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
  const conflictRemotePayload = conflict?.localCandidate?.payload ?? (conflict?.server && "payload" in conflict.server ? conflict.server.payload : null);
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
      {payload.retainedAttachmentIds !== undefined || other.retainedAttachmentIds !== undefined
        ? <p><strong>{t("editorAttachments")}:</strong> {(payload.retainedAttachmentIds ?? []).join(", ") || "—"}</p>
        : null}
      <pre>{payload.body}</pre>
    </>
  );
  const conflictElement = ownerId && contextKey && conflict ? (
    <div className="markdown-editor-draft-conflict" role="group" aria-label={t("editorDraftConflict")}>
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
      <button type="button" onClick={() => void chooseVersion("local")}>{t("editorDraftKeepLocal")}</button>
      <button type="button" onClick={() => void chooseVersion("server")}>{t("editorDraftKeepServer")}</button>
    </div>
  ) : null;
  return {
    noteEdit, noteFields, seedFields, saveLocal, draftId, expectedVersion, acknowledgePublished,
    preparePublication, releasePublication, attachmentReady, attachmentSnapshotEstablished, attachmentRebindFrom, attachmentRebindVersion, attachmentRevision,
    attachmentSelectionEpoch,
    noteAttachmentChange, noteAttachmentManifest, selectAttachment, stageAttachment, pendingAttachments, initializeAttachments, rebindAttachments,
    reserveAttachmentGeneration, retryAttachmentReconciliation, completeAttachmentRebind,
    statusLabel: ownerId && contextKey ? labels[status] : "",
    conflictElement,
    element: ownerId && contextKey ? (
      <div className="markdown-editor-draft-state" aria-live="polite">
        <span>{labels[status]}</span>
        {conflictElement}
      </div>
    ) : null,
  };
}
