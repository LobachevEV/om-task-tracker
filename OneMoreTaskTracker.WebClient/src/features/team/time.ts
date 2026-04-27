import i18n from '../../common/i18n/config';

export function formatLastActive(iso: string | null): string {
  if (!iso) return i18n.t('team:lastActive.never');

  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return i18n.t('team:lastActive.minutesAgo', { count: diffMins });
  }

  if (diffHours < 24) {
    return i18n.t('team:lastActive.hoursAgo', { count: diffHours });
  }

  if (diffDays === 1) {
    return i18n.t('team:lastActive.yesterday');
  }

  return i18n.t('team:lastActive.daysAgo', { count: diffDays });
}
