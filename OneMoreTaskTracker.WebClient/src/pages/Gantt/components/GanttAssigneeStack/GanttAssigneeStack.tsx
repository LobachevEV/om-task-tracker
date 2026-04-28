import { Avatar, Badge, roleToAvatarTone } from '../../../../common/ds';
import type { MiniTeamMember } from '../../../../common/types/feature';
import './GanttAssigneeStack.css';

export interface GanttAssigneeStackProps {
  members: MiniTeamMember[];
  max?: number;
  'aria-label': string;
  className?: string;
}

export function GanttAssigneeStack({
  members,
  max = 4,
  'aria-label': ariaLabel,
  className,
}: GanttAssigneeStackProps) {
  const rootClass = className ? `gantt-assignee-stack ${className}` : 'gantt-assignee-stack';

  if (members.length === 0) {
    return (
      <div className={rootClass} role="group" aria-label={ariaLabel}>
        <span className="gantt-assignee-stack__placeholder" aria-hidden="true">?</span>
      </div>
    );
  }

  if (members.length === 1) {
    const only = members[0];
    return (
      <div className={rootClass} role="group" aria-label={ariaLabel}>
        <div className="gantt-assignee-stack__avatars">
          <Avatar
            name={only.displayName}
            size="sm"
            tone={roleToAvatarTone(only.role)}
            title={only.displayName}
          />
        </div>
      </div>
    );
  }

  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div className={rootClass} role="group" aria-label={ariaLabel}>
      <div className="gantt-assignee-stack__avatars">
        {visible.map((m) => (
          <Avatar
            key={m.userId}
            name={m.displayName}
            size="sm"
            tone={roleToAvatarTone(m.role)}
            title={m.displayName}
          />
        ))}
      </div>
      {overflow > 0 ? (
        <Badge tone="neutral" dot={false} className="gantt-assignee-stack__overflow">
          +{overflow}
        </Badge>
      ) : null}
    </div>
  );
}
