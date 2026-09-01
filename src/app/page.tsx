'use client';

import React, { useState, useRef } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { PipelineStepper } from '@/components/PipelineStepper';
import { LiveConsole } from '@/components/LiveConsole';
import { DownloadCard } from '@/components/DownloadCard';
import { MovieResultsGrid } from '@/components/MovieResultsGrid';
import { PipelineStep, PipelineLog, MovieSearchResult, QualityOption, EpisodeOption, ResolveResponseData } from '@/types';
import { Shield, Zap, RefreshCw, AlertCircle, Loader2, Tv, Film } from 'lucide-react';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResolvingQuality, setIsResolvingQuality] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [steps, setSteps] = useState<Record<string, PipelineStep>>({
    gateway: { id: 'gateway', label: '1. Gateway Discovery', status: 'idle' },
    search: { id: 'search', label: '2. Catalog Search', status: 'idle' },
    quality: { id: 'quality', label: '3. Seasons & Quality Detection', status: 'idle' },
    stream: { id: 'stream', label: '4. Token & Stream Extractor', status: 'idle' }
  });

  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [activeMovie, setActiveMovie] = useState<MovieSearchResult | null>(null);
  
  // Web Series & Quality States
  const [isSeries, setIsSeries] = useState<boolean>(false);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('Season 1');
  const [allQualities, setAllQualities] = useState<QualityOption[]>([]);
  const [selectedQualityId, setSelectedQualityId] = useState<string>('');
  const [episodes, setEpisodes] = useState<EpisodeOption[]>([]);
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState<number>(1);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedBatchLabel, setSelectedBatchLabel] = useState<string>('');
  const [fileSize, setFileSize] = useState<string | undefined>();
  const [resolvedData, setResolvedData] = useState<ResolveResponseData | null>(null);
  const [pendingExtractionUrl, setPendingExtractionUrl] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', stage = 'Client') => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        stage,
        message,
        type
      }
    ]);
  };

  const startStreamResolution = async (url: string, isQualityOrEpSwitch = false, targetSize?: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setError(null);
    if (targetSize) {
      setFileSize(targetSize);
    }
    if (isQualityOrEpSwitch) {
      setIsResolvingQuality(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch(url, { signal: abortController.signal });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue;

          let eventType = 'message';
          let eventData = '';

          for (const line of eventBlock.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.replace('data: ', '').trim();
            }
          }

          if (!eventData) continue;

          try {
            const parsed = JSON.parse(eventData);

            if (eventType === 'step') {
              setSteps(prev => ({
                ...prev,
                [parsed.id]: {
                  id: parsed.id,
                  label: parsed.label,
                  status: parsed.status
                }
              }));
            } else if (eventType === 'log') {
              setLogs(prev => [...prev, parsed]);
            } else if (eventType === 'search_results') {
              setSearchResults(parsed.results || []);
              if (parsed.selected) {
                setActiveMovie(parsed.selected);
              }
            } else if (eventType === 'qualities') {
              setAllQualities(parsed.qualities || []);
              setIsSeries(!!parsed.isSeries);
              setSeasons(parsed.seasons || []);
              if (parsed.seasons && parsed.seasons.length > 0) {
                setSelectedSeason(parsed.seasons[0]);
              }
            } else if (eventType === 'episode_stream_resolved') {
              // Quick update when switching an episode
              setResolvedData(prev => prev ? {
                ...prev,
                selectedEpisodeNumber: parsed.episodeNumber,
                streams: parsed.streams,
                fileName: parsed.fileName || prev.fileName
              } : null);
              if (parsed.episodeNumber) {
                setSelectedEpisodeNumber(parsed.episodeNumber);
              }
              setIsBatchMode(false);
              setIsResolvingQuality(false);
            } else if (eventType === 'quality_stream_resolved') {
              // Quick update when switching qualities
              setResolvedData(prev => prev ? {
                ...prev,
                selectedQualityId: parsed.generatorUrl,
                selectedQuality: parsed.qualityLabel || prev.selectedQuality,
                streams: parsed.streams,
                fileName: parsed.fileName || prev.fileName,
                fileSize: targetSize || prev.fileSize,
                episodes: parsed.episodes || prev.episodes,
                selectedEpisodeNumber: parsed.selectedEpisodeNumber || 1
              } : null);
              setSelectedQualityId(parsed.generatorUrl);
              if (parsed.episodes) {
                setEpisodes(parsed.episodes);
                setSelectedEpisodeNumber(1);
                setIsBatchMode(false);
              }
              if (parsed.isBatch) {
                setIsBatchMode(true);
              }
              setIsResolvingQuality(false);
            } else if (eventType === 'complete') {
              setResolvedData(parsed);
              setIsSeries(!!parsed.isSeries);
              if (parsed.seasons) {
                setSeasons(parsed.seasons);
                setSelectedSeason(parsed.selectedSeason || parsed.seasons[0] || 'Season 1');
              }
              if (parsed.availableQualities) {
                setAllQualities(parsed.availableQualities);
              }
              if (parsed.selectedQualityId) {
                setSelectedQualityId(parsed.selectedQualityId);
              }
              if (parsed.episodes) {
                setEpisodes(parsed.episodes);
              }
              if (parsed.selectedEpisodeNumber) {
                setSelectedEpisodeNumber(parsed.selectedEpisodeNumber);
              }
              if (parsed.fileSize) {
                setFileSize(parsed.fileSize);
              }
              if (parsed.movie) {
                setActiveMovie(prev => {
                  if (!prev) return parsed.movie;
                  return {
                    ...prev,
                    ...parsed.movie,
                    title: parsed.movie.title || prev.title,
                    poster: parsed.movie.poster || prev.poster,
                    source: parsed.movie.source || prev.source
                  };
                });
              }

              // Set pending extraction URL for the default selected options
              if (!parsed.streams || parsed.streams.length === 0) {
                 const isBatch = parsed.downloadMode === 'batch';
                 let targetUrl = '';
                 if (parsed.episodes && parsed.episodes.length > 0) {
                    const ep = parsed.episodes.find((e: any) => e.episodeNumber === (parsed.selectedEpisodeNumber || 1)) || parsed.episodes[0];
                    targetUrl = `/api/resolve?episodeUrl=${encodeURIComponent(ep.generatorUrl)}&episodeNumber=${ep.episodeNumber}`;
                 } else if (parsed.selectedQualityId) {
                    targetUrl = `/api/resolve?generatorUrl=${encodeURIComponent(parsed.selectedQualityId)}&qualityLabel=${encodeURIComponent(parsed.selectedQualityLabel || '')}&isBatch=${isBatch}`;
                 }
                 setPendingExtractionUrl(targetUrl);
              }

              setIsBatchMode(parsed.downloadMode === 'batch');
              setIsLoading(false);
              setIsResolvingQuality(false);
            } else if (eventType === 'error') {
              setError(parsed.message || 'An error occurred during link resolution.');
              setIsLoading(false);
              setIsResolvingQuality(false);
            }
          } catch {
            // Ignore parse errors on stream chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Connection failed.');
        addLog(`Pipeline error: ${err.message}`, 'error', 'Network');
      }
    } finally {
      setIsLoading(false);
      setIsResolvingQuality(false);
    }
  };

  const handleSearch = (query: string) => {
    setResolvedData(null);
    setSearchResults([]);
    setAllQualities([]);
    setEpisodes([]);
    setSeasons([]);
    setSelectedQualityId('');
    setIsBatchMode(false);
    setFileSize(undefined);
    setLogs([]);
    setSteps({
      gateway: { id: 'gateway', label: '1. Gateway Discovery', status: 'idle' },
      search: { id: 'search', label: '2. Catalog Search', status: 'idle' },
      quality: { id: 'quality', label: '3. Seasons & Quality Detection', status: 'idle' },
      stream: { id: 'stream', label: '4. Token & Stream Extractor', status: 'idle' }
    });
    setPendingExtractionUrl(null);

    addLog(`Initiating real-time search for "${query}"`, 'info', 'UI');
    const url = `/api/resolve?q=${encodeURIComponent(query)}`;
    startStreamResolution(url);
  };

  const handleSelectMovie = (movie: MovieSearchResult) => {
    setActiveMovie(movie);
    setResolvedData(null);
    setAllQualities([]);
    setEpisodes([]);
    setSelectedQualityId('');
    setIsBatchMode(false);
    setFileSize(undefined);
    setPendingExtractionUrl(null);
    addLog(`User selected: "${movie.title}"`, 'info', 'UI');
    const url = `/api/resolve?movieUrl=${encodeURIComponent(movie.url)}`;
    startStreamResolution(url);
  };

  // Quality selector for Episode by Episode section ONLY
  const handleSelectEpisodeQuality = (qualityOption: QualityOption) => {
    setSelectedQualityId(qualityOption.id || qualityOption.generatorUrl);
    setIsBatchMode(false);
    if (qualityOption.size) setFileSize(qualityOption.size);
    addLog(`Prepared episode quality: ${qualityOption.label}`, 'info', 'UI');
    const url = `/api/resolve?generatorUrl=${encodeURIComponent(qualityOption.generatorUrl)}&qualityLabel=${encodeURIComponent(qualityOption.label)}&isBatch=false`;
    setPendingExtractionUrl(url);
    setResolvedData(prev => prev ? { ...prev, streams: [] } : null);
  };

  // Full Season Batch Zip selector ONLY
  const handleSelectBatchPackage = (batchOption: QualityOption) => {
    setSelectedQualityId(batchOption.id || batchOption.generatorUrl);
    setIsBatchMode(true);
    setSelectedBatchLabel(batchOption.label);
    if (batchOption.size) setFileSize(batchOption.size);
    addLog(`Prepared full season batch zip: ${batchOption.label}`, 'info', 'UI');
    const url = `/api/resolve?generatorUrl=${encodeURIComponent(batchOption.generatorUrl)}&qualityLabel=${encodeURIComponent(batchOption.label)}&isBatch=true`;
    setPendingExtractionUrl(url);
    setResolvedData(prev => prev ? { ...prev, streams: [] } : null);
  };

  const handleSelectEpisode = (episode: EpisodeOption) => {
    setSelectedEpisodeNumber(episode.episodeNumber);
    setIsBatchMode(false);
    addLog(`Prepared Episode ${episode.episodeNumber} (${episode.generatorUrl})...`, 'info', 'UI');
    const url = `/api/resolve?episodeUrl=${encodeURIComponent(episode.generatorUrl)}&episodeNumber=${episode.episodeNumber}`;
    setPendingExtractionUrl(url);
    setResolvedData(prev => prev ? { ...prev, streams: [] } : null);
  };

  const handleExtract = () => {
    if (pendingExtractionUrl) {
      startStreamResolution(pendingExtractionUrl, true, fileSize);
      setPendingExtractionUrl(null);
    }
  };

  const handleSelectSeason = (season: string) => {
    setSelectedSeason(season);
    // Find primary episode package for this season
    const matching = allQualities.find(q => q.season === season && q.type === 'episode_list') ||
                     allQualities.find(q => q.season === season);
    if (matching) {
      if (matching.type === 'episode_list') {
        handleSelectEpisodeQuality(matching);
      } else {
        handleSelectBatchPackage(matching);
      }
    }
  };

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
          <PipelineStepper steps={steps} currentStage={selectedQualityId} />
        )}

        {/* 2. Real-time Streaming Terminal Console */}
        {(logs.length > 0 || isLoading) && (
          <LiveConsole logs={logs} onClearLogs={() => setLogs([])} />
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

        {/* 3. Final Resolved Download Card (Supports Movies, Web Series, Episodes & Batch Zip) */}
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

        {/* Features Info Section */}
        <section className="features-grid">
          <div className="panel p-6 feature-card">
            <div className="feature-icon bg-primary-subtle text-primary">
              <Tv size={22} />
            </div>
            <h4 className="feature-title">
              Full Web Series & Episodes
            </h4>
            <p className="feature-desc">
              Browse seasons, download individual episodes in 1 click, or grab full season batch zip archives.
            </p>
          </div>

          <div className="panel p-6 feature-card">
            <div className="feature-icon bg-success-subtle text-success">
              <Shield size={22} />
            </div>
            <h4 className="feature-title">
              100% Ad & Popunder Free
            </h4>
            <p className="feature-desc">
              Extracts the underlying signed Cloudflare R2 S3 stream directly, skipping all ad redirects and fake download buttons.
            </p>
          </div>

          <div className="panel p-6 feature-card">
            <div className="feature-icon bg-warning-subtle text-warning">
              <Zap size={22} />
            </div>
            <h4 className="feature-title">
              Multi-Portal Parallel Search
            </h4>
            <p className="feature-desc">
              Queries VegaMovies & RogMovies concurrently to find any Hollywood, Bollywood, or regional series.
            </p>
          </div>
        </section>
      </div>

      <style jsx>{`
        .py-10 { padding-top: 40px; padding-bottom: 40px; }
        .pb-20 { padding-bottom: 80px; }
        .text-center { text-align: center; }
        .mb-10 { margin-bottom: 40px; }
        
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: var(--radius-full);
          background-color: #121212;
          border: 1px solid var(--border-subtle);
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }

        .text-lg { font-size: 1.125rem; }
        .max-w-2xl { max-width: 42rem; }
        .max-w-3xl { max-width: 48rem; }
        .max-w-lg { max-width: 32rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        
        .error-alert {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fca5a5;
          margin-top: 20px;
        }

        .loader-icon-container {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background-color: #1A1A1A;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .text-xl { font-size: 1.25rem; }
        .p-10 { padding: 40px; }
        .my-8 { margin-top: 32px; margin-bottom: 32px; }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          margin-top: 60px;
        }

        .feature-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
          transition: all 0.2s ease;
        }
        .feature-card:hover {
          background-color: var(--bg-surface-hover);
          border-color: var(--border-muted);
          transform: translateY(-2px);
        }

        .feature-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }

        .feature-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .feature-desc {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
