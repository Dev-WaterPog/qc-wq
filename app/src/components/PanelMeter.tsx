import { SevenSeg } from './SevenSeg';
import { LIM, LIMIT_TEXT, PLONG, PNAME, SCALE, STAGE_NAME, STAGE_SRC, UNIT, WARN, judge, readingWord, toneClass, type Param, type Stage } from '../lib/quality';

const BARS = 24;

function display(p: Param, v: number | null): string {
  if (v == null) return '----';
  if (p === 'ph') return v.toFixed(2);
  if (v >= 1000) return String(Math.round(v));
  return v % 1 === 0 ? String(v) : String(+v.toFixed(v < 10 ? 2 : 1));
}

/** Panel-mounted digital meter: bezel, LCD with seven-segment value, bargraph against the limits, side keys and a status lamp. */
export function PanelMeter({ p, v, stage, onPrev, onNext }: {
  p: Param; v: number | null; stage: Stage; onPrev: () => void; onNext: () => void;
}) {
  const r = judge(p, v);
  const [s0, s1] = SCALE[p];
  const at = (x: number) => Math.max(0, Math.min(1, (x - s0) / (s1 - s0)));
  const lit = v == null ? 0 : Math.max(1, Math.round(at(v) * BARS));
  const [lo, hi] = LIM[p], [wlo, whi] = WARN[p];
  const zoneOf = (i: number) => {
    const z = judge(p, s0 + ((i + 0.5) / BARS) * (s1 - s0));
    return `z-${z.lv}${toneClass(p, z)}`;
  };
  const tc = toneClass(p, r);
  const flags = p === 'ph'
    ? [['low', 'ต่ำ'], ['ok', 'ปกติ'], ['high', 'สูง']] as const
    : [['ok', 'ปกติ'], ['high', 'เกิน']] as const;
  const active = r.lv === 'nd' ? '' : r.lv === 'ok' ? 'ok' : r.lv === 'risk' ? 'ok' : r.dir;

  return (
    <figure className={`pm lv-${r.lv}${tc.replace('tone-', 'r-')}`}aria-label={`${PNAME[p]} ${display(p, v)} ${readingWord(p, r)}`}>
      <div className="pm-top">
        <span className="pm-brand">มาตรวัด {PNAME[p]}</span>
        <span className="pm-model">เกณฑ์ {LIMIT_TEXT[p]}</span>
      </div>
      <div className="pm-body">
        <div className="lcd">
          <div className="lcd-row">
            <span className="lcd-tag">{STAGE_NAME[stage]} · {STAGE_SRC[stage]}</span>
            <span className="lcd-flags">
              {flags.map(([k, w]) => (
                <span key={k} className={`${active === k ? 'on' : ''}${p === 'ph' && k === 'low' ? ' tone-acid' : p === 'ph' && k === 'high' ? ' tone-base' : ''}`}>{w}</span>
              ))}
            </span>
          </div>
          <div className="lcd-main">
            <SevenSeg text={display(p, v)} digits={4} label={`${PNAME[p]} ${display(p, v)}`} />
            <span className="lcd-unit">{UNIT[p]}</span>
          </div>
          <div className="lcd-bar" aria-hidden="true">
            {Array.from({ length: BARS }, (_, i) => (
              <i key={i} className={`${i < lit ? 'on' : ''} ${zoneOf(i)}`} />
            ))}
          </div>
          <div className="lcd-scale" aria-hidden="true">
            {[lo, wlo, whi, hi].filter((x, i, a): x is number => x != null && a.indexOf(x) === i).map((x) => (
              <span key={x} style={{ left: `${at(x) * 100}%` }} className={x === lo || x === hi ? 'lim' : 'warn'}>{x}</span>
            ))}
          </div>
          <div className={`lcd-word${tc}`}>{v == null ? 'ไม่มีผลตรวจ' : readingWord(p, r)}</div>
        </div>
        <div className="pm-keys">
          <button type="button" className="key" onClick={onPrev} aria-label="จุดตรวจก่อนหน้า" title="จุดตรวจก่อนหน้า">‹‹</button>
          <button type="button" className="key" onClick={onNext} aria-label="จุดตรวจถัดไป" title="จุดตรวจถัดไป">››</button>
          <span className="lamp" title={readingWord(p, r)} />
        </div>
      </div>
      <figcaption className="pm-caption">{PLONG[p]}</figcaption>
    </figure>
  );
}
