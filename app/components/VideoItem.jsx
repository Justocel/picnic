'use client';

import { useState } from 'react';

/**
 * COMPONENTE VIDEO ITEM
 * Card de video. Thumbnail hqdefault (480x360) con play icon overlay.
 * Si falla la imagen, muestra un fallback.
 */
function VideoItem({ videoData }) {
  // Empezamos por maxresdefault (1280x720, 16:9, alta calidad). Si YouTube
  // no lo generó para ese video — pasa con uploads vertical o shorts —, el
  // onError baja a mqdefault (320x180, 16:9 garantizado). Si ese tampoco,
  // muestra el placeholder.
  const [thumbnailQuality, setThumbnailQuality] = useState('maxresdefault');
  const [thumbnailError, setThumbnailError] = useState(false);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoData.link}/${thumbnailQuality}.jpg`;
  const youtubeUrl = `https://youtu.be/${videoData.link}`;

  const handleImgError = () => {
    if (thumbnailQuality === 'maxresdefault') {
      setThumbnailQuality('mqdefault');
    } else {
      setThumbnailError(true);
    }
  };

  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="video-item"
    >
      <div className="video-thumbnail-wrapper">
        {!thumbnailError ? (
          <img
            src={thumbnailUrl}
            alt={videoData.titulo}
            className="video-thumbnail"
            onError={handleImgError}
            loading="lazy"
          />
        ) : (
          <div className="video-thumbnail video-thumbnail-error">
            <span>Thumbnail no disponible</span>
          </div>
        )}
        <span className="video-play-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
      <p>{videoData.titulo}</p>
    </a>
  );
}

export default VideoItem;
