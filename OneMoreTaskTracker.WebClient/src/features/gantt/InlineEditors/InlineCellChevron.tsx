/**
 * Monoline 10px chevron glyph for inline-editable date and owner cells.
 * Signals "this cell is interactive". Visible only on hover/focus via
 * InlineEditors.css; at rest it is opacity:0 to keep the row minimalist.
 */
export function InlineCellChevron() {
  return (
    <span aria-hidden="true" className="inline-cell__chevron" data-testid="inline-cell-chevron">
      ▾
    </span>
  );
}
