import React from 'react';
import { Download, Monitor, ShieldCheck, X, HardDrive } from 'lucide-react';

interface InstallDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  canInstallPrompt: boolean;
}

export const InstallDesktopModal: React.FC<InstallDesktopModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  canInstallPrompt,
}) => {
  if (!isOpen) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal-card install-desktop-modal-card">
        <button
          className="btn-close-onboarding"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="install-modal-header">
          <div className="install-logo-icon-wrap">
            <img src="/logot.svg" alt="Woxy" className="install-woxy-logo" />
            <div className="install-badge-corner">
              <Download size={14} />
            </div>
          </div>
          <span className="tour-badge">Quick Desktop Setup</span>
        </div>

        <div className="onboarding-body">
          <h2 className="tour-slide-title">Use Woxy Anytime — Even Offline</h2>
          <p className="tour-slide-desc">
            Add Woxy directly to your desktop or device for instant one-click access.
          </p>

          <div className="install-storage-notice-card">
            <div className="notice-icon-box">
              <HardDrive size={18} />
            </div>
            <div className="notice-content">
              <h4 className="notice-title">All voice notes stay safely on your computer</h4>
              <p className="notice-desc">
                Your recordings are saved securely in your browser's private local storage. They never leave your device and work completely offline without internet!
              </p>
            </div>
          </div>

          <div className="tour-feature-list">
            <div className="tour-feature-item">
              <ShieldCheck size={16} className="tour-check" />
              <span>Zero internet needed — record reflections anytime, anywhere</span>
            </div>
            <div className="tour-feature-item">
              <Monitor size={16} className="tour-check" />
              <span>Opens like a dedicated desktop app from your dock or home screen</span>
            </div>
          </div>
        </div>

        <div className="install-modal-footer">
          <button
            type="button"
            className="btn-install-dismiss"
            onClick={onClose}
          >
            Maybe Later
          </button>

          {canInstallPrompt ? (
            <button
              type="button"
              className="btn-install-confirm"
              onClick={onInstall}
            >
              <Download size={16} />
              <span>Add to Desktop</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-install-confirm"
              onClick={() => {
                alert(
                  'To install Woxy:\n• On Chrome/Edge: Click the install icon (🖥️ or ⬇️) in your browser address bar.\n• On Mac/Safari: File > Add to Dock.\n• On Mobile: Tap Share > "Add to Home Screen".'
                );
                onClose();
              }}
            >
              <Monitor size={16} />
              <span>How to Add to Desktop</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
