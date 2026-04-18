import './StateBarLegend.css';

export function StateBarLegend() {
  const states = [
    { key: 'inDev', label: 'В разработке · In Dev', variable: '--state-in-dev' },
    { key: 'mrToRelease', label: 'MR в релиз · MR to Release', variable: '--state-mr-release' },
    { key: 'inTest', label: 'В тесте · In Test', variable: '--state-in-test' },
    { key: 'mrToMaster', label: 'MR в мастер · MR to Master', variable: '--state-mr-master' },
    { key: 'completed', label: 'Готово · Completed', variable: '--state-completed' },
  ] as const;

  return (
    <div className="state-legend">
      {states.map((s) => (
        <div key={s.key} className="state-legend__entry">
          <div
            className="state-legend__swatch"
            style={{
              backgroundColor: `var(${s.variable})`,
            }}
          />
          <span className="state-legend__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
