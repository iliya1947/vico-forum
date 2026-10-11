import { useEffect, useState } from "react";
import { Link, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { draftStoreForRequest } from "../forum/draft-request-context";
import {
  clearDeviceEditorData, clearLocalEditorDraft, DRAFT_LIFETIME_MS,
  draftDestination, listLocalEditorDrafts, localDraftNeedsAttention, mutateDraft, type DraftMetadata, type LocalEditorDraft,
} from "../forum/draft-client";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { ForumShell } from "../forum/ui";

export async function loader({ params, context }: {
  params: { locale?: string }; context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  const locale = params.locale ?? "en";
  try {
    return { locale, drafts: await draftStoreForRequest(context).metadata(session.user.id) };
  } catch { throw new Response("Unavailable", { status: 503 }); }
}

interface DraftListItem {
  contextKey: string;
  draftId: string;
  version: number;
  title: string;
  snippet: string;
  editedAt: string;
  origin: "server" | "device";
}

export default function DraftsRoute() {
  const { locale, drafts: initial } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const userId = useHeaderAuthUser()?.id ?? null;
  const [remote, setRemote] = useState<DraftMetadata[]>(initial);
  const [local, setLocal] = useState<LocalEditorDraft[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!userId) { setLocal([]); return; }
    const copies = listLocalEditorDrafts(userId);
    for (const draft of copies) {
      const published = remote.find((item) => item.contextKey === draft.contextKey
        && item.draftId === draft.draftId && item.status !== "active");
      if (published) clearLocalEditorDraft(userId, draft.contextKey);
    }
    setLocal(listLocalEditorDrafts(userId));
  }, [userId, remote]);
  const currentRemote = remote.filter((draft) => draft.status === "active");
  const combined = new Map<string, DraftListItem>();
  for (const draft of currentRemote) combined.set(draft.contextKey, { ...draft, origin: "server" });
  for (const draft of local) {
    const server = remote.find((entry) => entry.contextKey === draft.contextKey);
    if (!localDraftNeedsAttention(draft, server)) continue;
    combined.set(draft.contextKey, {
      contextKey: draft.contextKey, draftId: draft.draftId, version: draft.baseVersion,
      title: draft.payload.title, snippet: draft.payload.body.slice(0, 140),
      editedAt: draft.editedAt, origin: "device",
    });
  }
  const items = [...combined.values()].sort((a, b) => b.editedAt.localeCompare(a.editedAt));
  async function discard(item: DraftListItem) {
    if (!userId || !window.confirm(t("editorDraftDeleteConfirm"))) return;
    setError(false);
    try {
      const result = await mutateDraft(locale, { intent: "delete", contextKey: item.contextKey, draftId: item.draftId });
      if (result.outcome !== "finished") throw new Error("Draft version changed");
      clearLocalEditorDraft(userId, item.contextKey);
      setLocal(listLocalEditorDrafts(userId));
      setRemote((prev) => prev.filter((candidate) => candidate.contextKey !== item.contextKey));
    } catch { setError(true); }
  }
  return <ForumShell locale={locale} variant="system">
    <section className="editor-drafts-page">
      <h1>{t("editorMyDrafts")}</h1>
      {error ? <p role="alert">{t("editorDraftLocalError")}</p> : null}
      {items.length === 0 ? <p>{t("editorDraftsEmpty")}</p> : (
        <ul className="editor-drafts-list">{items.map((item) => {
          const destination = draftDestination(locale, item.contextKey);
          const daysLeft = Math.max(0, Math.ceil((Date.parse(item.editedAt) + DRAFT_LIFETIME_MS - Date.now()) / 86_400_000));
          return <li key={item.contextKey}>
            <strong>{item.title || item.contextKey}</strong>
            <p>{item.snippet || "—"}</p>
            <small>{new Date(item.editedAt).toLocaleString(locale)} · {t("editorDraftDaysLeft", { count: daysLeft })}</small>
            <div>
              {destination ? <Link to={destination}>{t("editorDraftContinue")}</Link> : null}
              <button type="button" onClick={() => void discard(item)}>{t("editorDraftDelete")}</button>
            </div>
          </li>;
        })}</ul>
      )}
      <button type="button" disabled={!userId}
        onClick={() => {
          if (!userId || !window.confirm(t("editorDraftClearDeviceConfirm"))) return;
          clearDeviceEditorData(userId);
          setLocal([]);
        }}>{t("editorDraftClearDevice")}</button>
    </section>
  </ForumShell>;
}
