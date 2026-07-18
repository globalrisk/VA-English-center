export const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Yellow", value: "#ffe566" },
  { id: "pink", label: "Pink", value: "#ffb3c6" },
  { id: "blue", label: "Blue", value: "#9fd8f0" },
  { id: "green", label: "Green", value: "#b8e0b8" },
] as const;

export type HighlightColorId = (typeof HIGHLIGHT_COLORS)[number]["id"];

export const HIGHLIGHT_CLASS = "rt-hl";
export const HIGHLIGHTABLE_CLASS = "text-highlightable";

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

export function colorValue(id: HighlightColorId): string {
  return HIGHLIGHT_COLORS.find((c) => c.id === id)?.value ?? HIGHLIGHT_COLORS[0].value;
}

export function selectionInsideRoot(root: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  // Both endpoints must stay inside the highlightable root.
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  return range;
}

function splitTextAt(node: Text, offset: number): Text {
  return node.splitText(offset);
}

function collectTextNodes(range: Range): Text[] {
  const root =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentNode;
  if (!root) return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      // Never wrap note labels as highlight text.
      if (isElement(node.parentElement!) && node.parentElement.closest(".rt-hl-note")) {
        return NodeFilter.FILTER_REJECT;
      }
      try {
        const nodeRange = document.createRange();
        nodeRange.selectNodeContents(node);
        const startsBeforeEnd =
          range.compareBoundaryPoints(Range.END_TO_START, nodeRange) !== 1;
        const endsAfterStart =
          range.compareBoundaryPoints(Range.START_TO_END, nodeRange) !== -1;
        return startsBeforeEnd && endsAfterStart
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      } catch {
        return NodeFilter.FILTER_REJECT;
      }
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (isText(current)) nodes.push(current);
    current = walker.nextNode();
  }
  return nodes;
}

/** Wrap the current selection (must be inside root) with highlight spans. */
export function highlightSelection(
  root: HTMLElement,
  colorId: HighlightColorId
): string | null {
  const range = selectionInsideRoot(root);
  if (!range) return null;

  // Don't create empty / whitespace-only highlights.
  if (!range.toString().trim()) return null;

  let working = range.cloneRange();

  // Split boundary text nodes so we only wrap the selected portion.
  if (isText(working.endContainer) && working.endOffset < working.endContainer.length) {
    splitTextAt(working.endContainer, working.endOffset);
  }
  if (isText(working.startContainer) && working.startOffset > 0) {
    const after = splitTextAt(working.startContainer, working.startOffset);
    working.setStart(after, 0);
  }

  const textNodes = collectTextNodes(working);
  if (textNodes.length === 0) return null;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const bg = colorValue(colorId);

  for (const textNode of textNodes) {
    // Unwrap if already highlighted so we can re-color the selection cleanly.
    const parent = textNode.parentElement;
    if (parent?.classList.contains(HIGHLIGHT_CLASS) && parent.childNodes.length === 1) {
      parent.style.backgroundColor = bg;
      parent.dataset.hlColor = colorId;
      parent.dataset.hlId = id;
      continue;
    }

    const span = document.createElement("span");
    span.className = HIGHLIGHT_CLASS;
    span.dataset.hlId = id;
    span.dataset.hlColor = colorId;
    span.style.backgroundColor = bg;
    textNode.parentNode?.insertBefore(span, textNode);
    span.appendChild(textNode);
  }

  window.getSelection()?.removeAllRanges();
  return id;
}

export function findHighlightSpan(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest(`.${HIGHLIGHT_CLASS}`);
}

export function setHighlightColor(span: HTMLElement, colorId: HighlightColorId) {
  const id = span.dataset.hlId;
  const bg = colorValue(colorId);
  const root = span.closest(`.${HIGHLIGHTABLE_CLASS}`) ?? document;
  const group = id
    ? root.querySelectorAll(`.${HIGHLIGHT_CLASS}[data-hl-id="${id}"]`)
    : [span];

  group.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.style.backgroundColor = bg;
    el.dataset.hlColor = colorId;
  });
}

export function removeHighlight(span: HTMLElement) {
  const id = span.dataset.hlId;
  const root = span.closest(`.${HIGHLIGHTABLE_CLASS}`) ?? document;
  const group = id
    ? Array.from(root.querySelectorAll(`.${HIGHLIGHT_CLASS}[data-hl-id="${id}"]`))
    : [span];

  for (const el of group) {
    const parent = el.parentNode;
    if (!parent) continue;
    // Drop note labels — do not unwrap them into the passage text.
    el.querySelectorAll(".rt-hl-note").forEach((note) => note.remove());
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  }
}

export function clearAllHighlights(root: HTMLElement) {
  // Remove any orphaned note labels first (e.g. from older unwrap bugs).
  root.querySelectorAll(".rt-hl-note").forEach((note) => note.remove());

  const spans = Array.from(root.querySelectorAll(`.${HIGHLIGHT_CLASS}`));
  for (const span of spans) {
    if (span instanceof HTMLElement) removeHighlight(span);
  }
}

export function setHighlightNote(span: HTMLElement, note: string) {
  const id = span.dataset.hlId;
  const root = span.closest(`.${HIGHLIGHTABLE_CLASS}`) ?? document;
  const group = Array.from(
    id
      ? root.querySelectorAll(`.${HIGHLIGHT_CLASS}[data-hl-id="${id}"]`)
      : [span]
  ).filter((el): el is HTMLElement => el instanceof HTMLElement);
  const trimmed = note.trim();

  for (const el of group) {
    el.querySelectorAll(":scope > .rt-hl-note").forEach((n) => n.remove());
    delete el.dataset.note;
    el.classList.remove("has-note");
  }

  if (!trimmed || group.length === 0) return;

  const first = group[0];
  first.dataset.note = trimmed;
  first.classList.add("has-note");

  const noteEl = document.createElement("span");
  noteEl.className = "rt-hl-note";
  noteEl.textContent = trimmed;
  noteEl.setAttribute("contenteditable", "false");
  first.insertBefore(noteEl, first.firstChild);

  // Keep data-note on siblings for edit prompts; only the first shows the label.
  for (let i = 1; i < group.length; i += 1) {
    group[i].dataset.note = trimmed;
  }
}
