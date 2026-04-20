import { useTranslation } from 'react-i18next';
import type { StateMix } from '../../shared/api/teamApi';
import { TEAM_STATE_ENTRIES } from './stateConfig';
import './StateBar.css';

interface StateBarProps {
  mix: StateMix;
}

export function StateBar({ mix }: StateBarProps) {
  const { t } = useTranslation('tasks');
  const states = TEAM_STATE_ENTRIES.map((entry) => ({
    key: entry.key,
    label: t(entry.i18nKey),
    count: mix[entry.key],
  }));

  const total = mix.inDev + mix.mrToRelease + mix.inTest + mix.mrToMaster + mix.completed;
  const isEmpty = total === 0;

  // Build aria-label: list every state with its count
  const ariaLabel = states.map((s) => `${s.label}: ${s.count}`).join(', ');

  if (isEmpty) {
    return (
      <div className="statebar statebar__empty" role="img" aria-label={ariaLabel} />
    );
  }

  return (
    <div className="statebar" role="img" aria-label={ariaLabel}>
      {states.map((s) =>
        s.count > 0 ? (
          <div
            key={s.key}
            className={`statebar__segment statebar__segment--${s.key}`}
            style={{ flex: s.count }}
          />
        ) : null
      )}
    </div>
  );
}
