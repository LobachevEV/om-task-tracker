/**
 * Visually-hidden aria-live region that announces inline-edit outcomes
 * to screen readers. Polite (not assertive) so we don't interrupt the
 * user. Announcement text is supplied by the editor hooks.
 */
export interface InlineLiveRegionProps {
  message: string;
}

export function InlineLiveRegion({ message }: InlineLiveRegionProps) {
  return (
    <div
      className="inline-live-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="inline-live-region"
    >
      {message}
    </div>
  );
}
