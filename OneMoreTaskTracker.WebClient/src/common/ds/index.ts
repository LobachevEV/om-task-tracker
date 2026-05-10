/**
 * Design system barrel.
 *
 * Components wrap the existing CSS primitives in `src/common/styles/primitives/*`
 * and extend them with typed React APIs. Import from `@/common/ds` in app
 * code — never import sub-paths directly.
 */

export { Button } from './Button/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button/Button';

export { TextField } from './Field/Field';
export type { TextFieldProps } from './Field/Field';

export { Card, CardHeader } from './Card/Card';
export type { CardProps, CardHeaderProps } from './Card/Card';

export { Badge } from './Badge/Badge';
export type { BadgeProps, BadgeTone } from './Badge/Badge';

export { Callout } from './Callout/Callout';
export type { CalloutProps, CalloutTone, CalloutLayout } from './Callout/Callout';

export { Avatar } from './Avatar/Avatar';
export type { AvatarProps, AvatarSize, AvatarTone } from './Avatar/Avatar';
export { roleToAvatarTone } from './Avatar/role-tone';

export { Spinner } from '../components/Spinner/Spinner';

export { Kbd } from './Kbd/Kbd';
export type { KbdProps } from './Kbd/Kbd';

export { StatusDot } from './StatusDot/StatusDot';
export type { StatusDotProps, StatusTone } from './StatusDot/StatusDot';

export { IntegrationIcon } from './IntegrationIcon/IntegrationIcon';
export type { IntegrationIconProps, IntegrationKind } from './IntegrationIcon/IntegrationIcon';

export { signalToTone } from './IntegrationIcon/signal';
export type { IntegrationSignal } from './IntegrationIcon/signal';

export { Dialog } from './Dialog/Dialog';
export type { DialogProps } from './Dialog/Dialog';

export { Popover } from './Popover/Popover';
export type { PopoverProps, Placement } from './Popover/Popover';

export { Stack } from './spatial/Stack/Stack';
export type { StackProps } from './spatial/Stack/Stack';

export { Inline } from './spatial/Inline/Inline';
export type { InlineProps } from './spatial/Inline/Inline';

export { Cluster } from './spatial/Cluster/Cluster';
export type { ClusterProps } from './spatial/Cluster/Cluster';

export { Grid } from './spatial/Grid/Grid';
export type { GridProps } from './spatial/Grid/Grid';

export { Box } from './spatial/Box/Box';
export type { BoxProps } from './spatial/Box/Box';
