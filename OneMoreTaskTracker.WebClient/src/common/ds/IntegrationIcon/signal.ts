import type { StatusTone } from '../StatusDot/StatusDot';

export type IntegrationSignal = 'waiting' | 'passed' | 'failed' | 'none';

export function signalToTone(signal: IntegrationSignal): StatusTone | null {
  switch (signal) {
    case 'waiting':
      return 'blocked';
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'none':
      return null;
  }
}
