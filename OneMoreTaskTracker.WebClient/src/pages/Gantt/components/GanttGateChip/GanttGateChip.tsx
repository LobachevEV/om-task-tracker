import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureGate, GateKey, GateStatus } from '../../../../common/types/feature';
import './GanttGateChip.css';

export interface GanttGateChipProps {
  gate: FeatureGate;
  /** Pixel anchor relative to the lane's left edge. Null when off-range. */
  leftPx: number | null;
  /** True when the manager can flip this gate inline. */
  canEdit: boolean;
  onChangeStatus?: (
    gateKey: GateKey,
    next: GateStatus,
    rejectionReason: string | null,
    gateVersion: number,
  ) => Promise<void> | void;
}

const STATUS_CYCLE: ReadonlyArray<GateStatus> = ['waiting', 'approved', 'rejected'];

function nextStatus(current: GateStatus): GateStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

export function GanttGateChip({
  gate,
  leftPx,
  canEdit,
  onChangeStatus,
}: GanttGateChipProps) {
  const { t } = useTranslation('gantt');

  const labelKey = useMemo<`gates.${GateKey}`>(() => `gates.${gate.gateKey}`, [gate.gateKey]);
  const statusLabel = t(`gateStatus.${gate.status}`);
  const gateLabel = t(labelKey);

  const ariaLabel = t('gates.aria', {
    defaultValue: '{{name}} gate, {{status}}',
    name: gateLabel,
    status: statusLabel,
  });

  const chipStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = {};
    if (leftPx != null) {
      (style as Record<string, string>)['--gate-left'] = `${leftPx}px`;
    }
    return style;
  }, [leftPx]);

  const handleClick = () => {
    if (!canEdit || onChangeStatus == null) return;
    const next = nextStatus(gate.status);
    const reason = next === 'rejected' ? '' : null;
    void onChangeStatus(gate.gateKey, next, reason, gate.version);
  };

  if (leftPx == null) {
    return null;
  }

  return (
    <button
      type="button"
      className="gantt-gate-chip"
      data-testid={`gate-chip-${gate.gateKey}`}
      data-status={gate.status}
      data-gate-key={gate.gateKey}
      data-readonly={canEdit ? 'false' : 'true'}
      style={chipStyle}
      aria-label={ariaLabel}
      title={`${gateLabel} · ${statusLabel}`}
      onClick={handleClick}
      disabled={!canEdit}
    >
      <span className="gantt-gate-chip__dot" aria-hidden="true" />
      <span className="gantt-gate-chip__label">{gateLabel}</span>
    </button>
  );
}
