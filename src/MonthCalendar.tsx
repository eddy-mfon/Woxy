import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  Calendar as CalendarIcon,
  Clock,
  Search,
  ArrowRight,
  Sparkles,
  Flame,
  Volume2,
} from 'lucide-react';
import type { VoiceNote } from './types';
import { formatDuration, formatLocalDate } from './utils';

interface MonthCalendarProps {
  notes: VoiceNote[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onOpenDayStudio: (dateStr: string) => void;
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  notes,
  selectedDate,
  onSelectDate,
  onOpenDayStudio,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const [dateSearchInput, setDateSearchInput] = useState('');

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  // Map notes by date
  const notesByDate: Record<string, VoiceNote[]> = {};
  for (const n of notes) {
    if (!notesByDate[n.dateStr]) {
      notesByDate[n.dateStr] = [];
    }
    notesByDate[n.dateStr].push(n);
  }

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const todayStr = formatLocalDate(new Date());

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthLabel = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate current month statistics
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const currentMonthNotes = notes.filter((n) => n.dateStr.startsWith(currentMonthKey));
  const activeDaysThisMonth = new Set(currentMonthNotes.map((n) => n.dateStr)).size;
  const totalSecondsThisMonth = currentMonthNotes.reduce((acc, n) => acc + (n.duration || 0), 0);

  // Build grid calendar cells
  const cells: {
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    hasNotes: boolean;
    notesCount: number;
    totalDuration: number;
    latestNoteTitle?: string;
  }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevM = month === 0 ? 12 : month;
    const prevY = month === 0 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayNotes = notesByDate[dateStr] || [];
    cells.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      hasNotes: dayNotes.length > 0,
      notesCount: dayNotes.length,
      totalDuration: dayNotes.reduce((acc, n) => acc + (n.duration || 0), 0),
      latestNoteTitle: dayNotes[dayNotes.length - 1]?.title,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayNotes = notesByDate[dateStr] || [];
    cells.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      hasNotes: dayNotes.length > 0,
      notesCount: dayNotes.length,
      totalDuration: dayNotes.reduce((acc, n) => acc + (n.duration || 0), 0),
      latestNoteTitle: dayNotes[dayNotes.length - 1]?.title,
    });
  }

  // Next month leading days to complete full grid weeks
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextM = month === 11 ? 1 : month + 2;
    const nextY = month === 11 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayNotes = notesByDate[dateStr] || [];
    cells.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      hasNotes: dayNotes.length > 0,
      notesCount: dayNotes.length,
      totalDuration: dayNotes.reduce((acc, n) => acc + (n.duration || 0), 0),
      latestNoteTitle: dayNotes[dayNotes.length - 1]?.title,
    });
  }

  const handleDateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateSearchInput.trim()) return;
    const target = dateSearchInput.trim();
    const matched = cells.find((c) => c.dateStr === target) || { dateStr: target };
    const [y, m] = target.split('-').map(Number);
    if (y && m) {
      setCurrentMonthDate(new Date(y, m - 1, 1));
    }
    onSelectDate(matched.dateStr);
    onOpenDayStudio(matched.dateStr);
  };

  return (
    <div className="full-month-calendar-card modern-calendar-wrapper">
      {/* Month Overview Stats Banner */}
      <div className="calendar-month-overview-strip">
        <div className="month-overview-metric">
          <div className="overview-icon-box purple">
            <Mic size={16} />
          </div>
          <div className="overview-text">
            <span className="overview-num">{currentMonthNotes.length}</span>
            <span className="overview-label">Notes this month</span>
          </div>
        </div>

        <div className="month-overview-metric">
          <div className="overview-icon-box orange">
            <Flame size={16} />
          </div>
          <div className="overview-text">
            <span className="overview-num">{activeDaysThisMonth}</span>
            <span className="overview-label">Active journal days</span>
          </div>
        </div>

        <div className="month-overview-metric">
          <div className="overview-icon-box cyan">
            <Clock size={16} />
          </div>
          <div className="overview-text">
            <span className="overview-num">{formatDuration(totalSecondsThisMonth)}</span>
            <span className="overview-label">Audio recorded</span>
          </div>
        </div>
      </div>

      {/* Top Header Row with Month Switcher, Navigation and Date Picker */}
      <div className="month-calendar-header">
        <div className="month-title-group">
          <div className="month-cal-badge">
            <CalendarIcon size={18} className="month-cal-icon" />
          </div>
          <h3 className="month-name-heading">{monthLabel}</h3>
        </div>

        <div className="calendar-header-actions">
          {/* Quick Jump Date Search */}
          <form onSubmit={handleDateSearch} className="calendar-date-search-form">
            <Search size={14} className="date-search-icon" />
            <input
              type="date"
              max={todayStr}
              value={dateSearchInput}
              onChange={(e) => setDateSearchInput(e.target.value)}
              className="calendar-date-input"
              title="Jump directly to any calendar day"
            />
            <button
              type="submit"
              className="btn-jump-date-search"
              disabled={!dateSearchInput}
            >
              <span>Go</span>
              <ArrowRight size={13} />
            </button>
          </form>

          {/* Nav buttons */}
          <div className="month-nav-arrows">
            <button
              className="month-arrow-btn"
              onClick={prevMonth}
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="month-today-shortcut"
              onClick={() => {
                const now = new Date();
                setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                onSelectDate(todayStr);
              }}
            >
              Today
            </button>
            <button
              className="month-arrow-btn"
              onClick={nextMonth}
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels Header */}
      <div className="calendar-weekdays-row">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
          <div key={w} className="weekday-col-header">
            {w}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-cells">
        {cells.map((cell) => {
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === todayStr;

          return (
            <button
              key={cell.dateStr}
              className={`month-day-cell ${cell.isCurrentMonth ? 'in-month' : 'out-month'} ${
                cell.hasNotes ? 'has-entry-highlight' : ''
              } ${isSelected ? 'selected-date' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => {
                onSelectDate(cell.dateStr);
                onOpenDayStudio(cell.dateStr);
              }}
              title={`${cell.dateStr}: ${cell.notesCount} voice notes. Click to review or add.`}
            >
              <div className="cell-top-bar">
                <span className={`cell-number ${isToday ? 'today-pill' : ''}`}>
                  {cell.dayNum}
                </span>

                {cell.hasNotes && (
                  <span className="cell-mic-badge">
                    <Volume2 size={11} className="cell-mic-icon" />
                    {cell.notesCount > 1 && <span className="cell-count-text">{cell.notesCount}</span>}
                  </span>
                )}
              </div>

              {cell.hasNotes ? (
                <div className="cell-content-zone">
                  {cell.latestNoteTitle && (
                    <span className="cell-note-title-preview">
                      {cell.latestNoteTitle}
                    </span>
                  )}
                  <div className="cell-bottom-info">
                    <span className="cell-duration-text">
                      <Clock size={10} />
                      {formatDuration(cell.totalDuration)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="cell-empty-state-hover">
                  <span className="cell-add-text">+ Log</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend & Tips Bar */}
      <div className="calendar-footer-legend">
        <div className="legend-items-wrap">
          <div className="legend-item">
            <span className="legend-color-dot has-recording" />
            <span>Voice recorded</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot today-marker" />
            <span>Today</span>
          </div>
        </div>
        <div className="calendar-tip">
          <Sparkles size={13} className="tip-sparkle" />
          <span>Click any date to open its Day Studio, play reflections, or record new notes</span>
        </div>
      </div>
    </div>
  );
};
