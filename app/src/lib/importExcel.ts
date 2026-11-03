import { readFirstSheet, type Cell } from './xlsx';
import type { Dataset, Project } from './quality';

// Same layout and rules as build_dashboard.py: columns A–P, header in row 1, "-" or blank = no reading.
const NUM_COLS = [
  'raw_ph', 'raw_tds', 'raw_ntu', 'rawlab_ph', 'rawlab_tds', 'rawlab_ntu',
  'filt_ph', 'filt_tds', 'filt_ntu', 'filtlab_ph', 'filtlab_tds', 'filtlab_ntu',
] as const;

const num = (v: Cell): number | null => {
  if (v == null || typeof v === 'boolean') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = v.trim();
  if (!s || s === '-') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const str = (v: Cell) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();

export function dateFromName(name: string): string {
  const m = name.match(/\((\d{2})(\d{2})(\d{4})\)/);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : '';
}

export async function importExcel(file: File): Promise<Dataset> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('รองรับเฉพาะไฟล์ .xlsx');
  const { rows } = await readFirstSheet(await file.arrayBuffer());
  const header = (rows[0] ?? []).map(str);
  if (!/ph/i.test(header[4] ?? '') || !/tds/i.test(header[5] ?? '')) {
    throw new Error('รูปแบบคอลัมน์ไม่ตรง: คอลัมน์ E ต้องเป็นค่า pH และคอลัมน์ F ต้องเป็นค่า TDS เหมือนไฟล์ QC เดิม');
  }
  const out: Project[] = [];
  for (const r of rows.slice(1)) {
    if (!r || (!str(r[0]) && !str(r[1]))) continue;
    const site = str(r[2]);
    const p = {
      wtp: str(r[0]), code: str(r[1]), site,
      province: site.match(/จ\.\s*(\S+)\s*$/)?.[1] ?? '',
      type: str(r[3]),
    } as Project;
    NUM_COLS.forEach((k, i) => { p[k] = num(r[4 + i]); });
    out.push(p);
  }
  if (!out.length) throw new Error('ไม่พบข้อมูลโครงการในไฟล์');
  return { meta: { file: file.name, date: dateFromName(file.name) }, rows: out };
}
