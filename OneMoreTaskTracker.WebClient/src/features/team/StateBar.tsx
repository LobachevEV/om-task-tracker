import type { StateMix } from '../../shared/api/teamApi';
import './StateBar.css';

interface StateBarProps {
  mix: StateMix;
}

export function StateBar({ mix }: StateBarProps) {
  const states = [
    { key: 'inDev', label: 'В разработке · In Dev', count: mix.inDev },
    { key: 'mrToRelease', label: 'MR в релиз · MR to Release', count: mix.mrToRelease },
    { key: 'inTest', label: 'В тесте · In Test', count: mix.inTest },
    { key: 'mrToMaster', label: 'MR в мастер · MR to Master', count: mix.mrToMaster },
    { key: 'completed', label: 'Готово · Completed', count: mix.completed },
  ] as const;

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
