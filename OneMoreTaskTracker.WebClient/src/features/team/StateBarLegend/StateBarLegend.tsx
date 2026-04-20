import { useTranslation } from 'react-i18next';
import { TEAM_STATE_ENTRIES } from '../stateConfig';
import './StateBarLegend.css';

export function StateBarLegend() {
  const { t } = useTranslation('tasks');

  return (
    <div className="state-legend">
      {TEAM_STATE_ENTRIES.map((entry) => (
        <div key={entry.key} className="state-legend__entry">
          <div
            className="state-legend__swatch"
            style={{
              backgroundColor: `var(${entry.cssVar})`,
            }}
          />
          <span className="state-legend__label">{t(entry.i18nKey)}</span>
        </div>
      ))}
    </div>
  );
}
