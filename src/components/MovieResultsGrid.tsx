'use client';

import React from 'react';
import { Film, ArrowRight } from 'lucide-react';
import { MovieSearchResult } from '@/types';

interface MovieResultsGridProps {
  results: MovieSearchResult[];
  selectedMovieUrl?: string;
  onSelectMovie: (movie: MovieSearchResult) => void;
  isLoading?: boolean;
}

export const MovieResultsGrid: React.FC<MovieResultsGridProps> = ({
  results,
  selectedMovieUrl,
  onSelectMovie,
  isLoading
}) => {
  if (!results || results.length <= 1) {
    return null;
  }

  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">
          Found {results.length} Movie Matches
        </h3>
        <span className="text-xs text-muted">
          Click any card to switch and resolve its direct stream
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((movie) => {
          const isSelected = movie.url === selectedMovieUrl;
          const isRog = movie.source === 'Rog';
          
          let cardClass = 'result-card panel';
          if (isSelected) cardClass += ' selected';
          if (isLoading) cardClass += ' loading';

          return (
            <div
              key={movie.url}
              onClick={() => !isLoading && onSelectMovie(movie)}
              className={cardClass}
            >
              <div className="poster-container flex items-center justify-center flex-shrink-0">
                {movie.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="poster-img"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <Film size={20} className="text-muted" />
                )}
              </div>

              <div className="content-container">
                <div className={`title-text ${isSelected ? 'text-primary' : 'text-primary-color'}`}>
                  {movie.title}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`source-badge ${isRog ? 'badge-rog' : 'badge-vega'}`}>
                    {isRog ? 'RogMovies' : 'VegaMovies'}
                  </span>

                  {movie.year && (
                    <span className="text-xs text-muted">
                      {movie.year}
                    </span>
                  )}
                </div>
              </div>

              <ArrowRight size={16} className={isSelected ? 'text-primary' : 'text-muted'} />
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .my-8 { margin-top: 32px; margin-bottom: 32px; }
        .text-lg { font-size: 1.125rem; }
        .text-xs { font-size: 0.75rem; }
        .text-primary-color { color: var(--text-primary); }
        .flex-shrink-0 { flex-shrink: 0; }

        .result-card {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .result-card:hover {
          background-color: var(--bg-surface-hover);
        }

        .result-card.selected {
          border-color: var(--primary);
          background-color: rgba(255, 255, 255, 0.05); /* var(--primary) with opacity */
        }

        .result-card.loading {
          cursor: wait;
        }

        .poster-container {
          width: 48px;
          height: 66px;
          border-radius: 6px;
          overflow: hidden;
          background-color: var(--bg-surface-hover);
        }

        .poster-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .content-container {
          flex: 1;
          min-width: 0;
        }

        .title-text {
          font-size: 0.85rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }

        .source-badge {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .badge-rog {
          background-color: rgba(239, 68, 68, 0.15); /* error */
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .badge-vega {
          background-color: rgba(234, 179, 8, 0.15); /* accent/amber */
          color: var(--accent);
          border: 1px solid rgba(234, 179, 8, 0.3);
        }
      `}</style>
    </div>
  );
};
