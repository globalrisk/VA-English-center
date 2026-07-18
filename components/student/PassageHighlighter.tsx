"use client";

import {
  HIGHLIGHTABLE_CLASS,
  HIGHLIGHT_COLORS,
  clearAllHighlights,
  findHighlightSpan,
  highlightSelection,
  removeHighlight,
  setHighlightColor,
  setHighlightNote,
  type HighlightColorId,
} from "@/lib/text-highlight";
import { memo, useEffect, useRef, useState } from "react";

type ToolbarState = {
  x: number;
  y: number;
  span: HTMLElement | null;
  mode: "selection" | "edit";
};

type Props = {
  children: React.ReactNode;
};

function PassageHighlighterInner({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [colorId, setColorId] = useState<HighlightColorId>("yellow");
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [noteEditorKey, setNoteEditorKey] = useState(0);

  // Focus once when the note dialog opens — not on every keystroke.
  useEffect(() => {
    if (noteEditorKey === 0) return;
    const input = noteInputRef.current;
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [noteEditorKey]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function hideToolbar() {
      setToolbar(null);
    }

    function placeToolbarNearRect(rect: DOMRect, span: HTMLElement | null, mode: ToolbarState["mode"]) {
      const container = root!.getBoundingClientRect();
      const x = Math.min(
        Math.max(rect.left + rect.width / 2 - container.left, 48),
        container.width - 48
      );
      const y = Math.max(rect.top - container.top - 8, 8);
      setToolbar({ x, y, span, mode });
    }

    function onMouseUp(event: MouseEvent) {
      if (!(event.target instanceof Node) || !root!.contains(event.target)) return;
      if (
        event.target instanceof Element &&
        (event.target.closest(".rt-hl-toolbar") || event.target.closest(".rt-hl-note-dialog"))
      ) {
        return;
      }

      const selection = window.getSelection();
      const hasSelection =
        Boolean(selection) &&
        !selection!.isCollapsed &&
        Boolean(selection!.toString().trim());

      if (hasSelection) {
        if (!enabled) return;
        const id = highlightSelection(root!, colorId);
        if (!id) return;
        const first = root!.querySelector(
          `.rt-hl[data-hl-id="${id}"]`
        ) as HTMLElement | null;
        if (first) {
          placeToolbarNearRect(first.getBoundingClientRect(), first, "edit");
        }
        return;
      }

      // Clicking an existing highlight opens the edit toolbar (even if toggle is off).
      const existing = findHighlightSpan(event.target);
      if (existing) {
        placeToolbarNearRect(existing.getBoundingClientRect(), existing, "edit");
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest(".rt-hl-toolbar") || target.closest(".rt-hl-note-dialog"))
      ) {
        return;
      }
      // Defer hide so mouseup on a highlight can still open toolbar.
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) return;
        if (target instanceof Element && findHighlightSpan(target)) return;
        if (noteDraft !== null) return;
        hideToolbar();
      });
    }

    root.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      root.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [enabled, colorId, noteDraft]);

  function applyColor(next: HighlightColorId) {
    setColorId(next);
    if (toolbar?.span) {
      setHighlightColor(toolbar.span, next);
    }
  }

  function handleRemove() {
    if (!toolbar?.span) return;
    removeHighlight(toolbar.span);
    setNoteDraft(null);
    setToolbar(null);
  }

  function handleNote() {
    if (!toolbar?.span) return;
    setNoteDraft(toolbar.span.dataset.note ?? "");
    setNoteEditorKey((key) => key + 1);
  }

  function saveNote() {
    if (!toolbar?.span || noteDraft === null) return;
    setHighlightNote(toolbar.span, noteDraft);
    setNoteDraft(null);
  }

  function cancelNote() {
    setNoteDraft(null);
  }

  function clearNote() {
    if (!toolbar?.span) return;
    setHighlightNote(toolbar.span, "");
    setNoteDraft(null);
  }

  function handleClearAll() {
    const root = rootRef.current;
    if (!root) return;
    if (!window.confirm("Clear all highlights in the passage?")) return;
    clearAllHighlights(root);
    setNoteDraft(null);
    setToolbar(null);
  }

  return (
    <div className="rt-hl-panel">
      <div className="rt-hl-controls">
        <label className="rt-hl-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Highlight text</span>
        </label>
        <div className="rt-hl-swatches" role="group" aria-label="Highlight color">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`rt-hl-swatch ${colorId === color.id ? "is-active" : ""}`}
              style={{ backgroundColor: color.value }}
              title={color.label}
              aria-label={color.label}
              onClick={() => applyColor(color.id)}
            />
          ))}
        </div>
        <button type="button" className="rt-hl-clear" onClick={handleClearAll}>
          Clear all
        </button>
      </div>
      <p className="rt-hl-hint">
        {enabled
          ? "Select text in the passage to highlight. Click a highlight to change color, add a note, or remove it."
          : "Highlighting is off."}
      </p>

      <div
        ref={rootRef}
        className={`${HIGHLIGHTABLE_CLASS} ${enabled ? "is-hl-enabled" : ""}`}
      >
        {children}
        {toolbar && noteDraft === null && (
          <div
            className="rt-hl-toolbar"
            style={{ left: toolbar.x, top: toolbar.y }}
            role="toolbar"
            aria-label="Highlight tools"
          >
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                className={`rt-hl-swatch ${colorId === color.id ? "is-active" : ""}`}
                style={{ backgroundColor: color.value }}
                title={color.label}
                aria-label={color.label}
                onClick={() => applyColor(color.id)}
              />
            ))}
            <button
              type="button"
              className="rt-hl-tool"
              onClick={handleNote}
              title="Add note"
              aria-label="Add note"
            >
              <NoteIcon />
            </button>
            <button
              type="button"
              className="rt-hl-tool is-danger"
              onClick={handleRemove}
              title="Remove highlight"
              aria-label="Remove highlight"
            >
              <TrashIcon />
            </button>
          </div>
        )}

        {toolbar && noteDraft !== null && (
          <div
            className="rt-hl-note-dialog"
            style={{ left: toolbar.x, top: toolbar.y }}
            role="dialog"
            aria-label="Highlight note"
          >
            <div className="rt-hl-note-dialog-pin" aria-hidden="true" />
            <p className="rt-hl-note-dialog-title">Sticky note</p>
            <textarea
              ref={noteInputRef}
              className="rt-hl-note-dialog-input"
              value={noteDraft}
              rows={3}
              maxLength={120}
              placeholder="Write a short note…"
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelNote();
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveNote();
                }
              }}
            />
            <div className="rt-hl-note-dialog-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={cancelNote}>
                Cancel
              </button>
              {(toolbar.span?.dataset.note || noteDraft.trim()) && (
                <button type="button" className="rt-hl-note-clear" onClick={clearNote}>
                  Clear
                </button>
              )}
              <button type="button" className="btn btn-primary btn-sm" onClick={saveNote}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zm3.46-9.12 1.41-1.41L12 10.59l1.12-1.12 1.41 1.41L13.41 12l1.12 1.12-1.41 1.41L12 13.41l-1.12 1.12-1.41-1.41L10.59 12l-1.13-1.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"
      />
    </svg>
  );
}

export const PassageHighlighter = memo(PassageHighlighterInner);
