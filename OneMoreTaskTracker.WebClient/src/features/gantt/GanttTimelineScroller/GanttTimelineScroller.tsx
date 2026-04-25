import { forwardRef, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import './GanttTimelineScroller.css';

export interface GanttTimelineScrollerProps {
  /**
   * Px width of the scrollable content (loaded range plus any cushion / chunk
   * stripes the page has placed inside). Drives the inner inline-size so the
   * native horizontal scrollbar appears.
   */
  contentWidthPx: number;
  /**
   * Px offset of `today` from the leading edge of the scrollable content.
   * Drives the visibility of the off-screen today chip.
   */
  todayPx: number;
  /**
   * Called when the user clicks the off-screen today chip. The page wires
   * this to `scrollToToday`.
   */
  onJumpToToday: () => void;
  /**
   * The scrollable content. Page composes the date header + cushions +
   * lanes here.
   */
  children: ReactNode;
  className?: string;
}

/**
 * Single horizontally-scrolling container for the Gantt date axis. Owns:
 *  - the native horizontal scrollbar,
 *  - the off-screen `Today` chip (top-right) that appears once today scrolls
 *    out of the viewport,
 *  - the a11y `role="region"` + label.
 *
 * Vertical scroll is the page's existing vertical scroll (this scroller's
 * `overflow-y` is `hidden`).
 *
 * Forwards its scrollable element through `ref` so the page's
 * `useGanttTimelineScroll` hook can attach to it.
 */
export const GanttTimelineScroller = forwardRef<
  HTMLDivElement,
  GanttTimelineScrollerProps
>(function GanttTimelineScroller(
  { contentWidthPx, todayPx, onJumpToToday, children, className },
  ref,
) {
  const { t } = useTranslation('gantt');
  const [todayInView, setTodayInView] = useState(true);
  // Track scroll position so we know when today has scrolled off-screen.
  // We store the local element reference here purely for the scroll listener
  // because the parent owns the scrollerRef via `forwardRef`.
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  // Compose the parent's ref + our own state-backed ref so we can listen to
  // scroll events for the chip-visibility flag.
  const setRef = (node: HTMLDivElement | null) => {
    setEl(node);
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  useEffect(() => {
    if (!el) return;
    const onScroll = () => {
      const sl = el.scrollLeft;
      const cw = el.clientWidth;
      const visible = todayPx >= sl && todayPx <= sl + cw;
      setTodayInView(visible);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [el, todayPx]);

  const innerStyle: CSSProperties = { inlineSize: `${contentWidthPx}px` };
  const rootClassName = className
    ? `gantt-timeline-scroller ${className}`
    : 'gantt-timeline-scroller';

  return (
    <div className={rootClassName}>
      <div
        ref={setRef}
        className="gantt-timeline-scroller__viewport"
        role="region"
        aria-label={t('scroller.label', {
          defaultValue: 'Gantt timeline, scrollable date axis',
        })}
        tabIndex={0}
      >
        <div className="gantt-timeline-scroller__inner" style={innerStyle}>
          {children}
        </div>
      </div>
      {todayInView ? null : (
        <button
          type="button"
          className="gantt-timeline-scroller__today-chip"
          onClick={onJumpToToday}
          aria-label={t('chip.todayAria', {
            defaultValue: 'Jump to today',
          })}
        >
          {t('chip.today', { defaultValue: '▸ Today' })}
        </button>
      )}
    </div>
  );
});
