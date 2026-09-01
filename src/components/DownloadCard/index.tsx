'use client';

import React, { useState } from 'react';
import './DownloadCard.css';
import { DirectStream, QualityOption, EpisodeOption, MovieSearchResult } from '@/types';
import { HeaderStatusBar } from './HeaderStatusBar';
import { MediaDetails } from './MediaDetails';
import { SeasonTabs } from './SeasonTabs';
import { EpisodeGrid } from './EpisodeGrid';
import { BatchGrid } from './BatchGrid';
import { MovieQualities } from './MovieQualities';
import { DirectMirrorList } from './DirectMirrorList';

interface DownloadCardProps {
  movie?: MovieSearchResult;
  isSeries?: boolean;
  seasons?: string[];
  selectedSeason?: string;
  availableQualities?: QualityOption[];
  selectedQualityId?: string;
  selectedQuality?: string;
  selectedQualityLabel?: string;
  episodes?: EpisodeOption[];
  selectedEpisodeNumber?: number;
  isBatchMode?: boolean;
  selectedBatchLabel?: string;
  fileSize?: string;
  fileName?: string;
  streams?: DirectStream[];
  onSelectEpisodeQuality?: (quality: QualityOption) => void;
  onSelectBatchPackage?: (batchOption: QualityOption) => void;
  onSelectEpisode?: (episode: EpisodeOption) => void;
  onSelectSeason?: (season: string) => void;
  isResolvingQuality?: boolean;
  onExtract?: () => void;
  hasPendingExtraction?: boolean;
}

export const DownloadCard: React.FC<DownloadCardProps> = ({
  movie,
  isSeries = false,
  seasons = [],
  selectedSeason,
  availableQualities = [],
  selectedQualityId,
  selectedQuality = '1080p',
  selectedQualityLabel,
  episodes = [],
  selectedEpisodeNumber = 1,
  isBatchMode = false,
  selectedBatchLabel,
  fileSize,
  fileName,
  streams = [],
  onSelectEpisodeQuality,
  onSelectBatchPackage,
  onSelectEpisode,
  onSelectSeason,
  isResolvingQuality = false,
  onExtract,
  hasPendingExtraction = false
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const primaryStream = streams.find(s => s.recommended) || streams[0];

  // Active Season
  const activeSeason = selectedSeason || (seasons.length > 0 ? seasons[0] : 'Season 1');

  // Filter packages for active season
  const currentSeasonQualities = isSeries && seasons.length > 0
    ? availableQualities.filter(q => !q.season || q.season === activeSeason)
    : availableQualities;

  // Strictly separate Episode list packages and Batch Zip packages
  const episodePackages = currentSeasonQualities.filter(q => q.type === 'episode_list');
  const batchPackages = currentSeasonQualities.filter(q => q.type === 'batch_zip');

  // Find active quality to ensure the badge displays the correctly selected quality before extraction
  const activeQualityObj = availableQualities.find(q => (q.id || q.generatorUrl) === selectedQualityId);
  const displayQuality = activeQualityObj?.quality || selectedQuality;
  const displayQualityLabel = activeQualityObj?.label || selectedQualityLabel || selectedQuality;

  return (
    <div className="panel download-card-main relative">
      <HeaderStatusBar
        isResolvingQuality={isResolvingQuality}
        isSeries={isSeries}
        source={movie?.source}
      />

      <MediaDetails
        title={movie?.title}
        poster={movie?.poster}
        isSeries={isSeries}
        isBatchMode={isBatchMode}
        activeSeason={activeSeason}
        selectedEpisodeNumber={selectedEpisodeNumber}
        displayQuality={displayQuality}
        displayQualityLabel={displayQualityLabel}
        fileSize={fileSize}
        isResolvingQuality={isResolvingQuality}
        hasPendingExtraction={hasPendingExtraction}
        onExtract={onExtract}
        primaryStream={primaryStream}
        handleCopy={handleCopy}
        copiedUrl={copiedUrl}
      />

      {isSeries && (
        <>
          <SeasonTabs
            seasons={seasons}
            activeSeason={activeSeason}
            onSelectSeason={onSelectSeason}
          />
          <EpisodeGrid
            activeSeason={activeSeason}
            episodePackages={episodePackages}
            episodes={episodes}
            selectedQualityId={selectedQualityId}
            selectedEpisodeNumber={selectedEpisodeNumber}
            isBatchMode={isBatchMode}
            isResolvingQuality={isResolvingQuality}
            onSelectEpisodeQuality={onSelectEpisodeQuality}
            onSelectEpisode={onSelectEpisode}
          />
          <BatchGrid
            activeSeason={activeSeason}
            batchPackages={batchPackages}
            selectedQualityId={selectedQualityId}
            isBatchMode={isBatchMode}
            isResolvingQuality={isResolvingQuality}
            onSelectBatchPackage={onSelectBatchPackage}
          />
        </>
      )}

      {!isSeries && (
        <MovieQualities
          availableQualities={availableQualities}
          selectedQualityId={selectedQualityId}
          selectedQuality={selectedQuality}
          isResolvingQuality={isResolvingQuality}
          onSelectEpisodeQuality={onSelectEpisodeQuality}
        />
      )}

      <DirectMirrorList
        streams={streams}
        isResolvingQuality={isResolvingQuality}
        copiedUrl={copiedUrl}
        handleCopy={handleCopy}
      />
    </div>
  );
};
