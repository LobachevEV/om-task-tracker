import type { Task } from '../../common/types/task';

export type IntegrationKind = 'git' | 'jira' | 'confluence' | 'slack';
export type IntegrationSignal = 'waiting' | 'passed' | 'failed' | 'none';

export interface IntegrationIndicator {
  kind: IntegrationKind;
  signal: IntegrationSignal;
  tooltip: string; // plain language, Russian
}

// Placeholder derivation from state until backend exposes real webhook data
// In production, these signals would come from real Confluence/Git/Jira webhook integrations
export function deriveIntegrations(task: Task): IntegrationIndicator[] {
  const out: IntegrationIndicator[] = [];

  switch (task.state) {
    case 'NotStarted':
      out.push({ kind: 'jira', signal: 'waiting', tooltip: 'Ожидает назначения в Jira' });
      break;
    case 'InDev':
      out.push({ kind: 'git', signal: 'waiting', tooltip: 'Разработка в ветке' });
      break;
    case 'MrToRelease':
      out.push({ kind: 'git', signal: 'waiting', tooltip: 'MR в release — ожидает review' });
      out.push({ kind: 'confluence', signal: 'waiting', tooltip: 'Ожидает подтверждения CS' });
      break;
    case 'InTest':
      out.push({ kind: 'jira', signal: 'waiting', tooltip: 'QA в работе' });
      break;
    case 'MrToMaster':
      out.push({ kind: 'git', signal: 'waiting', tooltip: 'MR в master — финальный гейт' });
      break;
    case 'Completed':
      out.push({ kind: 'git', signal: 'passed', tooltip: 'Слито в master' });
      break;
  }

  return out;
}
