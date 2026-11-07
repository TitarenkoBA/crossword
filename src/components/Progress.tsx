/** Полоска прогресса (0…100). Цвет — только украшение: число всегда рядом текстом. */
export function Progress({ value, color = 'var(--c-primary)' }: { value: number; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className="progress block w-full" aria-hidden="true">
      <span style={{ width: v + '%', backgroundColor: color }} />
    </span>
  );
}
