function pascalToSnake(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export function stageBarErrorTestId(featureId: number, kind: string, stageKey: string): string {
  return `stage-bar-save-error-${featureId}-${kind.toLowerCase()}-${pascalToSnake(stageKey)}`;
}
