import { useEffect, useMemo, useRef, useState } from 'react';
import { PanelMeter } from './components/PanelMeter';
import { Select, type Option } from './components/Select';
import {
  ITEMS, LEVEL, LEVELS, META, PARAMS, PNAME, STAGES, STAGE_NAME, STAGE_SRC, countLevels, fmt, fmtN, judge, notesFor, toneClass,
  type Assessed, type Level, type Param, type Stage,
} from './lib/quality';

type LevelFilter = Level | 'action' | 'all';
type Theme = 'light' | 'dark';

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('wq-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('wq-theme', theme); } catch { /* storage blocked */ }
  }, [theme]);
  return [theme, setTheme];
}

const TYPES = [...new Set(ITEMS.map((i) => i.p.type).filter(Boolean))].sort();
const PROVINCES = [...new Set(ITEMS.map((i) => i.p.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));

const LEVEL_OPTIONS: Option<LevelFilter>[] = [
  { value: 'action', label: 'ไม่ผ่าน + เฝ้าระวัง', dot: 'linear-gradient(90deg, var(--fail) 50%, var(--risk) 50%)' },
  ...LEVELS.map((k) => ({ value: k, label: LEVEL[k].name, dot: `var(--${k})` })),
  { value: 'all', label: 'ทุกระดับ' },
];
const PARAM_OPTIONS: Option<Param | ''>[] = [
  { value: '', label: 'ทุกค่า' },
  ...PARAMS.map((p) => ({ value: p, label: `เฉพาะปัญหา ${PNAME[p]}` })),
];
const TYPE_OPTIONS: Option<string>[] = [{ value: '', label: 'ทุกประเภทระบบ' }, ...TYPES.map((t) => ({ value: t, label: `ระบบ ${t}` }))];
const PROVINCE_OPTIONS: Option<string>[] = [{ value: '', label: 'ทุกจังหวัด' }, ...PROVINCES.map((t) => ({ value: t, label: t }))];

export default function App() {
  const [theme, setTheme] = useTheme();
  const [lvl, setLvl] = useState<LevelFilter>('action');
  const [param, setParam] = useState<Param | ''>('');
  const [type, setType] = useState('');
  const [prov, setProv] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string>(ITEMS[0]?.p.code ?? '');
  const [stage, setStage] = useState<Stage>('filtlab');
  const panelRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);

  const total = countLevels(ITEMS);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ITEMS.filter((i) => {
      if (lvl === 'action' ? !(i.lv === 'fail' || i.lv === 'risk') : lvl !== 'all' && i.lv !== lvl) return false;
      if (param && !['fail', 'risk'].includes(i.res[param].lv)) return false;
      if (type && i.p.type !== type) return false;
      if (prov && i.p.province !== prov) return false;
      if (s && !`${i.p.wtp} ${i.p.code} ${i.p.site}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [lvl, param, type, prov, q]);
  const current = ITEMS.find((i) => i.p.code === selected) ?? ITEMS[0];

  const pick = (code: string) => {
    setSelected(code);
    setStage('filtlab');
    if (window.matchMedia('(max-width: 1080px)').matches) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const showList = (next: { lvl?: LevelFilter; param?: Param | ''; type?: string }) => {
    setLvl(next.lvl ?? 'all'); setParam(next.param ?? ''); setType(next.type ?? ''); setProv(''); setQ('');
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const reset = () => { setLvl('action'); setParam(''); setType(''); setProv(''); setQ(''); };
  const step = (d: number) => setStage(STAGES[(STAGES.indexOf(stage) + d + STAGES.length) % STAGES.length]);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <p className="eyebrow">Quality Control · ผลตรวจห้องปฏิบัติการ</p>
          <h1>ความเสี่ยงคุณภาพน้ำ โครงการ WTP</h1>
          <p className="lede">
            จาก <b>{fmtN(ITEMS.length)}</b> โครงการ ผลแลปของน้ำผ่านกรองพบ <b className="t-fail">{fmtN(total.fail)} โครงการไม่ผ่านเกณฑ์</b> และ{' '}
            <b className="t-risk">{fmtN(total.risk)} โครงการต้องเฝ้าระวัง</b> ส่วนอีก {fmtN(total.nd)} โครงการยังไม่มีผลแลป
          </p>
        </div>
        <div className="theme" role="group" aria-label="ธีม">
          {(['light', 'dark'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>{t === 'light' ? '☀ สว่าง' : '☾ มืด'}</button>
          ))}
        </div>
      </header>

      <section className="status" aria-label="สรุปตามระดับ">
        {LEVELS.map((k) => (
          <button key={k} type="button" className={`scard lv-${k}`} aria-pressed={lvl === k} onClick={() => showList({ lvl: lvl === k ? 'action' : k })}>
            <span className="lbl">{LEVEL[k].name}</span>
            <span className="big">{fmtN(total[k])}<small>โครงการ · {Math.round((total[k] / ITEMS.length) * 100)}%</small></span>
            <span className="desc">{LEVEL[k].desc}</span>
          </button>
        ))}
      </section>

      <div className="workspace">
        <section className="list-col" ref={listRef} aria-label="รายการโครงการ">
          <div className="sec-h">
            <h2>โครงการที่ต้องปรับปรุง</h2>
            <p className="note">เรียงจากความเสี่ยงสูงสุด ค่าในตารางคือน้ำผ่านกรองจากผลแลป กดที่โครงการเพื่อเปิดดูบนแผงมาตรวัด</p>
            <p className="tone-key">
              <span className="tone-acid">pH ต่ำ · น้ำเป็นกรด</span>
              <span className="tone-base">pH สูง · น้ำเป็นด่าง</span>
            </p>
          </div>
          <div className="filters">
            <label className="search">
              <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา รหัส เลขที่สัญญา หรือพื้นที่" aria-label="ค้นหาโครงการ" />
            </label>
            <Select<LevelFilter> label="ระดับ" value={lvl} onChange={setLvl} options={LEVEL_OPTIONS} />
            <Select<Param | ''> label="ค่า" value={param} onChange={setParam} options={PARAM_OPTIONS} />
            <Select label="ประเภทระบบ" value={type} onChange={setType} options={TYPE_OPTIONS} />
            <Select label="จังหวัด" value={prov} onChange={setProv} options={PROVINCE_OPTIONS} />
            <button type="button" className="link" onClick={reset}>ล้างตัวกรอง</button>
            <span className="count">พบ <b>{fmtN(list.length)}</b> โครงการ</span>
          </div>
          <div className="reg">
            <div className="reg-head" aria-hidden="true">
              <span>ระดับ</span><span>โครงการ</span>
              {PARAMS.map((p) => <span key={p} className="n">{PNAME[p]}</span>)}
            </div>
            {list.length === 0 && <p className="empty">ไม่พบโครงการตามตัวกรองนี้</p>}
            {list.map((i) => <Row key={i.p.code} i={i} active={i.p.code === current.p.code} onPick={pick} />)}
          </div>
        </section>

        <aside className="panel-col" ref={panelRef} aria-label="แผงมาตรวัดของโครงการที่เลือก">
          {current && <Panel i={current} stage={stage} setStage={setStage} step={step} />}
        </aside>
      </div>

      <section className="sec">
        <div className="sec-h">
          <h2>ความเสี่ยงมาจากไหน</h2>
          <p className="note">กดที่แถบสีเพื่อดูรายชื่อโครงการกลุ่มนั้น</p>
        </div>
        <div className="legend">{LEVELS.map((k) => <span key={k} className={`lv-${k}`}><i />{LEVEL[k].name}</span>)}</div>
        <div className="two">
          <ByParam onPick={(p, k) => showList(k ? { lvl: k, param: k === 'fail' || k === 'risk' ? p : '' } : { lvl: 'all' })} />
          <ByType onPick={(t, k) => showList({ lvl: k, type: t })} />
        </div>
      </section>

      <footer>
        <div>ข้อมูลจาก {META.file}{META.date ? ` · ณ วันที่ ${META.date}` : ''} · {fmtN(ITEMS.length)} โครงการ</div>
        <div>ระดับความเสี่ยงประเมินจากค่าน้ำผ่านกรองจากผลแลป · ช่วงเฝ้าระวัง: pH ต่ำกว่า 6.8 หรือสูงกว่า 8.2, TDS ตั้งแต่ 480 mg/L, ความขุ่นตั้งแต่ 4 NTU · แนวทางแก้ไขเป็นข้อเสนอเบื้องต้น ควรให้วิศวกรตรวจสอบหน้างานก่อนดำเนินการ</div>
      </footer>
    </div>
  );
}

function Row({ i, active, onPick }: { i: Assessed; active: boolean; onPick: (code: string) => void }) {
  return (
    <button type="button" className={`row lv-${i.lv}`} aria-pressed={active} onClick={() => onPick(i.p.code)}>
      <span className="pill">{LEVEL[i.lv].name}</span>
      <span className="proj">
        <b>{i.p.code}</b> <small>ระบบ {i.p.type}</small>
        <span className="site">{i.p.site}</span>
      </span>
      {PARAMS.map((p) => {
        const r = i.res[p];
        return (
          <span key={p} className={`n val lv-${r.lv}${toneClass(p, r)}`}>
            <span className="k">{PNAME[p]}</span>
            {fmt(p, r.v)}
          </span>
        );
      })}
    </button>
  );
}

function Panel({ i, stage, setStage, step }: { i: Assessed; stage: Stage; setStage: (s: Stage) => void; step: (d: number) => void }) {
  const notes = notesFor(i);
  return (
    <div className="panel">
      <div className="panel-h">
        <div>
          <span className={`pill lv-${i.lv}`}>{LEVEL[i.lv].name}</span>
          <h3>{i.p.code}</h3>
          <p className="meta">{i.p.wtp} · ระบบ {i.p.type}</p>
          <p className="site">{i.p.site}</p>
        </div>
      </div>

      <div className="stage-tabs" role="group" aria-label="จุดตรวจที่แสดงบนมาตรวัด">
        {STAGES.map((s) => (
          <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(s)}>
            {STAGE_NAME[s]}<small>{STAGE_SRC[s]}</small>
          </button>
        ))}
      </div>

      <div className="meters">
        {PARAMS.map((p) => (
          <PanelMeter key={p} p={p} v={i.p[`${stage}_${p}`]} stage={stage} onPrev={() => step(-1)} onNext={() => step(1)} />
        ))}
      </div>

      <div className="notes">
        <h4>ประเด็นและแนวทางเบื้องต้น</h4>
        {notes.map((n, k) => (
          <p key={k} className={`note-item lv-${n.lv}${n.tone ? ` tone-${n.tone}` : ''}`}><b>{n.title}:</b> {n.text}</p>
        ))}
      </div>

      <div className="compare">
        <h4>ทุกจุดตรวจของโครงการนี้</h4>
        <table>
          <thead>
            <tr><th />{PARAMS.map((p) => <th key={p}>{PNAME[p]}</th>)}</tr>
          </thead>
          <tbody>
            {STAGES.map((s) => (
              <tr key={s} className={s === stage ? 'cur' : ''} onClick={() => setStage(s)}>
                <th scope="row">{STAGE_NAME[s]} <small>{STAGE_SRC[s]}</small></th>
                {PARAMS.map((p) => {
                  const v = i.p[`${s}_${p}`];
                  const r = judge(p, v);
                  return <td key={p} className={`lv-${r.lv}${toneClass(p, r)}`}>{fmt(p, v)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StackBar({ cnt, label, onPick }: { cnt: Record<Level, number>; label: string; onPick: (k: Level) => void }) {
  const total = LEVELS.reduce((s, k) => s + cnt[k], 0) || 1;
  return (
    <div className="sbar">
      {LEVELS.filter((k) => cnt[k]).map((k) => {
        const t = `${label} · ${LEVEL[k].name}: ${cnt[k]} โครงการ (${Math.round((cnt[k] / total) * 100)}%)`;
        return <button key={k} type="button" className={`lv-${k}`} style={{ flexGrow: cnt[k] }} title={t} aria-label={t} onClick={() => onPick(k)}>{fmtN(cnt[k])}</button>;
      })}
    </div>
  );
}

/** onPick gets the level clicked on the filtered-water bar, or null for the raw-water bar (shows every project). */
function ByParam({ onPick }: { onPick: (p: Param, k: Level | null) => void }) {
  return (
    <div className="card">
      <div><h3>แยกตามค่า: น้ำดิบ เทียบ น้ำผ่านกรอง</h3>
        <p className="note">ผลแลปทั้งสองจุด ถ้าแถบล่างเขียวมากกว่าแถบบน แปลว่าระบบกรองแก้ปัญหาค่านั้นได้</p></div>
      {PARAMS.map((p) => (
        <div key={p} className="pgroup">
          <div className="pgroup-h">{PNAME[p]}</div>
          {(['rawlab', 'filtlab'] as const).map((s) => {
            const cnt: Record<Level, number> = { fail: 0, risk: 0, ok: 0, nd: 0 };
            for (const i of ITEMS) cnt[judge(p, i.p[`${s}_${p}`]).lv]++;
            return (
              <div key={s} className="brow">
                <div className="bl">{STAGE_NAME[s]}<small>ผลแลป</small></div>
                <StackBar cnt={cnt} label={`${PNAME[p]} ${STAGE_NAME[s]}`} onPick={(k) => onPick(p, s === 'filtlab' ? k : null)} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ByType({ onPick }: { onPick: (t: string, k: Level) => void }) {
  const rows = TYPES.map((t) => ({ t, cnt: countLevels(ITEMS.filter((i) => i.p.type === t)) }))
    .sort((a, b) => b.cnt.fail * 100 + b.cnt.risk - (a.cnt.fail * 100 + a.cnt.risk));
  return (
    <div className="card">
      <div><h3>แยกตามประเภทระบบ</h3>
        <p className="note">ระดับความเสี่ยงของน้ำผ่านกรองจากผลแลป ช่วยดูว่าปัญหากระจุกอยู่ที่ระบบแบบใด</p></div>
      {rows.map(({ t, cnt }) => (
        <div key={t} className="brow">
          <div className="bl">ระบบ {t}<small>{fmtN(LEVELS.reduce((s, k) => s + cnt[k], 0))} โครงการ</small></div>
          <StackBar cnt={cnt} label={`ระบบ ${t}`} onPick={(k) => onPick(t, k)} />
        </div>
      ))}
    </div>
  );
}
