import React from 'react';

interface SeasonTabsProps {
  seasons: string[];
  activeSeason: string;
  onSelectSeason?: (season: string) => void;
}

export const SeasonTabs: React.FC<SeasonTabsProps> = ({
  seasons,
  activeSeason,
  onSelectSeason
}) => {
  if (seasons.length === 0) return null;

  return (
    <div className="section-panel mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="section-label">Select Season:</span>
        <div className="flex gap-2 flex-wrap">
          {seasons.map((s) => {
            const isSeasonActive = activeSeason === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSelectSeason?.(s)}
                className={`season-tab ${isSeasonActive ? 'active' : ''}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
