import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { ForumMarkdown, ForumInlineAttachmentProvider } from "./markdown";
import {
  applyTextareaEdit,
  clearInlineMarkdownFormatting,
  createEditorHistory,
  editableCodeRanges,
  editVisualText,
  inlineCodeAffixes,
  longestBacktickRun,
  recordEditorEdit,
  removeAttachmentImages,
  redoEditorEdit,
  rememberEditorSelection,
  sourceOffsetToTextareaOffset,
  setParagraphDirection,
  type ParagraphDirection,
  textareaMarkdown,
  textareaOffsetToSourceOffset,
  undoEditorEdit,
  type EditorSelection,
} from "./editor-document";
import { mentionTokenAtCaret, mentionProfileLink, type MentionToken } from "./mentions";
import { forumProfilePath } from "./paths";
import {
  VisualMarkdownEditor,
  escapeVisualMarkdownText,
  restoreVisualDomSelection,
} from "./visual-markdown-editor";
import { addTableDimension, spreadsheetToMarkdown, type MarkdownTable } from "./technical-markdown";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { useEditorDraft } from "./use-editor-draft";
import { clipboardPlainToMarkdown } from "./clipboard-markdown";
import { useEditorAttachments } from "./editor-attachments";

export interface MarkdownEditorHandle {
  focus: () => void;
  insertText: (text: string) => void;
  setDraftParentPostId: (parentPostId: string | null) => void;
  setDraftPublishedRevisionId: (revisionId: string) => void;
  acknowledgePublished: (draftId: string, publishedVersion: number) => void;
}

export interface MarkdownEditorProps {
  id: string;
  name: string;
  required?: boolean;
  rows?: number;
  disabled?: boolean;
  describedBy?: string;
  defaultValue?: string;
  defaultPreviewOpen?: boolean;
  defaultAuthoringMode?: "simple" | "advanced";
  draftContextKey?: string;
  draftLocale?: string;
  onDraftRestoreParent?: (parentPostId: string | null) => void;
  initialPublishedRevisionId?: string;
  onDraftRestorePublishedRevisionId?: (revisionId: string | null) => void;
  draftPublicationIntent?: string;
  draftPublicationPending?: boolean;
  onPublicationReadyChange?: (ready: boolean) => void;
  actions?: ReactNode;
  existingInlineAttachments?: Array<{
    id: string; fileName: string; byteSize: number; detectedType: string; url: string;
  }>;
}

interface PendingSelection {
  start: number;
  end: number;
}

type EditorMode = "write" | "preview" | "split";

function normalizedCodeLanguage(value: string): string {
  return value.trim().replace(/[^a-z0-9_+.#-]/giu, "").slice(0, 32);
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(
    {
      id,
      name,
      required = false,
      rows = 8,
      disabled = false,
      describedBy,
      defaultValue = "",
      defaultPreviewOpen = false,
      defaultAuthoringMode = "simple",
      draftContextKey,
      draftLocale,
      onDraftRestoreParent,
      initialPublishedRevisionId,
      onDraftRestorePublishedRevisionId,
      draftPublicationIntent,
      draftPublicationPending = false,
      onPublicationReadyChange,
      actions,
      existingInlineAttachments = [],
    },
    forwardedRef,
  ) {
    const { t } = useTranslation("common");
    const authUser = useHeaderAuthUser();
    const visualSelectionRef = useRef<EditorSelection | null>(null);
    const visualSelectionKnownRef = useRef(false);
    const [authoringMode, setAuthoringMode] = useState<"simple" | "advanced">(defaultAuthoringMode);
    const [spellCheckPreference, setSpellCheckPreference] = useState<boolean | null>(null);
    const spellCheck = spellCheckPreference ?? authoringMode === "simple";
    const [fullScreen, setFullScreen] = useState(false);
    const [compactToolbar, setCompactToolbar] = useState(false);
    useEffect(() => {
      if (typeof window.matchMedia !== "function") return;
      const query = window.matchMedia("(max-width: 44rem)");
      const update = () => setCompactToolbar(query.matches);
      update();
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }, []);
    const [pasteWarning, setPasteWarning] = useState(false);
    const [findOpen, setFindOpen] = useState(false);
    const [findText, setFindText] = useState("");
    const [replaceText, setReplaceText] = useState("");
    const [mentionToken, setMentionToken] = useState<MentionToken | null>(null);
    const [mentionCandidates, setMentionCandidates] = useState<Array<{ id: string; name: string }>>([]);
    const [draftPublishedRevisionId, setDraftPublishedRevisionId] = useState(initialPublishedRevisionId);
    const accountId = authUser?.id ?? null;

    useEffect(() => {
      function readPreferences() {
        if (!accountId) {
          setAuthoringMode(defaultAuthoringMode);
          setSpellCheckPreference(null);
          return;
        }
        try {
          const stored = window.localStorage.getItem("vico:editor:mode:" + accountId);
          const storedSpellCheck = window.localStorage.getItem("vico:editor:spellcheck:" + accountId);
          setAuthoringMode(stored === "advanced" || stored === "simple" ? stored : defaultAuthoringMode);
          setSpellCheckPreference(storedSpellCheck === "true" ? true : storedSpellCheck === "false" ? false : null);
        } catch {
          setAuthoringMode(defaultAuthoringMode);
          setSpellCheckPreference(null);
        }
      }
      readPreferences();
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === "vico:editor:mode:" + accountId
          || event.key === "vico:editor:spellcheck:" + accountId) readPreferences();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }, [accountId, defaultAuthoringMode]);

    function switchAuthoring(
      next: "simple" | "advanced",
      targetSelection?: EditorSelection,
    ) {
      const selection = targetSelection ?? sourceSelection() ?? historyRef.current.current.selection;
      if (next === "advanced") {
        pendingSelectionRef.current = selection;
        pendingVisualSelectionRef.current = null;
      } else {
        pendingVisualSelectionRef.current = selection;
        pendingSelectionRef.current = null;
      }
      setAuthoringMode(next);
      setMode("write");
      visualSelectionRef.current = null;
      visualSelectionKnownRef.current = false;
      if (accountId) {
        try { window.localStorage.setItem("vico:editor:mode:" + accountId, next); } catch { /* private mode */ }
      }
    }

    const editorRef = useRef<HTMLDivElement>(null);
    const pendingVisualSelectionRef = useRef<EditorSelection | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const draftIdInputRef = useRef<HTMLInputElement>(null);
    const draftVersionInputRef = useRef<HTMLInputElement>(null);
    const publicationReplayRef = useRef(false);
    const publicationPreparingRef = useRef(false);
    const publicationPreparedRef = useRef(false);
    const publicationPendingSeenRef = useRef(false);
    const previewRef = useRef<HTMLElement>(null);
    const pendingSelectionRef = useRef<PendingSelection | null>(null);
    const historyRef = useRef(createEditorHistory(defaultValue));
    const [value, setValue] = useState(defaultValue);
    const editorScope = JSON.stringify([accountId, draftContextKey ?? null, draftLocale ?? null]);
    const previousScopeRef = useRef(editorScope);
    useEffect(() => {
      if (previousScopeRef.current === editorScope) return;
      previousScopeRef.current = editorScope;
      visualSelectionRef.current = null;
      visualSelectionKnownRef.current = false;
      pendingVisualSelectionRef.current = null;
      pendingSelectionRef.current = null;
      historyRef.current = createEditorHistory(defaultValue);
      setValue(defaultValue);
      setPasteWarning(false);
      setFindOpen(false);
      setDraftPublishedRevisionId(initialPublishedRevisionId);
      publicationReplayRef.current = false;
      publicationPreparingRef.current = false;
      publicationPreparedRef.current = false;
      publicationPendingSeenRef.current = false;
    }, [editorScope, defaultValue, initialPublishedRevisionId]);

    const draft = useEditorDraft({
      ownerId: accountId, contextKey: draftContextKey, locale: draftLocale,
      initialPayload: { body: defaultValue, title: "", tags: "", parentPostId: null,
        ...(initialPublishedRevisionId ? { publishedRevisionId: initialPublishedRevisionId } : {}) },
      restore: (payload) => {
        setDraftPublishedRevisionId(payload.publishedRevisionId);
        onDraftRestorePublishedRevisionId?.(payload.publishedRevisionId ?? null);
        historyRef.current = createEditorHistory(payload.body);
        onDraftRestoreParent?.(payload.parentPostId ?? null);
        setValue(payload.body);
        const form = textareaRef.current?.form;
        for (const key of ["title", "tags"] as const) {
          const field = form?.elements.namedItem(key);
          if (field instanceof HTMLInputElement) field.value = payload[key];
        }
      },
    });

    // Source insertion is synchronous with the paste/picker action. The stable
    // ID is inert Markdown until a verified attachment is present in this scope.
    function insertImage(id: string, fileName: string) {
      const source = historyRef.current.current.markdown;
      const selection = sourceSelection() ?? historyRef.current.current.selection;
      const start = Math.min(source.length, Math.max(0, selection.start));
      const end = Math.min(source.length, Math.max(start, selection.end));
      const alt = fileName.replaceAll("\\", " ").replaceAll("[", " ").replaceAll("]", " ").replace(/[\r\n]/gu, " ").slice(0, 160);
      const token = `![${alt}](vico-attachment:${id})`;
      const next = source.slice(0, start) + token + source.slice(end);
      const after = { start: start + token.length, end: start + token.length };
      historyRef.current = recordEditorEdit(historyRef.current, next, { start, end }, after);
      if (authoringMode === "simple") {
        visualSelectionRef.current = after;
        visualSelectionKnownRef.current = true;
        pendingVisualSelectionRef.current = after;
      } else {
        pendingSelectionRef.current = after;
      }
      setValue(next);
      draft.noteEdit(next, true);
    }

    function removeImage(id: string) {
      const source = historyRef.current.current.markdown;
      const next = removeAttachmentImages(source, id);

      if (next === source) return;
      const oldSelection = historyRef.current.current.selection;
      const pos = Math.min(oldSelection.start, next.length);
      const after = { start: pos, end: pos };
      historyRef.current = recordEditorEdit(historyRef.current, next, oldSelection, after);
      if (authoringMode === "simple") {
        visualSelectionRef.current = after;
        visualSelectionKnownRef.current = true;
        pendingVisualSelectionRef.current = after;
      } else {
        pendingSelectionRef.current = after;
      }
      setValue(next);
      draft.noteEdit(next, true);
    }

    const attachments = useEditorAttachments({
      ownerId: accountId,
      contextKey: accountId ? draftContextKey : undefined,
      draftId: draft.draftId,
      expectedVersion: draft.expectedVersion,
      publishedRevisionId: draftPublishedRevisionId,
      hasPublishedAttachments: existingInlineAttachments.length > 0,
      publishedAttachments: existingInlineAttachments,
      snapshotEstablished: draft.attachmentSnapshotEstablished,
      draftReady: draft.attachmentReady,
      draftRevision: draft.attachmentRevision,
      selectionEpoch: draft.attachmentSelectionEpoch,
      rebindFrom: draft.attachmentRebindFrom,
      rebindVersion: draft.attachmentRebindVersion,
      disabled,
      reserveGeneration: draft.reserveAttachmentGeneration,
      completeRebind: draft.completeAttachmentRebind,
      retryDraftReconciliation: draft.retryAttachmentReconciliation,
      noteAttachmentChange: draft.noteAttachmentChange,
      selectAttachment: draft.selectAttachment,
      stageAttachment: draft.stageAttachment,
      initializeAttachments: draft.initializeAttachments,
      rebindAttachments: draft.rebindAttachments,
      pendingAttachments: draft.pendingAttachments,
      noteAttachmentManifest: draft.noteAttachmentManifest,
      insertImage,
      removeImage,
    });

    const hasPublishContent = value.trim().length > 0 || attachments.selectedAttachmentIds.length > 0;
    const publicationReady = !disabled && !draftPublicationPending && !attachments.blocking && hasPublishContent;
    useEffect(() => { onPublicationReadyChange?.(publicationReady); }, [onPublicationReadyChange, publicationReady]);

    useEffect(() => {
      if (draftPublicationPending) {
        if (publicationPreparedRef.current) publicationPendingSeenRef.current = true;
        return;
      }
      if (!publicationPendingSeenRef.current) return;
      publicationPendingSeenRef.current = false;
      publicationPreparedRef.current = false;
      draft.releasePublication();
    }, [draftPublicationPending, draft]);

    useEffect(() => {
      if (!accountId || !draftContextKey) return;
      const form = textareaRef.current?.form;
      if (!form) return;
      const fieldValue = (fieldName: string) => {
        const field = form.elements.namedItem(fieldName);
        return field instanceof HTMLInputElement ? field.value : "";
      };
      draft.seedFields({
        title: fieldValue("title"),
        tags: fieldValue("tags"),
        parentPostId: fieldValue("parentPostId") || null,
      });
      const onInput = (event: Event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement) || (field.name !== "title" && field.name !== "tags")) return;
        const input = event as InputEvent;
        draft.noteFields(
          field.name === "title" ? { title: field.value } : { tags: field.value },
          input.data === " " || input.inputType === "insertFromPaste",
        );
      };
      const flush = () => draft.saveLocal();
      const onSubmit = (event: SubmitEvent) => {
        if (!draftPublicationIntent) return;
        if (publicationReplayRef.current) {
          publicationReplayRef.current = false;
          return;
        }

        const submitter = event.submitter;
        const submitterIntent =
          (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement)
          && submitter.name === "intent"
            ? submitter.value
            : null;
        const intentField = form.elements.namedItem("intent");
        const intent = submitterIntent
          ?? (intentField instanceof HTMLInputElement ? intentField.value : null);
        if (intent !== draftPublicationIntent) return;

        if (!hasPublishContent || attachments.blocking || disabled || draftPublicationPending) {
          event.preventDefault();
          if (attachments.blocking) attachments.markPublicationAttempt();
          return;
        }

        event.preventDefault();
        if (publicationPreparingRef.current) return;
        publicationPreparingRef.current = true;
        const replaySubmitter =
          submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
            ? submitter
            : undefined;

        void draft.preparePublication().then(async (fence) => {
          // A fulfilled promise can resume while the browser is still firing
          // the original submit event. Native requestSubmit then does nothing
          // (HTML's firing-submission-events guard). Replay in the next task,
          // after that algorithm has finished, retaining native validation.
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          if (previousScopeRef.current !== editorScope || !form.isConnected) return;
          publicationPreparingRef.current = false;
          if (!fence) return;
          if (draftIdInputRef.current) draftIdInputRef.current.value = fence.draftId;
          if (draftVersionInputRef.current) {
            draftVersionInputRef.current.value = String(fence.expectedVersion);
          }
          publicationPreparedRef.current = true;
          publicationReplayRef.current = true;
          form.requestSubmit(replaySubmitter);
          if (publicationReplayRef.current) {
            publicationReplayRef.current = false;
            publicationPreparedRef.current = false;
            draft.releasePublication();
          }
        }).catch(() => {
          publicationPreparingRef.current = false;
          publicationPreparedRef.current = false;
          draft.releasePublication();
        });
      };
      form.addEventListener("input", onInput);
      form.addEventListener("focusout", flush);
      form.addEventListener("submit", onSubmit);
      return () => {
        form.removeEventListener("input", onInput);
        form.removeEventListener("focusout", flush);
        form.removeEventListener("submit", onSubmit);
      };
    });


    function textareaSourceSelection(source = value): EditorSelection {
      const textarea = textareaRef.current;
      const displayedLength = textareaMarkdown(source).length;
      const start = textarea?.selectionStart ?? displayedLength;
      const end = textarea?.selectionEnd ?? start;
      return {
        start: textareaOffsetToSourceOffset(source, start),
        end: textareaOffsetToSourceOffset(source, end),
      };
    }

    function sourceSelection(): EditorSelection | null {
      if (authoringMode === "simple") {
        if (visualSelectionKnownRef.current) return visualSelectionRef.current;
        return { start: value.length, end: value.length };
      }
      return textareaSourceSelection();
    }

    function rememberSelection(selection: EditorSelection | null) {
      if (!selection) return;
      historyRef.current = rememberEditorSelection(historyRef.current, selection);
    }

    function commitSource(
      nextValue: string,
      beforeOverride?: EditorSelection | null,
      afterOverride?: EditorSelection,
    ) {
      const before = beforeOverride ?? sourceSelection() ?? historyRef.current.current.selection;
      const after = afterOverride ?? pendingSelectionRef.current ?? before;
      historyRef.current = recordEditorEdit(historyRef.current, nextValue, before, after);
      if (authoringMode === "simple") {
        pendingVisualSelectionRef.current = after;
        pendingSelectionRef.current = null;
        visualSelectionRef.current = after;
        visualSelectionKnownRef.current = true;
      }
      setValue(nextValue);
      // commitSource is used only by discrete editor actions (Enter, toolbar,
      // imperative Reply/Quote), all of which are explicit local-save triggers.
      draft.noteEdit(nextValue, true);
    }

    function changeParagraphDirection(direction: ParagraphDirection) {
      const selection = sourceSelection();
      if (!selection) return;
      const changed = setParagraphDirection(value, selection, direction);
      if (changed && changed.markdown !== value) {
        commitSource(changed.markdown, selection, changed.selection);
      }
    }

    function commitTextareaValue(nextDisplayedValue: string, selectionStart: number, selectionEnd: number) {
      const before = historyRef.current.current.selection;
      const nextValue = applyTextareaEdit(value, nextDisplayedValue);
      const after = {
        start: textareaOffsetToSourceOffset(nextValue, selectionStart),
        end: textareaOffsetToSourceOffset(nextValue, selectionEnd),
      };
      historyRef.current = recordEditorEdit(historyRef.current, nextValue, before, after);
      setValue(nextValue);
      draft.noteEdit(nextValue);
    }

    function travelHistory(direction: "undo" | "redo") {
      const next = direction === "undo"
        ? undoEditorEdit(historyRef.current)
        : redoEditorEdit(historyRef.current);
      if (next === historyRef.current) return;
      historyRef.current = next;
      if (authoringMode === "simple") {
        if (document.activeElement instanceof HTMLElement
          && document.activeElement.matches('[data-visual-text="true"]')) {
          document.activeElement.blur();
        }
        pendingVisualSelectionRef.current = next.current.selection;
        pendingSelectionRef.current = null;
        visualSelectionRef.current = next.current.selection;
        visualSelectionKnownRef.current = true;
      } else {
        pendingSelectionRef.current = next.current.selection;
        pendingVisualSelectionRef.current = null;
      }
      if (mode === "preview") setMode("write");
      setValue(next.current.markdown);
      draft.noteEdit(next.current.markdown, true);
    }
    const [codeLanguage, setCodeLanguage] = useState("");
    const [mode, setMode] = useState<EditorMode>(defaultPreviewOpen ? "preview" : "write");

    useEffect(() => {
      const selection = historyRef.current.current.selection;
      setMentionToken(accountId && draftLocale && mode === "write" && !disabled
        && selection.start === selection.end
        ? mentionTokenAtCaret(value, selection.end)
        : null);
    }, [value, mode, accountId, draftLocale, disabled]);

    const mentionQuery = mentionToken?.query ?? null;
    useEffect(() => {
      setMentionCandidates([]);
      if (!accountId || !draftLocale || !mentionQuery || disabled) return;
      const controller = new AbortController();
      const timer = window.setTimeout(() => {
        void fetch(`/${encodeURIComponent(draftLocale)}/mentions?q=${encodeURIComponent(mentionQuery)}`, {
          signal: controller.signal,
          credentials: "same-origin",
        }).then((result) => result.ok ? result.json() : null)
          .then((payload: unknown) => {
            if (controller.signal.aborted || !payload || typeof payload !== "object") return;
            const users = (payload as { users?: unknown }).users;
            if (!Array.isArray(users)) return;
            setMentionCandidates(users.filter((entry): entry is { id: string; name: string } =>
              !!entry && typeof entry.id === "string" && typeof entry.name === "string").slice(0, 8));
          }).catch(() => { /* Offline editor remains usable without suggestions. */ });
      }, 120);
      return () => { window.clearTimeout(timer); controller.abort(); };
    }, [accountId, draftLocale, mentionQuery, disabled]);

    function chooseMention(user: { id: string; name: string }) {
      const token = mentionToken;
      if (!token || !draftLocale || value.slice(token.start, token.end) !== "@" + token.query) return;
      replaceSourceRange(
        { start: token.start, end: token.end },
        mentionProfileLink(user.name, forumProfilePath(draftLocale, user.id)),
      );
      setMentionToken(null);
      setMentionCandidates([]);
    }

    function syncSplitScroll(source: HTMLElement, target: HTMLElement | null) {
      if (mode !== "split" || !target) return;
      const possible = source.scrollHeight - source.clientHeight;
      const destination = target.scrollHeight - target.clientHeight;
      const next = possible > 0 ? (source.scrollTop / possible) * destination : 0;
      if (Math.abs(target.scrollTop - next) > 1) target.scrollTop = next;
    }

    function updateVisualText(
      range: EditorSelection,
      text: string,
      selectionAfter?: EditorSelection,
      saveLocal = false,
    ) {
      const next = editVisualText(
        historyRef.current,
        range,
        escapeVisualMarkdownText(text),
        selectionAfter,
      );
      if (!next) { switchAuthoring("advanced"); return; }
      historyRef.current = next;
      visualSelectionRef.current = next.current.selection;
      visualSelectionKnownRef.current = true;
      setValue(next.current.markdown);
      draft.noteEdit(next.current.markdown, saveLocal);
    }

    function replaceSourceRange(
      range: EditorSelection,
      replacement: string,
      historyBefore: EditorSelection = range,
    ) {
      if (range.start < 0 || range.end > value.length || range.end < range.start) return;
      const next = value.slice(0, range.start) + replacement + value.slice(range.end);
      const after = { start: range.start + replacement.length, end: range.start + replacement.length };
      historyRef.current = recordEditorEdit(historyRef.current, next, historyBefore, after);
      if (authoringMode === "simple") {
        pendingVisualSelectionRef.current = after;
        visualSelectionRef.current = after;
        visualSelectionKnownRef.current = true;
      } else {
        pendingSelectionRef.current = after;
      }
      setValue(next);
      draft.noteEdit(next, true);
      setPasteWarning(false);
    }

    function extendTable(table: MarkdownTable, dimension: "row" | "column") {
      const next = addTableDimension(value, table, dimension);
      historyRef.current = recordEditorEdit(historyRef.current, next, table.span, table.span);
      setValue(next);
      draft.noteEdit(next, true);
    }

    function pasteSpreadsheet(range: EditorSelection, text: string) {
      const converted = spreadsheetToMarkdown(text);
      if (!converted) {
        replaceSourceRange(range, clipboardPlainToMarkdown(text));
        return;
      }
      replaceSourceRange(range, "\n\n" + converted + "\n\n");
    }

    function insertTechnicalBlock(text: string) {
      const selection = sourceSelection();
      if (!selection) return;
      const leading = selection.start > 0 && value[selection.start - 1] !== "\n" ? "\n\n" : "";
      const trailing = selection.end < value.length && value[selection.end] !== "\n" ? "\n\n" : "";
      replaceSourceRange(selection, leading + text + trailing);
    }

    function insertBlockAfterSelection(text: string) {
      const selection = sourceSelection();
      if (!selection) return;
      const at = selection.end;
      const before = value.slice(0, at);
      const after = value.slice(at);
      const leading = at === 0 || before.endsWith("\n\n")
        ? ""
        : before.endsWith("\n") ? "\n" : "\n\n";
      const trailing = at === value.length
        ? "\n\n"
        : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
      replaceSourceRange({ start: at, end: at }, leading + text + trailing, selection);
    }

    function codeKey(key: string, shift: boolean) {
      const textarea = textareaRef.current;
      if (!textarea) return false;
      const matches: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
      const pair = matches[key];
      if (key !== "Tab" && key !== "Enter" && pair === undefined) return false;

      const selection = sourceSelection();
      if (!selection) return false;
      const { start, end } = selection;
      const codeRange = editableCodeRanges(value).find((range) =>
        start >= range.start
        && end <= range.end
        && (start !== end || start < range.end)
      );
      if (!codeRange) return false;
      if (key === "Tab") {
        const first = Math.max(
          value.lastIndexOf("\n", Math.max(0, start - 1)) + 1,
          codeRange.start,
        );
        const last = value.indexOf("\n", end);
        const right = Math.min(last < 0 ? value.length : last, codeRange.end);
        const block = value.slice(first, right);
        const lines = block.split("\n");
        const edit = shift
          ? lines.map((line) => line.startsWith("  ") ? line.slice(2) : line.startsWith(" ") ? line.slice(1) : line).join("\n")
          : lines.map((line) => "  " + line).join("\n");
        replaceSourceRange({ start: first, end: right }, edit);
        return true;
      }
      if (key === "Enter") {
        const startOfLine = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const indent = /^ */u.exec(value.slice(startOfLine, start))?.[0] ?? "";
        replaceSourceRange({ start, end }, "\n" + indent);
        return true;
      }
      if (pair !== undefined && start === end) {
        replaceSourceRange({ start, end }, key + pair);
        pendingSelectionRef.current = { start: start + 1, end: start + 1 };
        textarea.focus();
        const caret = sourceOffsetToTextareaOffset(value, start + 1);
        textarea.setSelectionRange(caret, caret);
        return true;
      }
      return false;
    }

    async function pasteFromClipboard(format: "plain" | "code") {
      try {
        if (!navigator.clipboard?.readText) throw new Error("Clipboard unsupported");
        const text = await navigator.clipboard.readText();
        if (format === "plain") {
          const selection = sourceSelection();
          if (!selection) { setPasteWarning(true); return; }
          replaceSourceRange(selection, clipboardPlainToMarkdown(text));
          return;
        }
        const fence = String.fromCharCode(96).repeat(Math.max(3, longestBacktickRun(text) + 1));
        insertTechnicalBlock(fence + normalizedCodeLanguage(codeLanguage) + "\n" + text + "\n" + fence);
      } catch { setPasteWarning(true); }
    }

    function clearInlineFormatting() {
      const selection = sourceSelection();
      if (!selection) return;
      const target = selection.start === selection.end
        ? { start: 0, end: value.length }
        : selection;
      const cleared = clearInlineMarkdownFormatting(value, target, selection);
      if (cleared.markdown === value) return;
      commitSource(cleared.markdown, selection, cleared.selection);
      setPasteWarning(false);
    }

    function findNext() {
      if (!findText) return;
      const textarea = textareaRef.current;
      const current = textareaOffsetToSourceOffset(value, textarea?.selectionEnd ?? 0);
      let at = value.indexOf(findText, current);
      if (at < 0) at = value.indexOf(findText);
      if (at < 0) return;
      const selection = { start: at, end: at + findText.length };
      historyRef.current = rememberEditorSelection(historyRef.current, selection);
      setMode("write");
      pendingSelectionRef.current = selection;
    }

    function replaceAllMatches() {
      if (!findText || !value.includes(findText)) return;
      replaceSourceRange({ start: 0, end: value.length }, value.split(findText).join(replaceText));
    }

    function insertVisualParagraph(selection: EditorSelection) {
      replaceSourceRange(selection, "\n\n");
    }

    useLayoutEffect(() => {
      const pending = pendingSelectionRef.current;
      const textarea = textareaRef.current;
      if (!pending || !textarea || mode === "preview" || authoringMode !== "advanced") return;

      textarea.focus();
      textarea.setSelectionRange(
        sourceOffsetToTextareaOffset(value, pending.start),
        sourceOffsetToTextareaOffset(value, pending.end),
      );
      pendingSelectionRef.current = null;
    }, [mode, value, authoringMode]);

    function restoreVisualSelection(selection: EditorSelection) {
      const editor = editorRef.current;
      const restored = !!editor && restoreVisualDomSelection(editor, value, selection);
      if (!restored) {
        visualSelectionRef.current = null;
        visualSelectionKnownRef.current = true;
        return false;
      }
      visualSelectionRef.current = selection;
      visualSelectionKnownRef.current = true;
      historyRef.current = rememberEditorSelection(historyRef.current, selection);
      return true;
    }

    useLayoutEffect(() => {
      const pending = pendingVisualSelectionRef.current;
      if (!pending || authoringMode !== "simple" || mode !== "write") return;
      pendingVisualSelectionRef.current = null;
      restoreVisualSelection(pending);
    }, [value, authoringMode, mode]);

    function replaceSelection(
      prefix: string,
      suffix: string,
      emptySelectionOffset = prefix.length,
    ) {
      const selection = sourceSelection();
      if (!selection) return;
      const { start, end } = selection;
      const selected = value.slice(start, end);
      const nextValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);

      if (selected) {
        pendingSelectionRef.current = {
          start: start + prefix.length,
          end: end + prefix.length,
        };
      } else {
        const caret = start + emptySelectionOffset;
        pendingSelectionRef.current = { start: caret, end: caret };
      }
      commitSource(nextValue);
    }

    function prefixSelectedLines(prefixForLine: (index: number) => string) {
      const selection = sourceSelection();
      if (!selection) return;
      const { start: selectionStart, end: selectionEnd } = selection;

      if (selectionStart === selectionEnd) {
        const lineStart = selectionStart === 0 ? 0 : value.lastIndexOf("\n", selectionStart - 1) + 1;
        const prefix = prefixForLine(0);
        const nextValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
        const caret = selectionStart + prefix.length;
        pendingSelectionRef.current = { start: caret, end: caret };
        commitSource(nextValue);
        return;
      }

      const lineStart = selectionStart === 0 ? 0 : value.lastIndexOf("\n", selectionStart - 1) + 1;
      const effectiveEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
        ? selectionEnd - 1
        : selectionEnd;
      const nextBreak = value.indexOf("\n", effectiveEnd);
      const lineEnd = nextBreak === -1 ? value.length : nextBreak;
      const selectedLines = value.slice(lineStart, lineEnd);
      const transformed = selectedLines
        .split("\n")
        .map((line, index) => prefixForLine(index) + line)
        .join("\n");
      const nextValue = value.slice(0, lineStart) + transformed + value.slice(lineEnd);

      pendingSelectionRef.current = {
        start: lineStart,
        end: lineStart + transformed.length,
      };
      commitSource(nextValue);
    }

    function insertLink() {
      const selection = sourceSelection();
      if (!selection) return;
      const { start, end } = selection;
      const selected = value.slice(start, end);
      const label = selected || t("editorLink");
      const destination = "https://";
      const inserted = "[" + label + "](" + destination + ")";
      const nextValue = value.slice(0, start) + inserted + value.slice(end);

      if (selected) {
        const destinationStart = start + label.length + 3;
        pendingSelectionRef.current = {
          start: destinationStart,
          end: destinationStart + destination.length,
        };
      } else {
        pendingSelectionRef.current = {
          start: start + 1,
          end: start + 1 + label.length,
        };
      }
      commitSource(nextValue);
    }

    function insertFencedCodeBlock() {
      const selection = sourceSelection();
      if (!selection) return;
      const { start, end } = selection;
      const selected = value.slice(start, end);
      const language = normalizedCodeLanguage(codeLanguage);
      const needsLeadingBreak = start > 0 && value[start - 1] !== "\n";
      const needsTrailingBreak = end < value.length && value[end] !== "\n";
      const leading = needsLeadingBreak ? "\n\n" : "";
      const trailing = needsTrailingBreak ? "\n\n" : "";
      const fence = "`".repeat(Math.max(3, longestBacktickRun(selected) + 1));
      const fenceStart = leading + fence + language + "\n";
      const fenceEnd = "\n" + fence + trailing;
      const nextValue = value.slice(0, start) + fenceStart + selected + fenceEnd + value.slice(end);

      if (selected) {
        pendingSelectionRef.current = {
          start: start + fenceStart.length,
          end: start + fenceStart.length + selected.length,
        };
      } else {
        const caret = start + fenceStart.length;
        pendingSelectionRef.current = { start: caret, end: caret };
      }
      commitSource(nextValue);
    }

    useImperativeHandle(forwardedRef, () => ({
      focus() {
        const selection = sourceSelection() ?? historyRef.current.current.selection;
        if (authoringMode === "simple") {
          pendingVisualSelectionRef.current = selection;
          if (mode === "write") {
            pendingVisualSelectionRef.current = null;
            restoreVisualSelection(selection);
          } else {
            visualSelectionRef.current = null;
            visualSelectionKnownRef.current = false;
          }
        } else {
          pendingSelectionRef.current = selection;
          const textarea = textareaRef.current;
          if (mode === "write" && textarea) {
            textarea.focus();
            textarea.setSelectionRange(
              sourceOffsetToTextareaOffset(value, selection.start),
              sourceOffsetToTextareaOffset(value, selection.end),
            );
            pendingSelectionRef.current = null;
          }
        }
        if (mode !== "write") setMode("write");
      },
      insertText(text: string) {
        const selection = sourceSelection() ?? historyRef.current.current.selection;
        const nextValue = value.slice(0, selection.start) + text + value.slice(selection.end);
        const caret = selection.start + text.length;
        const after = { start: caret, end: caret };
        pendingSelectionRef.current = after;
        setMode("write");
        commitSource(nextValue, selection, after);
      },
      setDraftParentPostId(parentPostId: string | null) {
        draft.noteFields({ parentPostId }, true);
      },
      setDraftPublishedRevisionId(revisionId: string) {
        setDraftPublishedRevisionId(revisionId);
        draft.noteFields({ publishedRevisionId: revisionId }, true);
      },
      acknowledgePublished(publishedDraftId: string, publishedVersion: number) {
        draft.acknowledgePublished(publishedDraftId, publishedVersion);
      },
    }), [mode, value, authoringMode, draft]);

    const basicTools = (<>
      <button type="button" disabled={disabled} aria-label={t("editorBold")} title={t("editorBold")}
          onClick={() => replaceSelection("**", "**", 2)}><strong>B</strong></button>
        <button type="button" disabled={disabled} aria-label={t("editorItalic")} title={t("editorItalic")}
          onClick={() => replaceSelection("_", "_", 1)}><em>I</em></button>
    </>);
    const secondaryTools = (<>
      <button type="button" disabled={disabled} aria-label={t("editorStrike")} title={t("editorStrike")}
          onClick={() => replaceSelection("~~", "~~", 2)}><s>S</s></button>
        <button type="button" disabled={disabled} aria-label={t("editorLink")} title={t("editorLink")}
          onClick={insertLink}>↗</button>
        <button type="button" disabled={disabled} aria-label={t("editorBulletedList")} title={t("editorBulletedList")}
          onClick={() => prefixSelectedLines(() => "- ")}>•</button>
        <button type="button" disabled={disabled} aria-label={t("editorNumberedList")} title={t("editorNumberedList")}
          onClick={() => prefixSelectedLines((index) => String(index + 1) + ". ")}>1.</button>
        <button type="button" disabled={disabled} aria-label={t("editorQuote")} title={t("editorQuote")}
          onClick={() => prefixSelectedLines(() => "> ")}>❞</button>
        <details className="markdown-editor-extra-menu">
          <summary aria-label={t("editorEmoji")}>☺</summary>
          <div className="markdown-editor-extra-options">
            {["😀", "🙂", "👍", "❤️"].map((emoji) =>
              <button type="button" key={emoji} disabled={disabled} onClick={() => replaceSelection(emoji, "", emoji.length)}
                aria-label={emoji}>{emoji}</button>,
            )}
          </div>
        </details>
    </>);
    // Touch code controls reuse the same fenced-code Tab/Shift+Tab implementation.
    const compactCodeTools = (<>
      <button type="button" disabled={disabled} title={t("editorCodeIndent")} aria-label={t("editorCodeIndent")}
        onClick={() => { if (codeKey("Tab", false)) textareaRef.current?.focus(); }}>⇥</button>
      <button type="button" disabled={disabled} title={t("editorCodeOutdent")} aria-label={t("editorCodeOutdent")}
        onClick={() => { if (codeKey("Tab", true)) textareaRef.current?.focus(); }}>⇤</button>
    </>);
    const commonTools = (<>
      <div className="markdown-editor-tool-group">
        <button type="button" disabled={disabled} title={t("editorUndo")} aria-label={t("editorUndo")} onClick={() => travelHistory("undo")}>↶</button>
        <button type="button" disabled={disabled} title={t("editorRedo")} aria-label={t("editorRedo")} onClick={() => travelHistory("redo")}>↷</button>
      </div>
      <div className="markdown-editor-tool-group">
        {compactToolbar && authoringMode === "advanced" ? compactCodeTools : basicTools}
        {!compactToolbar ? secondaryTools : null}
      </div>
    </>);
    return (
      <ForumInlineAttachmentProvider attachments={[
        ...(!initialPublishedRevisionId ? existingInlineAttachments : []), ...attachments.previewAttachments,
      ]}>
      <div ref={editorRef} className={"markdown-editor" + (fullScreen ? " is-fullscreen" : "")}
        data-mode={mode} data-authoring={authoringMode}
        role={fullScreen ? "dialog" : undefined}
        aria-modal={fullScreen || undefined}
        aria-label={fullScreen ? t("editorFullScreen") : undefined}
        onDragOver={attachments.handleDragOver}
        onDrop={attachments.handleDrop}
        onPasteCapture={attachments.handlePaste}
        onKeyDownCapture={(event) => {
          if (event.key === "Escape" && fullScreen) setFullScreen(false);
          if (fullScreen && event.key === "Tab") {
            const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
              'button, input, textarea, select, summary, a[href], [contenteditable="true"]',
            )].filter((node) => node.tabIndex >= 0 && !node.matches(":disabled") && node.getClientRects().length > 0);
            const next = event.shiftKey ? controls.at(-1) : controls[0];
            const edge = event.shiftKey ? controls[0] : controls.at(-1);
            if (next && document.activeElement === edge) {
              event.preventDefault();
              next.focus();
              return;
            }
          }
          if (disabled || draftPublicationPending) return;
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            const form = editorRef.current?.closest("form");
            if (!form || !publicationReady) return;
            const explicit = draftPublicationIntent
              ? [...form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')]
                .find((button) => button.name === "intent" && button.value === draftPublicationIntent)
              : undefined;
            if (explicit?.disabled) return;
            form.requestSubmit(explicit);
            return;
          }
          if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
          const key = event.key.toLowerCase();
          if (key === "b" || key === "i" || key === "k") {
            event.preventDefault();
            if (key === "b") replaceSelection("**", "**", 2);
            if (key === "i") replaceSelection("_", "_", 1);
            if (key === "k") insertLink();
            return;
          }
          if (authoringMode === "simple" && (key === "z" || key === "y")) {
            event.preventDefault();
            travelHistory(key === "y" || event.shiftKey ? "redo" : "undo");
          }
        }}
      >
        {accountId && draftContextKey ? (
          <>
            <input ref={draftIdInputRef} type="hidden" name="editorDraftId" value={draft.draftId} readOnly />
            <input ref={draftVersionInputRef} type="hidden" name="editorDraftVersion" value={draft.expectedVersion} readOnly />
            <input type="hidden" name="editorAttachmentIds" value={JSON.stringify(attachments.selectedAttachmentIds)} readOnly />
            {initialPublishedRevisionId ? <input type="hidden" name="editorRetainedAttachmentIds"
              value="[]" readOnly /> : null}
          </>
        ) : null}
        <div className="markdown-editor-toolbar" role="toolbar" aria-label={t("editorToolbar")}>
          <div className="markdown-editor-formatting">
            {commonTools}
              <details className="markdown-editor-extra-menu">
                <summary aria-label={t("editorMoreTools")}>•••</summary>
                <div className="markdown-editor-extra-options">
                  {compactToolbar ? <div className="markdown-editor-tool-group">
                    {authoringMode === "advanced" ? basicTools : null}
                    {secondaryTools}
                  </div> : null}
                  <button type="button" disabled={disabled} onClick={() => prefixSelectedLines(() => "## ")}>H2</button>
                  <button type="button" disabled={disabled} onClick={() => prefixSelectedLines(() => "### ")}>H3</button>
                  <button type="button" disabled={disabled} onClick={() => insertBlockAfterSelection("---")}>—</button>
                  <button type="button" disabled={disabled} aria-label={t("editorSpoiler")}
                    onClick={() => insertBlockAfterSelection(":::spoiler\n\n:::")}>{t("editorSpoiler")}</button>
                  <button type="button" disabled={disabled} aria-label={t("editorTable")}
                    onClick={() => insertBlockAfterSelection("|  |  |\n| --- | --- |\n|  |  |")}>{t("editorTable")}</button>
                  <button type="button" disabled={disabled} aria-label={t("editorClearFormatting")}
                    onClick={clearInlineFormatting}>{t("editorClearFormatting")}</button>
                  <div role="group" aria-label={t("editorTextDirection")} className="markdown-editor-direction">
                    <span>{t("editorTextDirection")}</span>
                    {(["auto", "ltr", "rtl"] as const).map((direction) => (
                      <button type="button" key={direction} disabled={disabled}
                        aria-label={t(direction === "auto" ? "editorDirectionAuto" : direction === "ltr" ? "editorDirectionLTR" : "editorDirectionRTL")}
                        onClick={() => changeParagraphDirection(direction)}>
                        {t(direction === "auto" ? "editorDirectionAuto" : direction === "ltr" ? "editorDirectionLTR" : "editorDirectionRTL")}
                      </button>
                    ))}
                  </div>
                  <label className="markdown-editor-spellcheck"><input type="checkbox" checked={spellCheck} disabled={disabled}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      setSpellCheckPreference(enabled);
                      if (accountId) {
                        try { window.localStorage.setItem("vico:editor:spellcheck:" + accountId, String(enabled)); }
                        catch { /* private browsing */ }
                      }
                    }} />{t("editorSpellcheck")}</label>
                  <button type="button" disabled={disabled} aria-label={t("editorPastePlain")}
                    onClick={() => void pasteFromClipboard("plain")}>{t("editorPastePlain")}</button>
                  {authoringMode === "advanced" ? (
                    <>
            <label className="markdown-editor-language">
              <span>{t("editorCodeLanguage")}</span>
              <input
                type="text"
                dir="ltr"
                value={codeLanguage}
                maxLength={32}
                disabled={disabled}
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={t("editorCodeLanguagePlaceholder")}
                onChange={(event) => setCodeLanguage(event.target.value)}
              />
            </label>

                      <button type="button" disabled={disabled} aria-label={t("editorInlineCode")} onClick={() => {
                        const selection = sourceSelection();
                        if (!selection) return;
                        const { prefix, suffix } = inlineCodeAffixes(value.slice(selection.start, selection.end));
                        replaceSelection(prefix, suffix, prefix.length);
                      }}>{t("editorInlineCode")}</button>
                      <button type="button" disabled={disabled} aria-label={t("editorCodeBlock")}
                        onClick={insertFencedCodeBlock}>{t("editorCodeBlock")}</button>
                      <button type="button" disabled={disabled} aria-label={t("editorPasteCode")}
                        onClick={() => void pasteFromClipboard("code")}>{t("editorPasteCode")}</button>
                      <button type="button" disabled={disabled} aria-label={t("editorFindReplace")}
                        onClick={() => setFindOpen((open) => !open)}>{t("editorFindReplace")}</button>
                    </>
                  ) : null}
                </div>
              </details>
          </div>

          <div className="markdown-editor-controls">
            <button type="button" disabled={disabled} onClick={() => switchAuthoring(authoringMode === "simple" ? "advanced" : "simple")}>
              {t(authoringMode === "simple" ? "editorAdvanced" : "editorSimple")}
            </button>
            {authoringMode === "simple"
              ? <button type="button" disabled={disabled} aria-pressed={mode === "preview"}
                  onClick={() => {
                    if (mode === "preview") {
                      pendingVisualSelectionRef.current =
                        visualSelectionRef.current ?? historyRef.current.current.selection;
                      setMode("write");
                    } else {
                      rememberSelection(sourceSelection());
                      setMode("preview");
                    }
                  }}>{t("editorModePreview")}</button>
              : <details className="markdown-editor-preview-menu">
                  <summary>{t("editorModePreview")}</summary>
                  <div className="markdown-editor-preview-options">
                    {(["write", "preview", "split"] as const).map((item) =>
                      <button type="button" key={item} disabled={disabled} aria-pressed={mode === item}
                        onClick={() => setMode(item)}>
                        {t(item === "write" ? "editorModeMarkdown" : item === "preview" ? "editorModePreview" : "editorModeSplit")}
                      </button>,
                    )}
                  </div>
                </details>}
            <button type="button" disabled={disabled} aria-pressed={fullScreen}
              title={t("editorFullScreen")} aria-label={t("editorFullScreen")}
              onClick={() => setFullScreen((previous) => !previous)}>⛶</button>
          </div>
        </div>

        {authoringMode === "advanced" && findOpen ? (
          <div className="markdown-editor-find" role="group" aria-label={t("editorFindReplace")}>
            <input aria-label={t("editorFind")} value={findText} onChange={(event) => setFindText(event.target.value)} />
            <input aria-label={t("editorReplacement")} value={replaceText} onChange={(event) => setReplaceText(event.target.value)} />
            <button type="button" onClick={findNext}>{t("editorFindNext")}</button>
            <button type="button" onClick={replaceAllMatches}>{t("editorReplaceAll")}</button>
            <button type="button" onClick={() => setFindOpen(false)}>{t("profileCancel")}</button>
          </div>
        ) : null}
        <div className={"markdown-editor-workspace is-" + mode}>
          {authoringMode === "simple" && mode !== "preview" ? (
            <VisualMarkdownEditor
              markdown={value} disabled={disabled} spellCheck={spellCheck}
              onTextEdit={updateVisualText}
              onSelection={(selection) => {
                visualSelectionKnownRef.current = true;
                visualSelectionRef.current = selection;
                rememberSelection(selection);
                setMentionToken(selection && selection.start === selection.end
                  ? mentionTokenAtCaret(value, selection.end) : null);
              }}
              onInsertParagraph={insertVisualParagraph}
              onEditTechnical={(range) => switchAuthoring("advanced", range)}
              onReplaceRange={replaceSourceRange}
              onTableDimension={extendTable}
              onPasteTable={pasteSpreadsheet}
              onPasteFallback={() => setPasteWarning(true)}
            />
          ) : null}
          <div className={"markdown-editor-write-pane" + (mode === "preview" ? " is-preview-hidden" : "")}>
            <input type="hidden" name={name} value={value} disabled={disabled} readOnly />
            <textarea
              ref={textareaRef}
              id={id}
              required={required && attachments.selectedAttachmentIds.length === 0}
              tabIndex={mode === "preview" || authoringMode === "simple" ? -1 : undefined}
              rows={rows}
              disabled={disabled}
              spellCheck={spellCheck}
              aria-describedby={describedBy}
              value={textareaMarkdown(value)}
              onChange={(event) => commitTextareaValue(
                event.currentTarget.value,
                event.currentTarget.selectionStart ?? event.currentTarget.value.length,
                event.currentTarget.selectionEnd ?? event.currentTarget.selectionStart ?? event.currentTarget.value.length,
              )}
              onSelect={(event) => {
                const selection = {
                  start: textareaOffsetToSourceOffset(value, event.currentTarget.selectionStart ?? 0),
                  end: textareaOffsetToSourceOffset(value, event.currentTarget.selectionEnd ?? 0),
                };
                rememberSelection(selection);
                setMentionToken(selection.start === selection.end
                  ? mentionTokenAtCaret(value, selection.end) : null);
              }}
              onKeyUp={(event) => {
                rememberSelection(textareaSourceSelection());
                if (event.key === " " || event.key === "Enter") draft.saveLocal();
              }}
              onPasteCapture={() => { window.setTimeout(() => draft.saveLocal(), 0); }}
              onScroll={(event) => syncSplitScroll(event.currentTarget, previewRef.current)}
              onKeyDown={(event) => {
                if (!disabled && !event.ctrlKey && !event.metaKey && !event.altKey && codeKey(event.key, event.shiftKey)) {
                  event.preventDefault();
                  return;
                }
                if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
                const key = event.key.toLowerCase();
                if (key === "f" && authoringMode === "advanced") {
                  event.preventDefault();
                  setFindOpen(true);
                  return;
                }
                if (key === "z" || key === "y") {
                  event.preventDefault();
                  travelHistory(key === "y" || event.shiftKey ? "redo" : "undo");
                }
              }}
              onBeforeInput={(event) => {
                rememberSelection({
                  start: textareaOffsetToSourceOffset(value, event.currentTarget.selectionStart ?? 0),
                  end: textareaOffsetToSourceOffset(value, event.currentTarget.selectionEnd ?? 0),
                });
                const inputType = (event.nativeEvent as InputEvent).inputType;
                if (inputType !== "historyUndo" && inputType !== "historyRedo") return;
                event.preventDefault();
                travelHistory(inputType === "historyUndo" ? "undo" : "redo");
              }}
              onFocus={() => {
                if (mode === "preview") setMode("write");
                rememberSelection(textareaSourceSelection());
              }}
              onInvalid={() => {
                const selection = textareaSourceSelection();
                if (authoringMode === "simple") {
                  pendingVisualSelectionRef.current = selection;
                  visualSelectionRef.current = selection;
                  visualSelectionKnownRef.current = true;
                  setMode("write");
                  return;
                }
                if (mode === "preview") {
                  pendingSelectionRef.current = selection;
                  setMode("write");
                }
              }}
            />
          </div>

          {pasteWarning ? <p className="markdown-editor-paste-warning" role="alert">{t("editorPasteTableWarning")}</p> : null}
          {mode !== "write" && (
            <section ref={previewRef} id={id + "-preview"} className="markdown-editor-preview" aria-label={t("editorPreviewHeading")}
              onScroll={(event) => syncSplitScroll(event.currentTarget, textareaRef.current)}>
              <header className="markdown-editor-preview-header">
                <strong>{t("editorPreviewHeading")}</strong>
              </header>
              {value.trim() ? (
                <ForumMarkdown>{value}</ForumMarkdown>
              ) : (
                <p className="markdown-editor-preview-empty">{t("editorPreviewEmpty")}</p>
              )}
            </section>
          )}
        </div>
        {mentionToken && mentionCandidates.length > 0 && !disabled && mode === "write" ? (
          <div className="markdown-editor-mentions" role="group" aria-label={t("editorMentionSuggestions")}>
            {mentionCandidates.map((person) => (
              <button type="button" key={person.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseMention(person)}>
                <bdi dir="auto">{person.name}</bdi>
              </button>
            ))}
          </div>
        ) : null}
        {attachments.details}
        {draft.conflictElement}
        <div className="markdown-editor-footer">
          {attachments.controls}
          <div className="markdown-editor-draft-state" aria-live="polite">{draft.statusLabel}</div>
          {actions ? <div className="markdown-editor-actions">{actions}</div> : null}
        </div>
      </div>
      </ForumInlineAttachmentProvider>
    );
  },
);
