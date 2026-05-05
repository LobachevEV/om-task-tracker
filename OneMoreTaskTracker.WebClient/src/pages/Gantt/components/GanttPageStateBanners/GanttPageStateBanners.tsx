import { useTranslation } from 'react-i18next';
import { Spinner, Button, Callout } from '../../../../common/ds';

export interface GanttPageStateBannersProps {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function GanttPageStateBanners({ loading, error, onRetry }: GanttPageStateBannersProps) {
  const { t } = useTranslation('gantt');
  if (loading) {
    return (
      <div className="gantt-page__centered">
        <Spinner label={t('loading')} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="gantt-page__centered">
        <Callout
          tone="danger"
          action={
            <Button type="button" variant="primary" onClick={onRetry}>
              {t('retry')}
            </Button>
          }
        >
          {t('failed')}
        </Callout>
      </div>
    );
  }
  return null;
}
