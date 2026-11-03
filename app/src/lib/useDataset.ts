import { useState } from 'react';
import { importExcel } from './importExcel';
import { PUBLISHED, type Dataset } from './quality';

const KEY = 'wq-uploaded-dataset';

function loadSaved(): Dataset | null {
  try {
    const s = localStorage.getItem(KEY);
    const d = s ? (JSON.parse(s) as Dataset) : null;
    return d && Array.isArray(d.rows) && d.rows.length ? d : null;
  } catch {
    return null;
  }
}

export type Upload = { status: 'idle' } | { status: 'reading'; name: string } | { status: 'error'; message: string } | { status: 'done'; name: string; count: number };

/** The page shows the published data, or an Excel file this viewer uploaded (kept in this browser only). */
export function useDataset() {
  const [uploaded, setUploaded] = useState<Dataset | null>(loadSaved);
  const [upload, setUpload] = useState<Upload>({ status: 'idle' });

  const loadFile = async (file: File) => {
    setUpload({ status: 'reading', name: file.name });
    try {
      const d = await importExcel(file);
      setUploaded(d);
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage full or blocked: keep for this visit only */ }
      setUpload({ status: 'done', name: file.name, count: d.rows.length });
    } catch (e) {
      setUpload({ status: 'error', message: e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ' });
    }
  };
  const usePublished = () => {
    setUploaded(null);
    setUpload({ status: 'idle' });
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  };

  return { data: uploaded ?? PUBLISHED, isUploaded: !!uploaded, upload, loadFile, usePublished, dismiss: () => setUpload({ status: 'idle' }) };
}
