/** Word-level diff between the learner's sentence and the corrected one (LCS). */
export function diffWords(from: string, to: string): { text: string; type: 'same' | 'add' | 'del' }[] {
  const a = from.split(/\s+/).filter(Boolean);
  const b = to.split(/\s+/).filter(Boolean);
  const key = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = key(a[i]) === key(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: { text: string; type: 'same' | 'add' | 'del' }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (key(a[i]) === key(b[j])) {
      out.push({ text: b[j], type: 'same' });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ text: a[i++], type: 'del' });
    else out.push({ text: b[j++], type: 'add' });
  }
  while (i < a.length) out.push({ text: a[i++], type: 'del' });
  while (j < b.length) out.push({ text: b[j++], type: 'add' });
  return out;
}

export function Diff({ from, to }: { from: string; to: string }) {
  return (
    <span className="leading-relaxed">
      {diffWords(from, to).map((p, i) => (
        <span
          key={i}
          className={p.type === 'add' ? 'rounded bg-emerald-500/25 px-0.5 font-semibold text-emerald-200' : p.type === 'del' ? 'text-red-300/80 line-through decoration-red-400/80' : ''}
        >
          {p.text}{' '}
        </span>
      ))}
    </span>
  );
}
