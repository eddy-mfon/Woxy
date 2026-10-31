import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowUpRight } from 'lucide-react';
import { formatLocalDate, parseLocalDate, getFriendlyDateLabel } from './utils';

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  recordedDates: Set<string>;
  notesCountPerDate: Record<string, number>;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onSelectDate,
  recordedDates,
  notesCountPerDate,
}) => {
  const todayStr = formatLocalDate(new Date());

  const navigateDay = (offset: number) => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + offset);
    onSelectDate(formatLocalDate(d));
  };

  // 7 days strip ending at today
  const pastDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatLocalDate(d);
  });

  return (
    <div className="dark-date-navigator">
      <div className="date-nav-left">
        <div className="nav-chevrons">
          <button
            className="btn-chevron"
            onClick={() => navigateDay(-1)}
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="btn-chevron"
            onClick={() => navigateDay(1)}
            disabled={selectedDate === todayStr}
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="active-date-display">
          <span className="active-date-title">{getFriendlyDateLabel(selectedDate)}</span>
          <span className="active-date-iso">{selectedDate}</span>
        </div>

        {selectedDate !== todayStr && (
          <button
            className="btn-jump-today-pill"
            onClick={() => onSelectDate(todayStr)}
          >
            <span>Today</span>
            <ArrowUpRight size={12} />
          </button>
        )}
      </div>

      <div className="date-nav-center-strip">
        {pastDays.map((dateStr) => {
          const d = parseLocalDate(dateStr);
          const dayShort = d.toLocaleDateString('en-US', { weekday: 'narrow' });
          const dayNum = d.getDate();
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const hasNotes = recordedDates.has(dateStr);
          const count = notesCountPerDate[dateStr] || 0;

          return (
            <button
              key={dateStr}
              className={`nav-day-cell ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => onSelectDate(dateStr)}
              title={`${dateStr} (${count} notes)`}
            >
              <span className="day-name">{dayShort}</span>
              <span className="day-num">{dayNum}</span>
              <span className={`status-dot ${hasNotes ? 'has-notes' : ''}`} />
            </button>
          );
        })}
      </div>

      <div className="date-nav-right">
        <label className="btn-calendar-trigger" title="Pick specific date">
          <CalendarIcon size={14} />
          <input
            type="date"
            max={todayStr}
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) onSelectDate(e.target.value);
            }}
            className="native-date-hidden"
          />
        </label>
      </div>
    </div>
  );
};
