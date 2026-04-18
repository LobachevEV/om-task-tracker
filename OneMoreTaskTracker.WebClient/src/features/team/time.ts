/**
 * Format a timestamp to a human-readable relative time in Russian.
 * Returns "—" for null, otherwise one of:
 * - "<N> мин назад" (minutes ago)
 * - "<N> ч назад" (hours ago)
 * - "вчера" (yesterday)
 * - "<N> дн назад" (days ago)
 */
export function formatLastActiveRu(iso: string | null): string {
  if (!iso) return '—';

  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins} мин назад`;
  }

  if (diffHours < 24) {
    return `${diffHours} ч назад`;
  }

  if (diffDays === 1) {
    return 'вчера';
  }

  return `${diffDays} дн назад`;
}
