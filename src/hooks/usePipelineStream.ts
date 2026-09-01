import { useState, useRef } from 'react';
import { PipelineStep, PipelineLog, MovieSearchResult, QualityOption, EpisodeOption, ResolveResponseData } from '@/types';

export function usePipelineStream() {
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
              setTimeout(() => {
                document.getElementById('extract-action-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            } else if (eventType === 'quality_stream_resolved') {
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
              setTimeout(() => {
                document.getElementById('extract-action-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
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
              setTimeout(() => {
                document.getElementById('extract-action-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
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
    
    setTimeout(() => {
      document.getElementById('extraction-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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

    setTimeout(() => {
      document.getElementById('extraction-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSelectEpisodeQuality = (qualityOption: QualityOption) => {
    setSelectedQualityId(qualityOption.id || qualityOption.generatorUrl);
    setIsBatchMode(false);
    if (qualityOption.size) setFileSize(qualityOption.size);
    addLog(`Prepared episode quality: ${qualityOption.label}`, 'info', 'UI');
    const url = `/api/resolve?generatorUrl=${encodeURIComponent(qualityOption.generatorUrl)}&qualityLabel=${encodeURIComponent(qualityOption.label)}&isBatch=false`;
    setPendingExtractionUrl(url);
    setResolvedData(prev => prev ? { ...prev, streams: [] } : null);

    setTimeout(() => {
      document.getElementById('extract-action-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSelectBatchPackage = (batchOption: QualityOption) => {
    setSelectedQualityId(batchOption.id || batchOption.generatorUrl);
    setIsBatchMode(true);
    setSelectedBatchLabel(batchOption.label);
    if (batchOption.size) setFileSize(batchOption.size);
    addLog(`Prepared full season batch zip: ${batchOption.label}`, 'info', 'UI');
    const url = `/api/resolve?generatorUrl=${encodeURIComponent(batchOption.generatorUrl)}&qualityLabel=${encodeURIComponent(batchOption.label)}&isBatch=true`;
    setPendingExtractionUrl(url);
    setResolvedData(prev => prev ? { ...prev, streams: [] } : null);

    setTimeout(() => {
      document.getElementById('extract-action-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSelectEpisode = (episode: EpisodeOption) => {
    setSelectedEpisodeNumber(episode.episodeNumber);
    setIsBatchMode(false);
    addLog(`Prepared Episode ${episode.episodeNumber} (${episode.generatorUrl})...`, 'info', 'UI');
    const url = `/api/resolve?episodeUrl=${encodeURIComponent(episode.generatorUrl)}&episodeNumber=${episode.episodeNumber}`;
    setPendingExtractionUrl(url);
    setResolvedData(prev => prev ? { ...prev, streams: [] } : null);

    setTimeout(() => {
      document.getElementById('extract-action-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleExtract = () => {
    if (pendingExtractionUrl) {
      startStreamResolution(pendingExtractionUrl, true, fileSize);
      setPendingExtractionUrl(null);
    }
  };

  const handleSelectSeason = (season: string) => {
    setSelectedSeason(season);
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

  return {
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
  };
}
