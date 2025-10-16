interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = 'Загрузка…' }: SpinnerProps) {
  return (
    <div className="spinner" role="status" aria-label={label}>
      <span className="spinner__ring" aria-hidden="true" />
      <span className="spinner__label">{label}</span>
    </div>
  );
}
