import { Children, isValidElement, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface QuoteGeometry {
  lines: number;
  firstThreeHeight: number;
}

/** Count browser-laid-out text rows, including rows created by responsive wrapping. */
export function measureVisibleQuoteLines(element: HTMLElement): QuoteGeometry | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const rects: DOMRect[] = [];
  const range = document.createRange();
  if (typeof range.getClientRects !== "function") return null;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width > 0 && rect.height > 0) rects.push(rect);
    }
  }
  range.detach();
  if (!rects.length) return null;
  rects.sort((a, b) => a.top - b.top || a.left - b.left);
  const rows: DOMRect[] = [];
  for (const rect of rects) {
    const existing = rows.find((row) =>
      Math.max(0, Math.min(row.bottom, rect.bottom) - Math.max(row.top, rect.top))
      >= Math.min(row.height, rect.height) * 0.6);
    if (!existing) rows.push(rect);
  }
  rows.sort((a, b) => a.top - b.top);
  const top = element.getBoundingClientRect().top;
  return { lines: rows.length, firstThreeHeight: Math.max(0, (rows[2] ?? rows.at(-1)!).bottom - top + 2) };
}

export function ForumQuotedBlock({
  children,
  attributed,
}: {
  children: ReactNode;
  attributed: boolean;
}) {
  const { t } = useTranslation("common");
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [geometry, setGeometry] = useState<QuoteGeometry | null>(null);
  const rendered = Children.toArray(children);
  const firstElement = rendered.findIndex((child) => isValidElement(child));
  const header = attributed && firstElement >= 0 ? rendered[firstElement] : null;
  const body = header ? rendered.filter((_, index) => index !== firstElement) : rendered;
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const update = () => {
      const next = measureVisibleQuoteLines(content);
      setGeometry((previous) =>
        previous?.lines === next?.lines && previous?.firstThreeHeight === next?.firstThreeHeight
          ? previous : next);
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(content);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [children, attributed]);

  const collapsible = geometry !== null && geometry.lines >= 6;
  const collapsed = collapsible && !expanded;
  return (
    <blockquote className="forum-quoted-block">
      {header && <div className="forum-quote-attribution">{header}</div>}
      <div
        className="forum-quote-content"
        id={contentId}
        ref={contentRef}
        style={collapsed ? { maxHeight: geometry.firstThreeHeight, overflow: "hidden" } : undefined}
      >
        {body}
      </div>
      {collapsible && (
        <button
          type="button"
          className="forum-quote-toggle"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((open) => !open)}
        >
          {t(expanded ? "quoteCollapse" : "quoteExpand")}
        </button>
      )}
    </blockquote>
  );
}
