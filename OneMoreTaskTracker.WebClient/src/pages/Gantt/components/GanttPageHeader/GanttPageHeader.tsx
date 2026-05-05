import { useTranslation } from 'react-i18next';
import { Button, Callout } from '../../../../common/ds';
import { GanttToolbar } from '../GanttToolbar';
import type { GanttPageState } from '../../useGanttPageState';

export interface GanttPageHeaderProps {
  state: GanttPageState;
  rosterError: Error | null;
  rosterLoading: boolean;
  onRosterRetry: () => void;
}

export function GanttPageHeader({
  state,
  rosterError,
  rosterLoading,
  onRosterRetry,
}: GanttPageHeaderProps) {
  const { t } = useTranslation('gantt');
  return (
    <>
      <GanttToolbar
        zoom={state.zoom}
        scope={state.scope}
        stateFilter={state.stateFilter}
        onZoomChange={state.setZoom}
        onScopeChange={state.setScope}
        onStateFilterChange={state.setStateFilter}
      />

      <div className="gantt-page__narrow-notice" role="note">
        {t('narrowViewport.notice')}
      </div>

      {rosterError ? (
        <Callout
          tone="warning"
          layout="banner"
          aria-label={t('row.team')}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRosterRetry}
              loading={rosterLoading}
            >
              {t('retry')}
            </Button>
          }
        >
          {t('row.team')}: {t('failed')}
        </Callout>
      ) : null}
    </>
  );
}
