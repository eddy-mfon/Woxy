import { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Calendar as CalendarIcon,
  HelpCircle,
  Settings as SettingsIcon,
  Search,
  Image as ImageIcon,
  Flame,
  Calendar,
  Clock,
  Mic,
  Zap,
  Trash2,
  Download,
  Upload,
  Users,
} from 'lucide-react';
import type { VoiceNote, StreakStats, NoteCategory } from './types';
import {
  getAllVoiceNotes,
  saveVoiceNote,
  deleteVoiceNote,
  updateVoiceNote,
  exportJournalBackup,
  importJournalBackup,
  requestPersistentStorage,
} from './db';
import {
  formatLocalDate,
  calculateStreaks,
  formatDuration,
} from './utils';
import { AudioRecorder } from './AudioRecorder';
import { VoiceNoteCard } from './VoiceNoteCard';
import { MonthCalendar } from './MonthCalendar';
import { DayDetailStudio } from './DayDetailStudio';
import { OnboardingModal } from './OnboardingModal';
import { WallpaperModal } from './WallpaperModal';
import { InstallDesktopModal } from './InstallDesktopModal';
import { ContributionHeatmap } from './ContributionHeatmap';
import './App.css';

type ActivePage = 'home' | 'calendar' | 'meetings' | 'tags' | 'settings';

export function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatLocalDate(new Date())
  );
  const [_loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | NoteCategory>('all');
  const [userName, setUserName] = useState(
    () => localStorage.getItem('vj_user_name') || ''
  );
  const [journalName, setJournalName] = useState(
    () => localStorage.getItem('vj_journal_name') || 'Voice Journal'
  );
  const [journalBio, setJournalBio] = useState(
    () =>
      localStorage.getItem('vj_journal_bio') ||
      'Personal audio reflections, thoughts, and ideas captured with zero friction.'
  );

  // Wallpaper state
  const [wallpaperUrl, setWallpaperUrl] = useState(
    () => localStorage.getItem('vj_wallpaper') || '/assets/journal-hero.jpg'
  );
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  // Accent Color state: default bright red #ef4444
  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem('vj_accent_color') || 'red'
  );

  // Onboarding Tour state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    return localStorage.getItem('vj_seen_onboarding') !== 'true';
  });

  // Install Desktop prompt state
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Apply accent color to document root
  useEffect(() => {
    const ACCENTS: Record<string, { main: string; hover: string; light: string; glow: string; bg: string }> = {
      red: {
        main: '#ef4444',
        hover: '#dc2626',
        light: '#f87171',
        glow: 'rgba(239, 68, 68, 0.3)',
        bg: 'rgba(239, 68, 68, 0.09)',
      },
      crimson: {
        main: '#e11d48',
        hover: '#be123c',
        light: '#fb7185',
        glow: 'rgba(225, 29, 72, 0.3)',
        bg: 'rgba(225, 29, 72, 0.09)',
      },
      orange: {
        main: '#f97316',
        hover: '#ea580c',
        light: '#fb923c',
        glow: 'rgba(249, 115, 22, 0.3)',
        bg: 'rgba(249, 115, 22, 0.09)',
      },
      purple: {
        main: '#6366f1',
        hover: '#4f46e5',
        light: '#818cf8',
        glow: 'rgba(99, 102, 241, 0.3)',
        bg: 'rgba(99, 102, 241, 0.09)',
      },
      emerald: {
        main: '#10b981',
        hover: '#059669',
        light: '#34d399',
        glow: 'rgba(16, 185, 129, 0.3)',
        bg: 'rgba(16, 185, 129, 0.09)',
      },
      blue: {
        main: '#0284c7',
        hover: '#0369a1',
        light: '#38bdf8',
        glow: 'rgba(2, 132, 199, 0.3)',
        bg: 'rgba(2, 132, 199, 0.09)',
      },
    };

    const cfg = ACCENTS[accentColor] || ACCENTS.red;
    const root = document.documentElement;
    root.style.setProperty('--accent-purple', cfg.main);
    root.style.setProperty('--accent-purple-hover', cfg.hover);
    root.style.setProperty('--accent-purple-light', cfg.light);
    root.style.setProperty('--accent-purple-glow', cfg.glow);
    root.style.setProperty('--accent-purple-bg', cfg.bg);
  }, [accentColor]);

  // Calendar Day Detail Studio state
  const [openedDayStudioDate, setOpenedDayStudioDate] = useState<string | null>(
    null
  );

  const todayStr = formatLocalDate(new Date());

  // Load all voice notes from IndexedDB
  const refreshNotes = async () => {
    try {
      const all = await getAllVoiceNotes();
      setNotes(all);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshNotes();
  }, []);

  // Compute Streak Stats
  const streakStats: StreakStats = useMemo(() => {
    return calculateStreaks(notes);
  }, [notes]);

  // Notes for today's feed, category filters, and search
  const notesForToday = useMemo(() => {
    let list = notes.filter((n) => n.dateStr === todayStr);
    if (activeCategoryFilter !== 'all') {
      list = list.filter((n) => (n.category || 'journal') === activeCategoryFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.notes && n.notes.toLowerCase().includes(q)) ||
        (n.transcript && n.transcript.toLowerCase().includes(q)) ||
        (n.attendees && n.attendees.some((a) => a.toLowerCase().includes(q)))
    );
  }, [notes, todayStr, activeCategoryFilter, searchQuery]);

  // All meetings across the app
  const allMeetingNotes = useMemo(() => {
    return notes.filter((n) => n.category === 'meeting');
  }, [notes]);

  // Audio stats
  const totalSecondsRecorded = useMemo(() => {
    return notes.reduce((acc, n) => acc + (n.duration || 0), 0);
  }, [notes]);

  // Handlers
  const handleSaveRecord = async (
    blob: Blob | undefined,
    duration: number,
    customTitle?: string,
    category: NoteCategory = 'journal',
    notesText?: string,
    attendees?: string[]
  ) => {
    const targetDate = openedDayStudioDate || selectedDate;
    const now = new Date();
    const currentNotesForDay = notes.filter((n) => n.dateStr === targetDate);
    const noteNumber = currentNotesForDay.length + 1;

    const defaultTitle =
      category === 'meeting'
        ? `Meeting #${noteNumber}`
        : category === 'idea'
        ? `Quick Idea #${noteNumber}`
        : category === 'note'
        ? `Note #${noteNumber}`
        : `Voice Note #${noteNumber}`;

    const newNote: VoiceNote = {
      id: `vn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dateStr: targetDate,
      timestamp: now.getTime(),
      duration: Math.max(0, Math.round(duration)),
      audioBlob: blob,
      title: customTitle || defaultTitle,
      category,
      notes: notesText,
      attendees,
    };

    await saveVoiceNote(newNote);
    await refreshNotes();
  };

  const handleDeleteRecord = async (id: string) => {
    await deleteVoiceNote(id);
    await refreshNotes();
  };

  const handleUpdateTitle = async (id: string, newTitle: string) => {
    await updateVoiceNote(id, { title: newTitle });
    await refreshNotes();
  };

  const handleUpdateTranscript = async (id: string, newTranscript: string) => {
    await updateVoiceNote(id, { transcript: newTranscript });
    await refreshNotes();
  };

  const handleUpdateNotes = async (id: string, notesText: string) => {
    await updateVoiceNote(id, { notes: notesText });
    await refreshNotes();
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportJournalBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `woxy-voice-journal-backup-${todayStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error exporting backup: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = await importJournalBackup(text);
      alert(`Successfully imported ${count} voice recordings!`);
      await refreshNotes();
    } catch (err) {
      alert('Failed to import backup: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      e.target.value = '';
    }
  };

  const handleClearAllData = async () => {
    if (
      confirm(
        'Are you sure you want to delete ALL voice journal recordings? This cannot be undone.'
      )
    ) {
      for (const n of notes) {
        await deleteVoiceNote(n.id);
      }
      await refreshNotes();
    }
  };

  const handleSelectWallpaper = (newUrl: string) => {
    setWallpaperUrl(newUrl);
    localStorage.setItem('vj_wallpaper', newUrl);
  };

  const handleCloseOnboarding = async () => {
    setIsOnboardingOpen(false);
    localStorage.setItem('vj_seen_onboarding', 'true');
    // Request persistent storage to protect client data from auto-eviction
    try {
      await requestPersistentStorage();
    } catch (e) {
      console.warn('Persistent storage request:', e);
    }

    // Prompt the user to add to desktop right after completing onboarding
    if (localStorage.getItem('vj_dismissed_desktop_install') !== 'true') {
      setTimeout(() => {
        setIsInstallModalOpen(true);
      }, 350);
    }
  };

  const handleInstallToDesktop = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('vj_dismissed_desktop_install', 'true');
      }
      setDeferredPrompt(null);
    }
    setIsInstallModalOpen(false);
  };

  const handleDismissInstallModal = () => {
    setIsInstallModalOpen(false);
    localStorage.setItem('vj_dismissed_desktop_install', 'true');
  };

  // Notes for day studio
  const studioNotes = useMemo(() => {
    if (!openedDayStudioDate) return [];
    return notes.filter((n) => n.dateStr === openedDayStudioDate);
  }, [notes, openedDayStudioDate]);

  const journeyDisplayName = userName.trim() ? `${userName}’s Journey` : 'My Journey';
  const userEmail = `${userName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}@voicejournal.app`;

  return (
    <div className="light-app-container">
      {/* Onboarding Tour Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        userName={userName}
        onSaveUserName={(newName) => {
          setUserName(newName);
          localStorage.setItem('vj_user_name', newName);
        }}
      />

      {/* Add to Desktop / Offline Modal */}
      <InstallDesktopModal
        isOpen={isInstallModalOpen}
        onClose={handleDismissInstallModal}
        onInstall={handleInstallToDesktop}
        canInstallPrompt={!!deferredPrompt}
      />

      {/* Wallpaper Picker Modal */}
      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        currentWallpaper={wallpaperUrl}
        onSelectWallpaper={handleSelectWallpaper}
      />

      {/* ================= LEFT SIDEBAR (Expands on Hover) ================= */}
      <aside className="ref-sidebar" aria-label="Application Sidebar">
        {/* Woxy Brand Logo Card */}
        <div
          className="sidebar-brand-card"
          onClick={() => setActivePage('home')}
        >
          <div className="brand-logo-wrap">
            <img src="/logot.svg" alt="Woxy Logo" className="brand-logo-img" />
          </div>
          <div className="brand-text-group">
            <span className="brand-app-name">Woxy</span>
          </div>
        </div>

        {/* Sidebar Nav: Home, Meetings, & Calendar */}
        <div className="sidebar-scrollable-nav">
          <div className="nav-group journal-group">
            <span className="nav-group-heading">WORKSPACE</span>
            <nav className="nav-group-list">
              <button
                className={`nav-row-btn ${activePage === 'home' ? 'is-active' : ''}`}
                onClick={() => {
                  setActivePage('home');
                  setOpenedDayStudioDate(null);
                }}
                title="All Notes & Reflections"
              >
                <Home size={19} className="nav-icon" />
                <span className="nav-label">All Notes</span>
              </button>

              <button
                className={`nav-row-btn ${activePage === 'meetings' ? 'is-active' : ''}`}
                onClick={() => {
                  setActivePage('meetings');
                  setOpenedDayStudioDate(null);
                }}
                title="Recorded Meetings & Discussion Notes"
              >
                <Users size={19} className="nav-icon" />
                <span className="nav-label">Meetings ({allMeetingNotes.length})</span>
              </button>

              <button
                className={`nav-row-btn ${activePage === 'calendar' ? 'is-active' : ''}`}
                onClick={() => {
                  setActivePage('calendar');
                  setOpenedDayStudioDate(null);
                }}
                title="Calendar Chronicle"
              >
                <CalendarIcon size={19} className="nav-icon" />
                <span className="nav-label">Calendar</span>
              </button>
            </nav>
          </div>

          {/* Settings Categorization: App Guide, Settings */}
          <div className="nav-group settings-group">
            <span className="nav-group-heading">SETTINGS</span>
            <nav className="nav-group-list">
              <button
                className="nav-row-btn"
                onClick={() => setIsOnboardingOpen(true)}
                title="App Guide & Tour"
              >
                <HelpCircle size={19} className="nav-icon" />
                <span className="nav-label">App Guide</span>
              </button>

              <button
                className={`nav-row-btn ${activePage === 'settings' ? 'is-active' : ''}`}
                onClick={() => {
                  setActivePage('settings');
                  setOpenedDayStudioDate(null);
                }}
                title="Settings"
              >
                <SettingsIcon size={19} className="nav-icon" />
                <span className="nav-label">Settings</span>
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT STAGE ================= */}
      <main className="ref-main-stage">
        {/* Top Header Bar with Search */}
        <header className="ref-top-header">
          <div className="header-search-wrap">
            <Search size={15} className="header-search-icon" />
            <input
              type="text"
              placeholder="Search voice notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header-search-input"
            />
          </div>
        </header>

        {/* Stage Content Scroll Area */}
        <div className="ref-stage-scroll">
          {/* Main Dashboard / Home View */}
          {activePage === 'home' && (
            <div className="projects-view-flow">
              {/* Overhead Panoramic Wallpaper Banner */}
              <div className="hero-banner-card">
                <div
                  className="banner-image-container"
                  onClick={() => {
                    setActivePage('calendar');
                    setOpenedDayStudioDate(null);
                  }}
                  title="Click to view full calendar"
                >
                  <img
                    src={wallpaperUrl}
                    alt="Cover Wallpaper"
                    className="banner-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/journal-hero.jpg';
                    }}
                  />
                </div>
              </div>

              {/* Quick Stats Strip */}
              <div className="segmented-tabs-bar">
                <div className="quick-stats-strip">
                  <span className="strip-label">
                    Today: {notesForToday.length} {notesForToday.length === 1 ? 'entry' : 'entries'} • Total: {notes.length}
                  </span>
                </div>
              </div>

              {/* REVAMPED HERO JOURNEY CARD */}
              <div className="revamped-hero-card">
                <div className="hero-card-top">
                  {/* Left: Avatar with glowing ring */}
                  <div className="hero-avatar-wrap">
                    <div className="hero-avatar-ring">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces"
                        alt={userName}
                        className="hero-avatar-photo"
                      />
                    </div>
                  </div>

                  {/* Center: Journey Title, Status Message */}
                  <div className="hero-meta-center">
                    <div className="hero-title-badge-row">
                      <h2 className="hero-journey-title">{journeyDisplayName}</h2>
                    </div>

                    {/* Status message with yellow lightning bolt Zap icon */}
                    <div className="hero-status-message-row">
                      <Zap size={14} className="hero-zap-icon" />
                      <p className="hero-status-message-text">
                        {streakStats.hasRecordedToday
                          ? 'You have recorded your voice journal today! Add more reflections anytime.'
                          : streakStats.currentStreak > 0
                          ? `You have an active ${streakStats.currentStreak}-day streak! Check in with today’s voice note to keep it going.`
                          : 'Begin your journey! Record today’s first voice note to initiate your streak.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subtle Horizontal Divider Line */}
                <div className="hero-divider-line" />

                {/* Bottom 4 Stat Tickers Row */}
                <div className="hero-tickers-grid">
                  <div
                    className="ticker-col is-clickable"
                    onClick={() => {
                      // Scroll smoothly to today's recorder / calendar
                      const el = document.getElementById('audio-recorder-chamber');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to record today's note and build your streak"
                  >
                    <span className="ticker-label-text">CURRENT STREAK</span>
                    <div className="ticker-metric-row">
                      <Flame size={16} className="metric-icon-flame" />
                      <span className="metric-bold-num">{streakStats.currentStreak}</span>
                      <span className="metric-unit-text">
                        {streakStats.currentStreak === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>

                  <div
                    className="ticker-col is-clickable"
                    onClick={() => {
                      setActivePage('calendar');
                      setOpenedDayStudioDate(null);
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to view full calendar & journal history"
                  >
                    <span className="ticker-label-text">DAYS JOURNALED</span>
                    <div className="ticker-metric-row">
                      <Calendar size={15} className="metric-icon-calendar" />
                      <span className="metric-bold-num">{streakStats.totalJournalDays}</span>
                      <span className="metric-unit-text">days</span>
                    </div>
                  </div>

                  <div
                    className="ticker-col is-clickable"
                    onClick={() => {
                      setActivePage('calendar');
                      setOpenedDayStudioDate(null);
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to browse all your voice notes across days"
                  >
                    <span className="ticker-label-text">TOTAL AUDIO NOTES</span>
                    <div className="ticker-metric-row">
                      <Mic size={15} className="metric-icon-mic" />
                      <span className="metric-bold-num">{streakStats.totalNotes}</span>
                      <span className="metric-unit-text">notes</span>
                    </div>
                  </div>

                  <div
                    className="ticker-col is-clickable"
                    onClick={() => {
                      setActivePage('calendar');
                      setOpenedDayStudioDate(null);
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to see daily listening time breakdown"
                  >
                    <span className="ticker-label-text">LISTENING TIME</span>
                    <div className="ticker-metric-row">
                      <Clock size={15} className="metric-icon-clock" />
                      <span className="metric-bold-num">
                        {formatDuration(totalSecondsRecorded)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Intriguing Audio Recorder Chamber */}
              <div id="audio-recorder-chamber" className="recorder-section-wrap">
                <AudioRecorder
                  onSaveRecord={handleSaveRecord}
                  selectedDateLabel="Today"
                />
              </div>

              {/* Customized GitHub-style Activity Contribution Table */}
              <ContributionHeatmap
                notes={notes}
                onSelectDate={(dateStr) => {
                  setOpenedDayStudioDate(dateStr);
                  setActivePage('calendar');
                }}
              />

              {/* Feed with Category Pills Header */}
              <div className="today-feed-section">
                <div className="today-feed-header-flex">
                  <div>
                    <h3 className="today-feed-title">
                      {activeCategoryFilter === 'all'
                        ? "Today's Notes & Recordings"
                        : activeCategoryFilter === 'meeting'
                        ? "Today's Meetings"
                        : activeCategoryFilter === 'idea'
                        ? "Today's Ideas"
                        : "Today's Journal Entries"}
                    </h3>
                    <span className="today-feed-count">
                      {notesForToday.length} {notesForToday.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  {/* Filter Pills */}
                  <div className="feed-category-filters">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'meeting', label: 'Meetings' },
                        { id: 'journal', label: 'Journal' },
                        { id: 'idea', label: 'Ideas' },
                        { id: 'note', label: 'Notes' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`feed-filter-btn ${activeCategoryFilter === f.id ? 'active' : ''}`}
                        onClick={() => setActiveCategoryFilter(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {notesForToday.length > 0 ? (
                  <div className="ref-campaign-grid">
                    {notesForToday.map((note) => (
                      <VoiceNoteCard
                        key={note.id}
                        note={note}
                        authorName={userName}
                        onDelete={handleDeleteRecord}
                        onUpdateTitle={handleUpdateTitle}
                        onUpdateTranscript={handleUpdateTranscript}
                        onUpdateNotes={handleUpdateNotes}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-category-feed">
                    <p>No notes or recordings found in this view today.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dedicated Meetings View */}
          {activePage === 'meetings' && (
            <div className="meetings-view-flow">
              <div className="view-title-banner">
                <div className="meetings-header-banner">
                  <div className="meetings-title-group">
                    <Users size={24} className="text-accent" />
                    <div>
                      <h2 className="view-main-heading">Meeting Recordings & Notes</h2>
                      <p className="view-sub-heading">
                        All your recorded meetings, agenda items, discussions, and action notes in one place.
                      </p>
                    </div>
                  </div>

                  <button
                    className="btn-new-meeting"
                    onClick={() => {
                      setActivePage('home');
                      setTimeout(() => {
                        const el = document.getElementById('audio-recorder-chamber');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                  >
                    <Mic size={15} />
                    <span>Record New Meeting</span>
                  </button>
                </div>
              </div>

              {allMeetingNotes.length === 0 ? (
                <div className="meetings-empty-state">
                  <div className="empty-meeting-icon">
                    <Users size={32} />
                  </div>
                  <h3>No recorded meetings yet</h3>
                  <p>
                    Select the "Meeting" tab in the recording studio above to capture team discussions, client calls, and standups.
                  </p>
                  <button
                    className="btn-new-meeting primary"
                    onClick={() => {
                      setActivePage('home');
                      setTimeout(() => {
                        const el = document.getElementById('audio-recorder-chamber');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                  >
                    <span>Start Your First Meeting Recording</span>
                  </button>
                </div>
              ) : (
                <div className="ref-campaign-grid">
                  {allMeetingNotes.map((note) => (
                    <VoiceNoteCard
                      key={note.id}
                      note={note}
                      authorName={userName}
                      onDelete={handleDeleteRecord}
                      onUpdateTitle={handleUpdateTitle}
                      onUpdateTranscript={handleUpdateTranscript}
                      onUpdateNotes={handleUpdateNotes}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monthly Calendar View & Day Studio */}
          {activePage === 'calendar' && (
            <div className="calendar-view-flow">
              {openedDayStudioDate ? (
                <DayDetailStudio
                  dateStr={openedDayStudioDate}
                  notes={studioNotes}
                  onBack={() => setOpenedDayStudioDate(null)}
                  onSaveRecord={handleSaveRecord}
                  onDeleteRecord={handleDeleteRecord}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateTranscript={handleUpdateTranscript}
                  onUpdateNotes={handleUpdateNotes}
                />
              ) : (
                <div className="calendar-view-container">
                  <div className="view-title-banner">
                    <div>
                      <h2 className="view-main-heading">Calendar</h2>
                      <p className="view-sub-heading">
                        Days with recorded entries highlight in bluish-purple. Click any date to enter the day studio, review voice notes, add new notes, or delete.
                      </p>
                    </div>
                  </div>

                  <MonthCalendar
                    notes={notes}
                    selectedDate={selectedDate}
                    onSelectDate={(newDate) => setSelectedDate(newDate)}
                    onOpenDayStudio={(dateStr) => setOpenedDayStudioDate(dateStr)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tags View (inside Settings categorization) */}
          {activePage === 'tags' && (
            <div className="tags-view-flow">
              <div className="view-title-banner">
                <div>
                  <h2 className="view-main-heading">Chronicle Tags & Themes</h2>
                  <p className="view-sub-heading">Browse categorized voice journals</p>
                </div>
              </div>

              <div className="tags-chips-container">
                <span className="big-tag-chip purple">#Reflection ({notes.length})</span>
                <span className="big-tag-chip blue">#DailyVoice ({notes.length})</span>
                <span className="big-tag-chip green">#Streaks ({streakStats.currentStreak})</span>
                <span className="big-tag-chip orange">#AudioLog ({notes.length})</span>
              </div>
            </div>
          )}

          {/* Settings & Profile View */}
          {activePage === 'settings' && (
            <div className="settings-view-flow">
              <div className="view-title-banner">
                <div>
                  <h2 className="view-main-heading">Profile & Journal Settings</h2>
                  <p className="view-sub-heading">
                    Manage your author display name, journal identity, and offline storage
                  </p>
                </div>
              </div>

              <div className="settings-forms-col">
                {/* Overhead Wallpaper Settings Card */}
                {/* Accent Color Theme Picker */}
                <div className="settings-card-surface">
                  <h3 className="card-surface-title">Accent Color Theme</h3>
                  <p className="card-surface-desc">
                    Choose an accent color for highlights, buttons, waveforms, and activity streaks.
                  </p>
                  <div className="accent-picker-strip">
                    {[
                      { id: 'red', name: 'Bright Red', color: '#ef4444' },
                      { id: 'crimson', name: 'Crimson Rose', color: '#e11d48' },
                      { id: 'orange', name: 'Warm Amber', color: '#f97316' },
                      { id: 'purple', name: 'Indigo Violet', color: '#6366f1' },
                      { id: 'emerald', name: 'Fresh Emerald', color: '#10b981' },
                      { id: 'blue', name: 'Ocean Blue', color: '#0284c7' },
                    ].map((theme) => {
                      const isSelected = accentColor === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          className={`accent-palette-btn ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => {
                            setAccentColor(theme.id);
                            localStorage.setItem('vj_accent_color', theme.id);
                          }}
                          title={theme.name}
                        >
                          <span
                            className="accent-swatch-circle"
                            style={{ backgroundColor: theme.color }}
                          />
                          <span className="accent-palette-name">{theme.name}</span>
                          {isSelected && <span className="accent-check-dot">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="settings-card-surface">
                  <div className="settings-section-header-row">
                    <div>
                      <h3 className="card-surface-title">Dashboard Overhead Wallpaper</h3>
                      <p className="card-surface-desc">
                        Customize the panoramic cover banner displayed above your dashboard.
                      </p>
                    </div>
                    <button
                      className="btn-settings-wallpaper"
                      onClick={() => setIsWallpaperModalOpen(true)}
                    >
                      <ImageIcon size={15} />
                      <span>Change Cover</span>
                    </button>
                  </div>

                  <div
                    className="settings-wallpaper-preview"
                    onClick={() => setIsWallpaperModalOpen(true)}
                    title="Click to customize wallpaper"
                  >
                    <img
                      src={wallpaperUrl}
                      alt="Wallpaper preview"
                      className="settings-wallpaper-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/journal-hero.jpg';
                      }}
                    />
                    <div className="settings-wallpaper-overlay">
                      <ImageIcon size={16} />
                      <span>Choose from Presets or Upload Custom Cover</span>
                    </div>
                  </div>
                </div>

                <div className="settings-card-surface">
                  <div className="profile-edit-header-row">
                    <div className="profile-logo-display">
                      <img src="/logot.svg" alt="Logo" className="profile-logo-large" />
                    </div>
                    <div>
                      <h3 className="profile-edit-name">{userName}</h3>
                      <p className="profile-edit-email">{userEmail} • Offline Client Storage</p>
                    </div>
                  </div>

                  <div className="setting-field">
                    <label className="field-label">Display Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value);
                        localStorage.setItem('vj_user_name', e.target.value);
                      }}
                      className="field-input"
                    />
                  </div>

                  <div className="setting-field">
                    <label className="field-label">Journal Title</label>
                    <input
                      type="text"
                      value={journalName}
                      onChange={(e) => {
                        setJournalName(e.target.value);
                        localStorage.setItem('vj_journal_name', e.target.value);
                      }}
                      className="field-input"
                    />
                  </div>

                  <div className="setting-field">
                    <label className="field-label">Journal Description</label>
                    <textarea
                      value={journalBio}
                      onChange={(e) => {
                        setJournalBio(e.target.value);
                        localStorage.setItem('vj_journal_bio', e.target.value);
                      }}
                      rows={3}
                      className="field-textarea"
                    />
                  </div>
                </div>

                <div className="settings-card-surface">
                  <h3 className="card-surface-title">Backup & Restore</h3>
                  <p className="card-surface-desc">
                    Export your recordings into a portable backup file so you never lose your memories, or restore them onto another device.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn-settings-wallpaper"
                      onClick={handleExportBackup}
                    >
                      <Download size={15} />
                      <span>Export Backup (.json)</span>
                    </button>

                    <label className="btn-settings-wallpaper" style={{ cursor: 'pointer' }}>
                      <Upload size={15} />
                      <span>Restore from Backup</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                <div className="settings-card-surface">
                  <h3 className="card-surface-title">Desktop & Offline App</h3>
                  <p className="card-surface-desc">
                    Woxy works without internet. Add it to your desktop for quick offline access anytime.
                  </p>
                  <div>
                    <button
                      className="btn-settings-wallpaper"
                      onClick={() => setIsInstallModalOpen(true)}
                    >
                      <Download size={15} />
                      <span>Add to Desktop / Install App</span>
                    </button>
                  </div>
                </div>

                <div className="settings-card-surface">
                  <h3 className="card-surface-title">Data & Privacy</h3>
                  <p className="card-surface-desc">
                    Your audio logs are preserved securely on this computer inside client-side IndexedDB storage.
                  </p>

                  <div className="danger-zone-cluster">
                    <button
                      className="btn-danger-outline"
                      onClick={handleClearAllData}
                    >
                      <Trash2 size={14} />
                      <span>Delete All Voice Recordings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          className={`mobile-nav-btn ${activePage === 'home' ? 'is-active' : ''}`}
          onClick={() => {
            setActivePage('home');
            setOpenedDayStudioDate(null);
          }}
        >
          <Home size={20} />
          <span className="mobile-nav-text">Home</span>
        </button>

        <button
          className={`mobile-nav-btn ${activePage === 'calendar' ? 'is-active' : ''}`}
          onClick={() => {
            setActivePage('calendar');
            setOpenedDayStudioDate(null);
          }}
        >
          <CalendarIcon size={20} />
          <span className="mobile-nav-text">Calendar</span>
        </button>

        <button
          className="mobile-nav-btn"
          onClick={() => setIsOnboardingOpen(true)}
        >
          <HelpCircle size={20} />
          <span className="mobile-nav-text">Guide</span>
        </button>

        <button
          className={`mobile-nav-btn ${activePage === 'settings' ? 'is-active' : ''}`}
          onClick={() => {
            setActivePage('settings');
            setOpenedDayStudioDate(null);
          }}
        >
          <SettingsIcon size={20} />
          <span className="mobile-nav-text">Settings</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
