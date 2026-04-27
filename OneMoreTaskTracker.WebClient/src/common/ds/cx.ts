/**
 * Minimal class-name joiner. Kept dependency-free — we don't need clsx/classnames
 * for this small surface area. Filters out falsy/empty values.
 */
export type ClassValue = string | number | null | false | undefined;

export function cx(...parts: ClassValue[]): string {
  let out = '';
  for (const p of parts) {
    if (!p) continue;
    out = out ? `${out} ${p}` : String(p);
  }
  return out;
}
