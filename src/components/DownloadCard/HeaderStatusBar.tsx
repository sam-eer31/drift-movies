import React from 'react';
import { Tv, Film } from 'lucide-react';

interface HeaderStatusBarProps {
  isResolvingQuality: boolean;
  isSeries: boolean;
  source?: string;
}

export const HeaderStatusBar: React.FC<HeaderStatusBarProps> = ({
  isResolvingQuality,
  isSeries,
  source
}) => {
  return (
    <div className="card-header-bar">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="status-pill">
          <span className={`status-dot ${isResolvingQuality ? 'resolving' : 'ready'}`}></span>
          <span className="status-label">
            {isResolvingQuality ? 'Resolving S3 Stream...' : 'Direct S3 Stream Ready'}
          </span>
        </div>

        <div className="type-pill">
          {isSeries ? <Tv size={13} /> : <Film size={13} />}
          <span>{isSeries ? 'Web Series' : 'Movie'}</span>
        </div>

        {source && (
          <span className="source-pill">
            Source: {source === 'Rog' ? 'RogMovies' : 'VegaMovies'}
          </span>
        )}
      </div>
    </div>
  );
};
