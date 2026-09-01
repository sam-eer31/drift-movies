import React from 'react';
import { ListOrdered, Loader2 } from 'lucide-react';
import { QualityOption, EpisodeOption } from '@/types';

interface EpisodeGridProps {
  activeSeason: string;
  episodePackages: QualityOption[];
  episodes: EpisodeOption[];
  selectedQualityId?: string;
  selectedEpisodeNumber: number;
  isBatchMode: boolean;
  isResolvingQuality: boolean;
  onSelectEpisodeQuality?: (quality: QualityOption) => void;
  onSelectEpisode?: (episode: EpisodeOption) => void;
}

export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  activeSeason,
  episodePackages,
  episodes,
  selectedQualityId,
  selectedEpisodeNumber,
  isBatchMode,
  isResolvingQuality,
  onSelectEpisodeQuality,
  onSelectEpisode
}) => {
  return (
    <div className="section-panel mb-6 border-primary-subtle">
      {/* Quality Resolution Switcher for Episodes ONLY */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ListOrdered size={18} className="text-primary" />
          <h3 className="text-lg font-bold">
            Episode By Episode Downloads ({activeSeason})
          </h3>
        </div>

        {/* Quality Selector Pills (Guaranteed ONLY Episode List packages) */}
        <div className="flex gap-1.5 flex-wrap">
          {episodePackages.map((q) => {
            const isSelected = !isBatchMode && (selectedQualityId === q.id || selectedQualityId === q.generatorUrl);
            return (
              <button
                key={q.generatorUrl}
                type="button"
                disabled={isResolvingQuality}
                onClick={() => onSelectEpisodeQuality?.(q)}
                className={`quality-pill ${isSelected ? 'active' : ''} ${isResolvingQuality ? 'cursor-wait' : ''}`}
              >
                {q.quality} {q.size ? `[${q.size}]` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Episode Grid */}
      {episodes.length > 0 ? (
        <div className="episode-grid">
          {episodes.map((ep) => {
            const isSelected = !isBatchMode && selectedEpisodeNumber === ep.episodeNumber;
            const isThisLoading = isResolvingQuality && isSelected;

            return (
              <button
                key={ep.episodeNumber}
                type="button"
                disabled={isResolvingQuality}
                onClick={() => onSelectEpisode?.(ep)}
                className={`episode-card ${isSelected ? 'active' : ''} ${isResolvingQuality ? 'cursor-wait' : ''}`}
              >
                <div className="episode-number">
                  EP {ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                </div>

                <div className="episode-status">
                  {isThisLoading ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : isSelected ? (
                    '✓ Active'
                  ) : (
                    'Download'
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted py-3">
          Select a quality package above to load episode links.
        </div>
      )}
    </div>
  );
};
