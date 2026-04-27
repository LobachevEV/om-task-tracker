/**
 * Lifecycle state for an inline-edit cell.
 *
 * - `idle`    — read-only or paused between edits.
 * - `editing` — the user is typing inside an input / choosing in a picker.
 * - `pending` — optimistic value applied locally, PATCH in flight.
 * - `error`   — last commit rejected; inline hairline is `--danger` until next keystroke.
 */
export type InlineEditorStatus = 'idle' | 'editing' | 'pending' | 'error';
