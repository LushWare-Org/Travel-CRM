import { useState, useEffect, useRef } from 'react';

interface DateRangeCalendarProps {
  initialStart?: string;
  initialEnd?: string;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
}

export default function DateRangeCalendar({ initialStart, initialEnd, onChange, onClose }: DateRangeCalendarProps) {
  const calRef = useRef<HTMLDivElement>(null);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = initialStart ? new Date(initialStart) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [rangeStart, setRangeStart] = useState<Date | null>(initialStart ? new Date(initialStart) : null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(initialEnd ? new Date(initialEnd) : null);
  const [selecting, setSelecting] = useState(false);
  const [awaitingEnd, setAwaitingEnd] = useState(false);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  const formatISO = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  function buildCalendar(month: Date): (Date | null)[] {
    const first = startOfMonth(month);
    const startWeekDay = first.getDay();
    const total = daysInMonth(month.getFullYear(), month.getMonth());
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekDay; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    return cells;
  }

  function inRange(date: Date): boolean {
    if (!rangeStart || !rangeEnd) return false;
    const a = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const b = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    return date >= startOfDay(a) && date <= startOfDay(b);
  }

  function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function handleDayDown(d: Date) {
    if (awaitingEnd && rangeStart) {
      setRangeEnd(d);
      setAwaitingEnd(false);
      const a = rangeStart < d ? rangeStart : d;
      const b = rangeStart < d ? d : rangeStart;
      onChange(formatISO(a), formatISO(b));
      return;
    }

    setSelecting(true);
    setRangeStart(d);
    setRangeEnd(d);
    setAwaitingEnd(false);
  }

  function handleDayEnter(d: Date) {
    if (!selecting && !awaitingEnd) return;
    setRangeEnd(d);
  }

  function handleDayUp() {
    setSelecting(false);
    if (rangeStart && rangeEnd) {
      if (startOfDay(rangeStart).getTime() === startOfDay(rangeEnd).getTime()) {
        setAwaitingEnd(true);
        return;
      }
      const a = rangeStart < rangeEnd ? rangeStart : rangeEnd;
      const b = rangeStart < rangeEnd ? rangeEnd : rangeStart;
      onChange(formatISO(a), formatISO(b));
    }
  }

  const cells = buildCalendar(viewMonth);

  return (
    <div ref={calRef} className="bg-white rounded-xl shadow-lg p-4 w-[320px]">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="px-2 py-1">◀</button>
        <div className="font-semibold">{viewMonth.toLocaleString(undefined, { month: 'long' })} {viewMonth.getFullYear()}</div>
        <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="px-2 py-1">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-center text-gray-500 mb-2">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div onMouseUp={handleDayUp} className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const isNull = c === null;
          const isSelected = !isNull && inRange(startOfDay(c));
          return (
            <div key={i} className={`h-8 flex items-center justify-center ${isNull ? '' : 'cursor-pointer'}`}>
              {isNull ? <div /> : (
                <div
                  onMouseDown={() => handleDayDown(startOfDay(c))}
                  onMouseEnter={() => handleDayEnter(startOfDay(c))}
                  className={`w-8 h-8 rounded-md flex items-center justify-center ${isSelected ? 'bg-brand-100 text-brand-700' : 'hover:bg-gray-100'}`}
                >
                  {c.getDate()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end mt-3">
        <button type="button" onClick={() => { onClose(); }} className="px-3 py-1 text-sm text-gray-600">Close</button>
      </div>
    </div>
  );
}
