import raw from '../data/projects.json';

export type Param = 'ph' | 'tds' | 'ntu';
export type Stage = 'raw' | 'rawlab' | 'filt' | 'filtlab';
export type Level = 'fail' | 'risk' | 'ok' | 'nd';
export type Dir = 'low' | 'high';

export type Project = {
  wtp: string;
  code: string;
  site: string;
  province: string;
  type: string;
} & { [K in `${Stage}_${Param}`]: number | null };

export interface Reading { v: number | null; lv: Level; dir?: Dir }
export interface Assessed {
  p: Project;
  lv: Level;
  sev: number;
  res: Record<Param, Reading & { raw: number | null }>;
}

export interface Dataset { meta: { file: string; date: string }; rows: Project[] }
/** The data built into the page by build_dashboard.py. */
export const PUBLISHED = raw as Dataset;

export const PARAMS: Param[] = ['ph', 'tds', 'ntu'];
export const STAGES: Stage[] = ['raw', 'rawlab', 'filt', 'filtlab'];
export const LEVELS: Level[] = ['fail', 'risk', 'ok', 'nd'];

// QC limits, plus the warning band used to flag "at risk" (agreed: pH within 0.3 of a limit, TDS/NTU from 80% of max).
export const LIM: Record<Param, [number | null, number]> = { ph: [6.5, 8.5], tds: [null, 600], ntu: [null, 5] };
export const WARN: Record<Param, [number | null, number]> = { ph: [6.8, 8.2], tds: [null, 480], ntu: [null, 4] };
export const SCALE: Record<Param, [number, number]> = { ph: [4, 11], tds: [0, 1000], ntu: [0, 10] };

export const PNAME: Record<Param, string> = { ph: 'pH', tds: 'TDS', ntu: 'ความขุ่น' };
export const PLONG: Record<Param, string> = { ph: 'ความเป็นกรด-ด่าง', tds: 'ของแข็งละลายน้ำ', ntu: 'ความขุ่น' };
export const UNIT: Record<Param, string> = { ph: 'pH', tds: 'mg/L', ntu: 'NTU' };
export const LIMIT_TEXT: Record<Param, string> = { ph: '6.5–8.5', tds: '≤ 600 mg/L', ntu: '≤ 5 NTU' };
export const STAGE_NAME: Record<Stage, string> = { raw: 'น้ำดิบ', rawlab: 'น้ำดิบ', filt: 'น้ำผ่านกรอง', filtlab: 'น้ำผ่านกรอง' };
export const STAGE_SRC: Record<Stage, string> = { raw: 'หน้างาน', rawlab: 'ผลแลป', filt: 'หน้างาน', filtlab: 'ผลแลป' };
export const LEVEL: Record<Level, { name: string; desc: string }> = {
  fail: { name: 'ไม่ผ่านเกณฑ์', desc: 'น้ำผ่านกรองมีค่าเกินเกณฑ์ ต้องแก้ไข' },
  risk: { name: 'เฝ้าระวัง', desc: 'ยังผ่าน แต่ค่าเข้าใกล้ขอบเกณฑ์' },
  ok: { name: 'ปกติ', desc: 'ทุกค่าอยู่ในช่วงปลอดภัย' },
  nd: { name: 'ไม่มีผลแลป', desc: 'ยังประเมินไม่ได้ ควรส่งตัวอย่างตรวจ' },
};

export function judge(p: Param, v: number | null): Reading {
  if (v == null) return { v, lv: 'nd' };
  const [lo, hi] = LIM[p];
  const [wlo, whi] = WARN[p];
  if (lo != null && v < lo) return { v, lv: 'fail', dir: 'low' };
  if (v > hi) return { v, lv: 'fail', dir: 'high' };
  if (wlo != null && v < wlo) return { v, lv: 'risk', dir: 'low' };
  if (p === 'ph' ? v > whi : v >= whi) return { v, lv: 'risk', dir: 'high' };
  return { v, lv: 'ok' };
}

/** pH outside the safe band reads as acidic (low) or alkaline (high); other parameters have no tone. */
export type Tone = 'acid' | 'base';
export function tone(p: Param, r: Reading): Tone | null {
  if (p !== 'ph' || (r.lv !== 'fail' && r.lv !== 'risk')) return null;
  return r.dir === 'low' ? 'acid' : 'base';
}
export const toneClass = (p: Param, r: Reading): string => {
  const t = tone(p, r);
  return t ? ` tone-${t}` : '';
};

export function readingWord(p: Param, r: Reading): string {
  if (r.lv === 'nd') return 'ไม่มีผล';
  if (r.lv === 'ok') return 'ปกติ';
  if (p === 'ph') {
    if (r.lv === 'fail') return r.dir === 'low' ? 'ต่ำ · น้ำเป็นกรด' : 'สูง · น้ำเป็นด่าง';
    return r.dir === 'low' ? 'ใกล้ขอบล่าง' : 'ใกล้ขอบบน';
  }
  return r.lv === 'fail' ? 'เกินเกณฑ์' : 'ใกล้เกณฑ์';
}

function severity(p: Param, v: number): number {
  const [lo, hi] = LIM[p];
  if (p === 'ph') return v < 7.5 ? (lo as number) - v : v - hi;
  return (v - hi) / hi;
}

function assess(p: Project): Assessed {
  const res = {} as Assessed['res'];
  for (const k of PARAMS) res[k] = { ...judge(k, p[`filtlab_${k}`]), raw: p[`rawlab_${k}`] };
  const lvs = PARAMS.map((k) => res[k].lv).filter((l) => l !== 'nd');
  const lv: Level = !lvs.length ? 'nd' : lvs.includes('fail') ? 'fail' : lvs.includes('risk') ? 'risk' : 'ok';
  const sevs = PARAMS.filter((k) => res[k].lv === lv && res[k].v != null).map((k) => severity(k, res[k].v as number));
  return { p, res, lv, sev: sevs.length ? Math.max(...sevs) : -9 };
}

const ORDER: Record<Level, number> = { fail: 0, risk: 1, nd: 2, ok: 3 };
export const buildItems = (rows: Project[]): Assessed[] => rows.map(assess).sort(
  (a, b) => ORDER[a.lv] - ORDER[b.lv] || b.sev - a.sev || a.p.code.localeCompare(b.p.code),
);

export function countLevels(items: Assessed[]): Record<Level, number> {
  const c: Record<Level, number> = { fail: 0, risk: 0, ok: 0, nd: 0 };
  for (const i of items) c[i.lv]++;
  return c;
}

export interface Note { lv: Level | 'ctx'; title: string; text: string; tone?: Tone | null }

function advice(p: Param, r: Reading): string {
  if (p === 'ph') return r.dir === 'low'
    ? 'ตรวจสอบการเติมสารปรับ pH (เช่น ปูนขาว/โซดาแอช) และสภาพสารกรอง'
    : 'ตรวจสอบปริมาณสารเคมีที่เติมและคุณภาพแหล่งน้ำดิบ';
  if (p === 'tds') return 'ระบบกรองทั่วไปลด TDS ได้น้อย พิจารณาแหล่งน้ำใหม่หรือระบบ RO';
  return 'ตรวจสอบการตกตะกอน ล้างย้อน (backwash) หรือเปลี่ยนสารกรอง';
}

export function notesFor(i: Assessed): Note[] {
  const out: Note[] = [];
  for (const p of PARAMS) {
    const r = i.res[p];
    const rawBad = judge(p, r.raw).lv === 'fail';
    const side = p === 'ph' ? (r.dir === 'low' ? ' (กรด)' : ' (ด่าง)') : '';
    if (r.lv === 'fail') out.push({ lv: 'fail', tone: tone(p, r), title: `${PNAME[p]} ${r.dir === 'low' ? 'ต่ำ' : 'สูง'}กว่าเกณฑ์${side}`, text: (rawBad ? 'น้ำดิบก็เกินเกณฑ์อยู่แล้ว ' : '') + advice(p, r) });
    else if (r.lv === 'risk') out.push({ lv: 'risk', tone: tone(p, r), title: `${PNAME[p]} ใกล้เกณฑ์${side}`, text: 'เฝ้าระวังและตรวจซ้ำรอบถัดไป ' + advice(p, r) });
  }
  if (i.lv === 'nd') {
    out.push({ lv: 'nd', title: 'ยังไม่มีผลแลป', text: 'ส่งตัวอย่างน้ำผ่านกรองตรวจที่ห้องปฏิบัติการ' });
    const field = PARAMS.filter((p) => judge(p, i.p[`filt_${p}`]).lv === 'fail');
    if (field.length) out.push({ lv: 'fail', title: 'ค่าหน้างานเกินเกณฑ์', text: field.map((p) => `${PNAME[p]} ${fmt(p, i.p[`filt_${p}`])}`).join(', ') });
  }
  const fixed = PARAMS.filter((p) => judge(p, i.res[p].raw).lv === 'fail' && i.res[p].lv === 'ok');
  if (fixed.length) out.push({ lv: 'ctx', title: 'ระบบกรองแก้ได้', text: `น้ำดิบ${fixed.map((p) => PNAME[p]).join(', ')}เกินเกณฑ์ แต่หลังกรองผ่าน ควรดูแลระบบกรองต่อเนื่อง` });
  const missing = i.lv !== 'nd' ? PARAMS.filter((p) => i.res[p].lv === 'nd') : [];
  if (missing.length) out.push({ lv: 'ctx', title: 'ข้อมูลไม่ครบ', text: `ยังไม่มีผลแลป ${missing.map((p) => PNAME[p]).join(', ')}` });
  if (!out.length) out.push({ lv: 'ctx', title: 'ปกติ', text: 'ทุกค่าอยู่ในช่วงปลอดภัย' });
  return out;
}

export const fmt = (p: Param, v: number | null | undefined): string =>
  v == null ? '–' : p === 'ph' ? v.toFixed(2) : (+v.toFixed(2)).toLocaleString('en-US');
export const fmtN = (n: number): string => n.toLocaleString('en-US');
