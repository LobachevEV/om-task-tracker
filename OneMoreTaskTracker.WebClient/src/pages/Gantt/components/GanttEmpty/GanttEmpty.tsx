import { useTranslation } from 'react-i18next';
import type { FeatureSummary } from '../../../../common/types/feature';
import { AddFeatureRow } from '../AddFeatureRow';
import './GanttEmpty.css';

export interface GanttEmptyProps {
  isManager: boolean;
  onCreated: (feature: FeatureSummary) => void;
}

export function GanttEmpty({ isManager, onCreated }: GanttEmptyProps) {
  const { t } = useTranslation('gantt');

  return (
    <div className="gantt-empty" role="status" aria-live="polite">
      <svg
        className="gantt-empty__icon"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="6" y="10" width="28" height="4" rx="2" />
        <rect x="10" y="20" width="20" height="4" rx="2" />
        <rect x="14" y="30" width="14" height="4" rx="2" />
        <line x1="40" y1="6" x2="40" y2="42" strokeDasharray="2 3" />
      </svg>
      <h3 className="gantt-empty__title">{t('empty.title')}</h3>
      <p className="gantt-empty__body">{t('empty.body')}</p>
      {isManager ? (
        <AddFeatureRow variant="standalone" onCreated={onCreated} />
      ) : null}
    </div>
  );
}
