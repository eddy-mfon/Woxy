import React from 'react';
import type { StreakStats } from './types';

interface StreakBannerProps {
  stats: StreakStats;
}

export const StreakBanner: React.FC<StreakBannerProps> = ({ stats }) => {
  return (
    <div className="editorial-masthead-stats">
      <div className="stat-column primary-streak">
        <span className="stat-overline">Current Sequence</span>
        <div className="stat-num-row">
          <span className="stat-giant-num">{stats.currentStreak}</span>
          <span className="stat-suffix">{stats.currentStreak === 1 ? 'day' : 'days'}</span>
        </div>
        <p className="stat-caption">
          {stats.hasRecordedToday
            ? 'Chronicle recorded for today'
            : stats.currentStreak > 0
            ? 'Awaiting today’s dispatch'
            : 'Begin your consecutive entries'}
        </p>
      </div>

      <div className="stat-divider" />

      <div className="stat-column">
        <span className="stat-overline">Longest Run</span>
        <div className="stat-medium-num">
          {stats.longestStreak} <span className="stat-sub">{stats.longestStreak === 1 ? 'day' : 'days'}</span>
        </div>
        <p className="stat-caption">Personal record</p>
      </div>

      <div className="stat-divider" />

      <div className="stat-column">
        <span className="stat-overline">Archived Days</span>
        <div className="stat-medium-num">{stats.totalJournalDays}</div>
        <p className="stat-caption">Days logged</p>
      </div>

      <div className="stat-divider" />

      <div className="stat-column">
        <span className="stat-overline">Total Audio</span>
        <div className="stat-medium-num">{stats.totalNotes}</div>
        <p className="stat-caption">Recordings</p>
      </div>
    </div>
  );
};
