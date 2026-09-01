'use client';

import React from 'react';
import './page.css';
import { SearchBar } from '@/components/SearchBar';
import { PipelineStepper } from '@/components/PipelineStepper';
import { LiveConsole } from '@/components/LiveConsole';
import { DownloadCard } from '@/components/DownloadCard';
import { MovieResultsGrid } from '@/components/MovieResultsGrid';
import { FeaturesGrid } from '@/components/FeaturesGrid';
import { AlertCircle, Loader2 } from 'lucide-react';
import { usePipelineStream } from '@/hooks/usePipelineStream';

export default function HomePage() {
  const {
    isLoading,
    isResolvingQuality,
    error,
    steps,
    logs,
    setLogs,
    searchResults,
    activeMovie,
    isSeries,
    seasons,
    selectedSeason,
    allQualities,
    selectedQualityId,
    episodes,
    selectedEpisodeNumber,
    isBatchMode,
    selectedBatchLabel,
    fileSize,
    resolvedData,
    pendingExtractionUrl,
    handleSearch,
    handleSelectMovie,
    handleSelectEpisodeQuality,
    handleSelectBatchPackage,
    handleSelectEpisode,
    handleExtract,
    handleSelectSeason
  } = usePipelineStream();

  return (
    <div className="py-10 pb-20">
      <div className="container">
        {/* Hero Section */}
        <section className="text-center mb-10">
          <h1 className="heading-hero mb-4 mt-4">
            Any Movie. Any Series.<br />
            <span className="text-primary">Zero Ads.</span>
          </h1>

          <p className="text-secondary text-lg max-w-2xl mx-auto mb-8">
            Direct, high-speed stream extraction for movies and full TV seasons. No popups, no waiting.
          </p>

          {/* Clean Search Box */}
          <SearchBar onSearch={handleSearch} isLoading={isLoading || isResolvingQuality} />
        </section>

        {/* Error Alert */}
        {error && (
          <div className="error-alert max-w-3xl mx-auto mb-6">
            <AlertCircle size={20} className="text-error flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Resolution Error</div>
              <div className="text-xs">{error}</div>
            </div>
          </div>
        )}

        {/* 1. Live Pipeline Stepper */}
        {(isLoading || isResolvingQuality || resolvedData || logs.length > 0) && (
          <div id="extraction-section" style={{ scrollMarginTop: '80px' }}>
            <PipelineStepper steps={steps} currentStage={selectedQualityId} />
          </div>
        )}



        {/* Initial Search Skeleton Loading State */}
        {isLoading && !resolvedData && (
          <div className="panel p-10 text-center my-8">
            <div className="flex flex-col items-center gap-4">
              <div className="loader-icon-container">
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
              <h3 className="text-xl font-bold">
                Resolving Media Catalog & Direct Streams...
              </h3>
              <p className="text-muted text-sm max-w-lg">
                Connecting through gateway, parsing episodes/seasons, decoding token, and generating signed S3 stream.
              </p>
            </div>
          </div>
        )}

        {/* 3. Final Resolved Download Card */}
        {resolvedData && (
          <DownloadCard
            movie={activeMovie || resolvedData.movie}
            isSeries={isSeries || resolvedData.isSeries}
            seasons={seasons.length > 0 ? seasons : resolvedData.seasons}
            selectedSeason={selectedSeason || resolvedData.selectedSeason}
            availableQualities={allQualities.length > 0 ? allQualities : resolvedData.availableQualities}
            selectedQualityId={selectedQualityId || resolvedData.selectedQualityId}
            selectedQuality={resolvedData.selectedQuality}
            selectedQualityLabel={resolvedData.selectedQualityLabel || resolvedData.selectedQuality}
            episodes={episodes.length > 0 ? episodes : resolvedData.episodes}
            selectedEpisodeNumber={selectedEpisodeNumber || resolvedData.selectedEpisodeNumber}
            isBatchMode={isBatchMode}
            selectedBatchLabel={selectedBatchLabel}
            fileSize={fileSize || resolvedData.fileSize}
            fileName={resolvedData.fileName}
            streams={resolvedData.streams}
            onSelectEpisodeQuality={handleSelectEpisodeQuality}
            onSelectBatchPackage={handleSelectBatchPackage}
            onSelectEpisode={handleSelectEpisode}
            onSelectSeason={handleSelectSeason}
            isResolvingQuality={isResolvingQuality}
            onExtract={handleExtract}
            hasPendingExtraction={!!pendingExtractionUrl}
          />
        )}

        {/* 4. Alternate Search Hits Grid */}
        {searchResults.length > 1 && (
          <MovieResultsGrid
            results={searchResults}
            selectedMovieUrl={activeMovie?.url}
            onSelectMovie={handleSelectMovie}
            isLoading={isLoading || isResolvingQuality}
          />
        )}

        {/* 2. Real-time Streaming Terminal Console */}
        {(logs.length > 0 || isLoading) && (
          <LiveConsole logs={logs} onClearLogs={() => setLogs([])} />
        )}

        {/* Features Info Section */}
        <FeaturesGrid />
      </div>
    </div>
  );
}
