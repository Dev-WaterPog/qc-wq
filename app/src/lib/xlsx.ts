// Minimal .xlsx reader for the browser: an .xlsx file is a zip of XML parts.
// Reads the first worksheet's cell values (cached results for formulas) with no third-party library.

type Entry = { method: number; size: number; offset: number };

function zipEntries(buf: ArrayBuffer): Map<string, Entry> {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ไฟล์นี้ไม่ใช่ไฟล์ Excel (.xlsx)');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, Entry>();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    out.set(dec.decode(new Uint8Array(buf, p + 46, nameLen)), { method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function readPart(buf: ArrayBuffer, entries: Map<string, Entry>, name: string): Promise<string | null> {
  const e = entries.get(name);
  if (!e) return null;
  const dv = new DataView(buf);
  const start = e.offset + 30 + dv.getUint16(e.offset + 26, true) + dv.getUint16(e.offset + 28, true);
  const data = new Uint8Array(buf, start, e.size);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error('รูปแบบการบีบอัดของไฟล์ไม่รองรับ');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const colIndex = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
const textOf = (el: Element) => [...el.getElementsByTagName('t')].map((t) => t.textContent ?? '').join('');

export type Cell = string | number | boolean | null;

/** Returns the first worksheet as rows of cell values (row 1 first), indexed by column (A = 0). */
export async function readFirstSheet(buf: ArrayBuffer): Promise<{ name: string; rows: Cell[][] }> {
  const entries = zipEntries(buf);
  const wb = await readPart(buf, entries, 'xl/workbook.xml');
  if (!wb) throw new Error('ไม่พบข้อมูล workbook ในไฟล์');
  const sheetEl = xml(wb).getElementsByTagName('sheet')[0];
  if (!sheetEl) throw new Error('ไฟล์ไม่มีชีต');
  const rid = sheetEl.getAttribute('r:id') ?? sheetEl.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  let path = 'xl/worksheets/sheet1.xml';
  const rels = await readPart(buf, entries, 'xl/_rels/workbook.xml.rels');
  if (rels && rid) {
    const rel = [...xml(rels).getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === rid);
    const target = rel?.getAttribute('Target');
    if (target) path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }
  const ssXml = await readPart(buf, entries, 'xl/sharedStrings.xml');
  const shared = ssXml ? [...xml(ssXml).getElementsByTagName('si')].map(textOf) : [];
  const sheet = await readPart(buf, entries, path);
  if (!sheet) throw new Error('อ่านชีตแรกของไฟล์ไม่ได้');

  const rows: Cell[][] = [];
  for (const row of xml(sheet).getElementsByTagName('row')) {
    const r = Number(row.getAttribute('r')) - 1;
    const cells: Cell[] = [];
    for (const c of row.getElementsByTagName('c')) {
      const ref = c.getAttribute('r');
      if (!ref) continue;
      const t = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0]?.textContent ?? null;
      let val: Cell = null;
      if (t === 's') val = v == null ? null : shared[Number(v)] ?? null;
      else if (t === 'inlineStr') val = textOf(c);
      else if (t === 'str' || t === 'e') val = v;
      else if (t === 'b') val = v === '1';
      else if (v != null) val = Number(v);
      cells[colIndex(ref)] = val;
    }
    rows[r] = cells;
  }
  return { name: sheetEl.getAttribute('name') ?? '', rows };
}
