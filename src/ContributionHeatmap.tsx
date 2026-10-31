import React, { useState, useMemo } from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import type { VoiceNote } from './types';
import { formatLocalDate } from './utils';

interface ContributionHeatmapProps {
  notes: VoiceNote[];
  onSelectDate?: (dateStr: string) => void;
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  notes,
  onSelectDate,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    formattedDate: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Group notes count by dateStr
  const notesCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes) {
      map.set(note.dateStr, (map.get(note.dateStr) || 0) + 1);
    }
    return map;
  }, [notes]);

  // Generate 52 weeks (364 days) leading up to the end of the current week
  const { weeks, totalNotesCount, activeDaysCount } = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sun, 6 is Sat
    // Align end date to Saturday of current week
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - dayOfWeek));

    // Start date is 52 weeks prior (Sunday 52 weeks ago)
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (52 * 7 - 1));

    const weeksArr: Array<
      Array<{
        dateStr: string;
        date: Date;
        count: number;
        level: number;
        isFuture: boolean;
      }>
    > = [];

    const monthLabelsList: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    let curr = new Date(startDate);
    let currentWeek: Array<{
      dateStr: string;
      date: Date;
      count: number;
      level: number;
      isFuture: boolean;
    }> = [];

    let totalCount = 0;
    let activeDays = 0;

    while (curr <= endDate) {
      const dateStr = formatLocalDate(curr);
      const isFuture = curr > today;
      const count = isFuture ? 0 : (notesCountByDate.get(dateStr) || 0);

      if (count > 0) {
        totalCount += count;
        activeDays += 1;
      }

      let level = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count >= 3) level = 3;

      currentWeek.push({
        dateStr,
        date: new Date(curr),
        count,
        level,
        isFuture,
      });

      // Check if month changed and we're at the beginning of the week
      const currMonth = curr.getMonth();
      if (currMonth !== lastMonth && currentWeek.length === 1) {
        const monthName = curr.toLocaleDateString('en-US', { month: 'short' });
        monthLabelsList.push({
          label: monthName,
          weekIndex: weeksArr.length,
        });
        lastMonth = currMonth;
      }

      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }

      curr.setDate(curr.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    return {
      weeks: weeksArr,
      monthLabels: monthLabelsList,
      totalNotesCount: totalCount,
      activeDaysCount: activeDays,
    };
  }, [notesCountByDate]);

  const handleCellMouseEnter = (
    e: React.MouseEvent,
    cell: { dateStr: string; date: Date; count: number; isFuture: boolean }
  ) => {
    if (cell.isFuture) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const formatted = cell.date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    setHoveredCell({
      dateStr: cell.dateStr,
      formattedDate: formatted,
      count: cell.count,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div className="contribution-heatmap-card">
      {/* Heatmap Card Header */}
      <div className="heatmap-header-row">
        <div className="heatmap-title-wrap">
          <div className="heatmap-icon-chip">
            <Sparkles size={14} className="icon-sparkle" />
          </div>
          <div>
            <h3 className="heatmap-heading">Journal Days</h3>
            <p className="heatmap-sub">
              {totalNotesCount} recordings across {activeDaysCount} active days in the last year
            </p>
          </div>
        </div>

        <div className="heatmap-stats-pill">
          <Calendar size={13} />
          <span>Activity Log</span>
        </div>
      </div>

      {/* Heatmap Grid Chamber */}
      <div className="heatmap-grid-scroll-box">
        {/* Heatmap main grid without side/month labels */}
        <div className="heatmap-body-row">
          {/* 52 Columns of Weeks */}
          <div className="heatmap-weeks-columns">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="heatmap-week-col">
                {week.map((cell) => (
                  <button
                    key={cell.dateStr}
                    type="button"
                    className={`heatmap-cell level-${cell.level} ${cell.isFuture ? 'is-future' : ''} ${cell.count > 0 ? 'has-activity' : ''}`}
                    onMouseEnter={(e) => handleCellMouseEnter(e, cell)}
                    onMouseLeave={handleCellMouseLeave}
                    onClick={() => {
                      if (!cell.isFuture && onSelectDate) {
                        onSelectDate(cell.dateStr);
                      }
                    }}
                    aria-label={`${cell.count} notes on ${cell.dateStr}`}
                    disabled={cell.isFuture}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredCell && (
        <div
          className="heatmap-floating-tooltip"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y}px`,
          }}
        >
          <span className="tooltip-bold">
            {hoveredCell.count === 0
              ? 'No voice notes'
              : `${hoveredCell.count} voice note${hoveredCell.count === 1 ? '' : 's'}`}
          </span>
          <span className="tooltip-date"> on {hoveredCell.formattedDate}</span>
        </div>
      )}

      {/* Heatmap Footer Legend */}
      <div className="heatmap-footer-row">
        <span className="heatmap-hint-text">
          Click any day to jump into that date’s recordings
        </span>

        <div className="heatmap-legend-cluster">
          <span className="legend-label">Less</span>
          <div className="legend-cell level-0" />
          <div className="legend-cell level-1" />
          <div className="legend-cell level-2" />
          <div className="legend-cell level-3" />
          <span className="legend-label">More</span>
        </div>
      </div>
    </div>
  );
};
