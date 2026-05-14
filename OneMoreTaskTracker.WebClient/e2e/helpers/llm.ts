export const OLLAMA_URL =
  process.env.OLLAMA_HOST ??
  process.env.ALUMNIUM_OLLAMA_URL ??
  'http://127.0.0.1:11434';
export const ALUMNIUM_MODEL = process.env.ALUMNIUM_MODEL ?? 'ollama/qwen3:14b';

function modelTag(): string {
  const [, name] = ALUMNIUM_MODEL.split('/');
  return name ?? '';
}

export async function isOllamaReachable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2_000);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const tag = modelTag();
    if (!tag) return true;
    const body = (await res.json()) as { models?: Array<{ name?: string }> };
    return (body.models ?? []).some((m) => m.name === tag);
  } catch {
    return false;
  }
}
