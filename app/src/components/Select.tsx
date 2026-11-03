import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface Option<T extends string> { value: T; label: string; dot?: string }

/** Borderless dropdown with a styled menu (native <select> menus can't be styled). Listbox pattern with full keyboard support. */
export function Select<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: Option<T>[]; label: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openMenu = () => { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); };
  const choose = (i: number) => { onChange(options[i].value); setOpen(false); };

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    const last = options.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(last, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(last); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const i = options.findIndex((o, j) => j > active && o.label.toLowerCase().startsWith(k));
      const wrap = options.findIndex((o) => o.label.toLowerCase().startsWith(k));
      if (i >= 0 || wrap >= 0) setActive(i >= 0 ? i : wrap);
    }
  };

  return (
    <div className={`sel${open ? ' open' : ''}${value !== options[0].value ? ' set' : ''}`} ref={root}>
      <button
        type="button" className="sel-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current.label}`}
        aria-controls={id} aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())} onKeyDown={onKey}
      >
        {current.dot && <i className="sel-dot" style={{ background: current.dot }} />}
        <span className="sel-val">{current.label}</span>
        <svg className="sel-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
      </button>
      {open && (
        <ul className="sel-menu" role="listbox" id={id} ref={list} aria-label={label}>
          {options.map((o, i) => (
            <li
              key={o.value} id={`${id}-${i}`} data-i={i} role="option" aria-selected={o.value === value}
              className={i === active ? 'active' : ''} onPointerEnter={() => setActive(i)} onClick={() => choose(i)}
            >
              {o.dot ? <i className="sel-dot" style={{ background: o.dot }} /> : <i className="sel-dot none" />}
              <span>{o.label}</span>
              {o.value === value && <svg className="sel-check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
