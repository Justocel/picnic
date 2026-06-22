'use client';

import { useState } from 'react';

/**
 * COMPONENTE VIDEO ITEM
 * Card de video. Thumbnail hqdefault (480x360) con play icon overlay.
 * Si falla la imagen, muestra un fallback.
 */
function VideoItem({ videoData }) {
  const [thumbnailError, setThumbnailError] = useState(false);

  // mqdefault.jpg es 320x180 (16:9 nativo), a diferencia de hqdefault (4:3).
  // Así no necesitamos recortar y todos los thumbs tienen el mismo aspect.
  const thumbnailUrl = `https://img.youtube.com/vi/${videoData.link}/mqdefault.jpg`;
  const youtubeUrl = `https://youtu.be/${videoData.link}`;

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
            onError={() => setThumbnailError(true)}
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
