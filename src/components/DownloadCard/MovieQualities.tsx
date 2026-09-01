import React from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { QualityOption } from '@/types';

interface MovieQualitiesProps {
  availableQualities: QualityOption[];
  selectedQualityId?: string;
  selectedQuality?: string;
  isResolvingQuality: boolean;
  onSelectEpisodeQuality?: (quality: QualityOption) => void;
}

export const MovieQualities: React.FC<MovieQualitiesProps> = ({
  availableQualities,
  selectedQualityId,
  selectedQuality,
  isResolvingQuality,
  onSelectEpisodeQuality
}) => {
  if (availableQualities.length === 0) return null;

  return (
    <div className="section-panel mb-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-primary" />
          <h3 className="text-lg font-bold">
            Available Quality Packages ({availableQualities.length})
          </h3>
        </div>
        <span className="text-sm text-muted">
          Click any package to switch and resolve its direct stream
        </span>
      </div>

      {/* Grid of All Quality Options */}
      <div className="quality-grid">
        {availableQualities.map((q) => {
          const isSelected = selectedQualityId
            ? q.id === selectedQualityId || q.generatorUrl === selectedQualityId
            : q.quality === selectedQuality;

          const isThisLoading = isResolvingQuality && isSelected;

          return (
            <button
              key={q.generatorUrl}
              type="button"
              disabled={isResolvingQuality}
              onClick={() => onSelectEpisodeQuality?.(q)}
              className={`quality-card ${isSelected ? 'active' : ''} ${isResolvingQuality && !isSelected ? 'opacity-60' : ''} ${isResolvingQuality ? 'cursor-wait' : ''}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-1 mb-1.5 min-w-0">
                <span className="quality-title font-bold">
                  {q.quality}
                </span>

                {q.size && (
                  <span className={`quality-size ${isSelected ? 'active' : ''}`}>
                    {q.size}
                  </span>
                )}
              </div>

              <div className="quality-format">
                {q.format || 'BluRay'}
              </div>

              <div className="quality-status flex items-center justify-between">
                <span className={`flex items-center gap-1 font-medium ${isThisLoading ? 'text-primary' : isSelected ? 'status-active' : 'text-muted'}`}>
                  {isThisLoading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Extracting stream...</span>
                    </>
                  ) : isSelected ? (
                    '✓ Active Stream'
                  ) : (
                    'Click to Switch'
                  )}
                </span>

                {isThisLoading && <span className="pulse-dot"></span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
