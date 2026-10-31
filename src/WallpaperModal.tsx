import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, Check, X, Sparkles } from 'lucide-react';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper: string;
  onSelectWallpaper: (url: string) => void;
}

export const PRESET_WALLPAPERS = [
  {
    id: 'anime-cloud',
    title: 'Ghibli Cloud Tree (Default)',
    url: '/assets/journal-hero.jpg',
    thumbnail: '/assets/journal-hero.jpg',
  },
  {
    id: 'lofi-sunset',
    title: 'Warm Twilight Horizon',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'starry-mountains',
    title: 'Midnight Nebula Peaks',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'forest-mist',
    title: 'Ethereal Redwood Mist',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'tokyo-neon',
    title: 'Rainy City Glow',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'minimal-gradient',
    title: 'Deep Cosmic Horizon',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80',
  },
];

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper,
  onSelectWallpaper,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onSelectWallpaper(reader.result);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelectWallpaper(customUrl.trim());
      onClose();
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="wallpaper-modal-card">
        <div className="wallpaper-modal-header">
          <div className="header-icon-title">
            <ImageIcon size={20} className="icon-purple" />
            <div>
              <h3 className="modal-title">Overhead Wallpaper</h3>
              <p className="modal-subtitle">Choose a backdrop or upload your own wallpaper</p>
            </div>
          </div>
          <button className="btn-close-onboarding" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="wallpaper-grid">
          {PRESET_WALLPAPERS.map((wp) => {
            const isSelected = currentWallpaper === wp.url;
            return (
              <div
                key={wp.id}
                className={`wallpaper-tile ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectWallpaper(wp.url);
                  onClose();
                }}
              >
                <img src={wp.thumbnail} alt={wp.title} className="wp-thumb-img" />
                <div className="wp-tile-overlay">
                  <span className="wp-tile-title">{wp.title}</span>
                  {isSelected && (
                    <span className="wp-selected-badge">
                      <Check size={14} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="wallpaper-custom-section">
          <div className="custom-upload-block">
            <button
              className="btn-upload-file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={15} />
              <span>Upload from device</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          <form onSubmit={handleCustomUrlSubmit} className="custom-url-form">
            <input
              type="url"
              placeholder="Paste direct image URL..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="custom-url-input"
            />
            <button type="submit" className="btn-apply-url" disabled={!customUrl.trim()}>
              <Sparkles size={14} />
              <span>Apply</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
