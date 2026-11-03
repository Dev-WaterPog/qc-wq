// LCD seven-segment readout. Unlit segments stay faintly visible, as on a real panel meter.
const W = 36, H = 64, T = 6.5, G = 1.2, PITCH = 46;

type Seg = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';
const MAP: Record<string, Seg[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'], '1': ['b', 'c'], '2': ['a', 'b', 'g', 'e', 'd'], '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'], '5': ['a', 'f', 'g', 'c', 'd'], '6': ['a', 'f', 'g', 'e', 'd', 'c'], '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'], '9': ['a', 'b', 'c', 'd', 'f', 'g'], '-': ['g'], ' ': [],
};

const h = (y: number, x0: number, x1: number) =>
  `${x0},${y} ${x0 + T / 2},${y - T / 2} ${x1 - T / 2},${y - T / 2} ${x1},${y} ${x1 - T / 2},${y + T / 2} ${x0 + T / 2},${y + T / 2}`;
const v = (x: number, y0: number, y1: number) =>
  `${x},${y0} ${x + T / 2},${y0 + T / 2} ${x + T / 2},${y1 - T / 2} ${x},${y1} ${x - T / 2},${y1 - T / 2} ${x - T / 2},${y0 + T / 2}`;
const SEGS: Record<Seg, string> = {
  a: h(T / 2, T / 2 + G, W - T / 2 - G),
  g: h(H / 2, T / 2 + G, W - T / 2 - G),
  d: h(H - T / 2, T / 2 + G, W - T / 2 - G),
  f: v(T / 2, T / 2 + G, H / 2 - G),
  b: v(W - T / 2, T / 2 + G, H / 2 - G),
  e: v(T / 2, H / 2 + G, H - T / 2 - G),
  c: v(W - T / 2, H / 2 + G, H - T / 2 - G),
};
const ALL = Object.keys(SEGS) as Seg[];

/** Splits "12.34" into cells: each a glyph plus whether a decimal point follows it. */
function cells(text: string, digits: number): { ch: string; dot: boolean }[] {
  const out: { ch: string; dot: boolean }[] = [];
  for (const ch of text) {
    if (ch === '.' && out.length) out[out.length - 1].dot = true;
    else out.push({ ch, dot: false });
  }
  while (out.length < digits) out.unshift({ ch: ' ', dot: false });
  return out.slice(-digits);
}

export function SevenSeg({ text, digits = 4, label }: { text: string; digits?: number; label: string }) {
  const cs = cells(text, digits);
  const width = digits * PITCH;
  return (
    <svg className="seg7" viewBox={`-4 -2 ${width + 4} ${H + 4}`} role="img" aria-label={label}>
      <g transform="skewX(-7) translate(8 0)">
        {cs.map((c, i) => {
          const on = new Set(MAP[c.ch] ?? []);
          return (
            <g key={i} transform={`translate(${i * PITCH} 0)`}>
              {ALL.map((s) => <polygon key={s} points={SEGS[s]} className={on.has(s) ? 'on' : 'off'} />)}
              <rect x={W + 2.5} y={H - T} width={T} height={T} rx={1} className={c.dot ? 'on' : 'off'} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
