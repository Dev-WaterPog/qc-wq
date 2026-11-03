import { useEffect, useRef, useState } from 'react';
import type { Dataset } from '../lib/quality';
import type { Upload } from '../lib/useDataset';
import { fmtN } from '../lib/quality';

/** Where the numbers come from, plus the Excel upload (button or drop a file anywhere on the page). */
export function DataBar({ data, isUploaded, upload, onFile, onReset, onDismiss }: {
  data: Dataset; isUploaded: boolean; upload: Upload;
  onFile: (f: File) => void; onReset: () => void; onDismiss: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(onFile);
  fileRef.current = onFile;

  useEffect(() => {
    let depth = 0;
    const hasFile = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
    const enter = (e: DragEvent) => { if (hasFile(e)) { depth++; setDragging(true); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (e: DragEvent) => { if (hasFile(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFile(e)) return;
      e.preventDefault(); depth = 0; setDragging(false);
      const f = e.dataTransfer?.files[0];
      if (f) fileRef.current(f);
    };
    window.addEventListener('dragenter', enter); window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over); window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter); window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over); window.removeEventListener('drop', drop);
    };
  }, []);

  return (
    <section className={`databar${isUploaded ? ' uploaded' : ''}`} aria-label="แหล่งข้อมูล">
      <div className="db-src">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h6.5L15 6v11.5H5z" /><path d="M11.5 2.5V6H15M7.5 10h5M7.5 13h5" /></svg>
        <div>
          <b>{data.meta.file}</b>
          <span>
            {data.meta.date ? `ข้อมูล ณ วันที่ ${data.meta.date} · ` : ''}{fmtN(data.rows.length)} โครงการ ·{' '}
            {isUploaded ? 'ไฟล์ที่อัปโหลด เห็นเฉพาะเบราว์เซอร์นี้' : 'ข้อมูลหลักของหน้านี้'}
          </span>
        </div>
      </div>
      <div className="db-actions">
        {isUploaded && <button type="button" className="db-btn ghost" onClick={onReset}>กลับไปใช้ข้อมูลหลัก</button>}
        <button type="button" className="db-btn" onClick={() => input.current?.click()} disabled={upload.status === 'reading'}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 13V3.5M6 7.5l4-4 4 4M3.5 13v3.5h13V13" /></svg>
          {upload.status === 'reading' ? 'กำลังอ่านไฟล์…' : 'อัปโหลด Excel ใหม่'}
        </button>
        <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </div>
      {upload.status === 'done' && (
        <p className="db-msg ok" role="status">อ่านไฟล์ {upload.name} แล้ว พบ {fmtN(upload.count)} โครงการ หน้าแสดงข้อมูลชุดใหม่แล้ว
          <button type="button" onClick={onDismiss} aria-label="ปิดข้อความ">✕</button></p>
      )}
      {upload.status === 'error' && (
        <p className="db-msg err" role="alert">{upload.message}<button type="button" onClick={onDismiss} aria-label="ปิดข้อความ">✕</button></p>
      )}
      <p className="db-hint">ลากไฟล์ .xlsx มาวางที่ไหนก็ได้บนหน้านี้ ไฟล์ต้องมีคอลัมน์แบบเดียวกับไฟล์ QC เดิม ไฟล์ไม่ถูกส่งออกไปที่ไหน อ่านในเครื่องนี้เท่านั้น</p>
      {dragging && <div className="dropzone" aria-hidden="true"><div>วางไฟล์ Excel ที่นี่เพื่ออัปเดตข้อมูล</div></div>}
    </section>
  );
}
