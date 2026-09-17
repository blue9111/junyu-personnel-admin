import { useId, useLayoutEffect, useRef, useState } from 'react';
import './wheel-picker.css';

type Option = { value: string; label: string };
type Kind = 'choice' | 'month' | 'date' | 'time';
const pad = (n: number) => String(n).padStart(2, '0');
const numbers = (start: number, count: number, suffix = ''): Option[] =>
  Array.from({ length: count }, (_, i) => ({ value: pad(start + i), label: `${pad(start + i)}${suffix}` }));

export function clampDate(parts: string[]): string[] {
  const [year, month, day] = parts.map(Number);
  return [parts[0], parts[1], pad(Math.min(day, new Date(year, month, 0).getDate()))];
}

function Wheel({ label, options, value, onChange }: { label: string; options: Option[]; value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reported = useRef<string | null>(null);
  const id = useId();
  const index = Math.max(0, options.findIndex(option => option.value === value));
  useLayoutEffect(() => {
    if (reported.current !== value && ref.current) ref.current.scrollTop = index * 44;
    reported.current = value;
  }, [value, index, options.length]);
  function choose(next: number) {
    const bounded = Math.max(0, Math.min(options.length - 1, next));
    reported.current = options[bounded].value;
    ref.current?.scrollTo({ top: bounded * 44, behavior: 'instant' });
    onChange(options[bounded].value);
  }
  return <div className="wheel-column"><span className="wheel-column-label">{label}</span><div className="wheel-window">
    <div className="wheel-selection" />
    <div ref={ref} className="wheel-list" role="listbox" aria-label={label} aria-activedescendant={`${id}-${index}`} tabIndex={0}
      onScroll={e => {
        const next = Math.max(0, Math.min(options.length - 1, Math.round(e.currentTarget.scrollTop / 44)));
        if (options[next].value !== reported.current) {
          reported.current = options[next].value;
          onChange(options[next].value);
        }
      }}
      onKeyDown={e => {
        const next = e.key === 'ArrowDown' ? index + 1 : e.key === 'ArrowUp' ? index - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : e.key === 'PageDown' ? index + 5 : e.key === 'PageUp' ? index - 5 : null;
        if (next !== null) { e.preventDefault(); choose(next); }
      }}>
      {options.map((option, i) => <div key={option.value} id={`${id}-${i}`} role="option" aria-selected={i === index} className="wheel-option" onClick={() => choose(i)}>{option.label}</div>)}
    </div>
  </div></div>;
}

export default function WheelPicker({ label, value, onChange, kind = 'choice', options = [] }: {
  label: string; value: string; onChange: (value: string) => void; kind?: Kind; options?: Option[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const separator = kind === 'time' ? ':' : '-';
  const display = kind === 'choice' ? options.find(option => option.value === value)?.label || '請選擇' : kind === 'month' ? `${value.split('-')[0]} 年 ${Number(value.split('-')[1])} 月` : value;
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus(); }
  function update(index: number, next: string) {
    setDraft(previous => {
      const result = previous.map((part, i) => i === index ? next : part);
      return kind === 'date' ? clampDate(result) : result;
    });
  }
  const year = Number(draft[0] || new Date().getFullYear());
  const yearStart = Math.min(1900, year);
  const yearEnd = Math.max(2100, year);
  const columns = kind === 'choice' ? [{ label, options }] : kind === 'time' ? [
    { label: '時', options: numbers(0, 24) }, { label: '分', options: numbers(0, 60) },
  ] : [
    { label: '年', options: numbers(yearStart, yearEnd - yearStart + 1) },
    { label: '月', options: numbers(1, 12) },
    ...(kind === 'date' ? [{ label: '日', options: numbers(1, new Date(year, Number(draft[1] || 1), 0).getDate()) }] : []),
  ];
  return <>
    <button type="button" ref={trigger} className="wheel-trigger" aria-label={`${label}：${display}`} aria-haspopup="dialog" onClick={() => {
      setDraft(kind === 'choice' ? [options.some(option => option.value === value) ? value : options[0]?.value || ''] : value.split(separator));
      setOpen(true); dialog.current?.showModal();
    }}><span>{display}</span><span aria-hidden="true">⌃⌄</span></button>
    <dialog ref={dialog} className="wheel-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); close(); }}>
      <div className="wheel-dialog-bar"><button type="button" onClick={close}>取消</button><h3 id={titleId}>{label}</h3><button type="button" className="wheel-done" onClick={() => { onChange(kind === 'choice' ? draft[0] : draft.join(separator)); close(); }}>完成</button></div>
      <p className="wheel-hint">上下滑動選擇</p>
      {open && <div className="wheel-columns">{columns.map((column, index) => <Wheel key={column.label} {...column} value={draft[index]} onChange={next => update(index, next)} />)}</div>}
    </dialog>
  </>;
}
