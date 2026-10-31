import React, { useState } from 'react';
import { Mic, Calendar, Flame, Sparkles, ChevronRight, CheckCircle2, X, User } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onSaveUserName: (name: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  userName,
  onSaveUserName,
}) => {
  const [step, setStep] = useState(0);
  const [inputName, setInputName] = useState(userName || '');

  if (!isOpen) return null;

  const currentDisplayName = inputName.trim() || 'friend';

  const slides = [
    {
      badge: 'Welcome to Woxy',
      title: 'What should we call you?',
      description:
        'Woxy is your private voice journal. Enter your name to personalize your reflections.',
      icon: <User size={28} className="tour-slide-icon purple" />,
      isNamePrompt: true,
      features: [
        '100% private — saved right on your device',
        'Works completely offline with zero tracking',
      ],
    },
    {
      badge: 'Capture Thoughts',
      title: `Nice to meet you, ${currentDisplayName}!`,
      description:
        'Whenever you have an idea, feeling, or lesson, just tap the mic and speak freely.',
      icon: <Sparkles size={28} className="tour-slide-icon purple" />,
      features: [
        'Record as many notes as you want every day',
        'Simple, fast, and zero pressure',
        'Your voice reflections are stored safely on your computer',
      ],
    },
    {
      badge: 'Daily Streaks',
      title: 'Keep your streak alive',
      description:
        'Record at least one voice note each day to keep your streak going. Build a habit one day at a time!',
      icon: <Flame size={28} className="tour-slide-icon orange" />,
      features: [
        'See your streak right on the home page',
        'Track your total active days and listening time',
        'Build self-reflection into your daily routine',
      ],
    },
    {
      badge: 'Simple Calendar',
      title: 'Look back at past days',
      description:
        'The calendar shows every day you have recorded. Colored days mean you logged a note!',
      icon: <Calendar size={28} className="tour-slide-icon blue" />,
      features: [
        'Tap any day to listen to your recordings',
        'Add new voice notes to any past day',
        'Rename or delete notes with one tap',
      ],
    },
    {
      badge: 'Make It Yours',
      title: 'Personalize your space',
      description:
        'Change your cover photo, update your profile, and make your journal feel like home.',
      icon: <Mic size={28} className="tour-slide-icon green" />,
      features: [
        'Pick from scenic cover photos or use your own image',
        'Change your display name anytime in Settings',
        'Download your recordings whenever you need them',
      ],
    },
  ];

  const current = slides[step];
  const isLast = step === slides.length - 1;

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) {
      onSaveUserName(inputName.trim());
    }
    setStep(1);
  };

  const nextStep = () => {
    if (step === 0 && inputName.trim()) {
      onSaveUserName(inputName.trim());
    }

    if (isLast) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal-card">
        <button
          className="btn-close-onboarding"
          onClick={() => {
            if (inputName.trim()) onSaveUserName(inputName.trim());
            onClose();
          }}
          aria-label="Close Tour"
        >
          <X size={16} />
        </button>

        <div className="onboarding-header">
          <div className="tour-icon-wrap">{current.icon}</div>
          <span className="tour-badge">{current.badge}</span>
        </div>

        <div className="onboarding-body">
          <h2 className="tour-slide-title">{current.title}</h2>
          <p className="tour-slide-desc">{current.description}</p>

          {/* Name input on the first slide */}
          {current.isNamePrompt && (
            <form onSubmit={handleNameSubmit} className="onboarding-name-form">
              <label className="onboarding-input-label">Your Name or Nickname</label>
              <div className="onboarding-input-row">
                <input
                  type="text"
                  placeholder="e.g. Eddy, Alex, Maya..."
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="onboarding-name-input"
                  autoFocus
                  maxLength={30}
                />
              </div>
            </form>
          )}

          <div className="tour-feature-list">
            {current.features.map((f, i) => (
              <div key={i} className="tour-feature-item">
                <CheckCircle2 size={16} className="tour-check" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="onboarding-footer">
          <div className="tour-dots">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`tour-dot ${i === step ? 'active' : ''}`}
                onClick={() => {
                  if (step === 0 && inputName.trim()) onSaveUserName(inputName.trim());
                  setStep(i);
                }}
              />
            ))}
          </div>

          <div className="tour-actions">
            {step > 0 && (
              <button
                className="btn-tour-secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            <button className="btn-tour-primary" onClick={nextStep}>
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
