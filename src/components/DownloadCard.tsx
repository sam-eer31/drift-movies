'use client';

import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Play,
  HardDrive,
  Sparkles,
  Layers,
  Zap,
  RefreshCw,
  Film,
  Tv,
  CheckCircle2,
  Loader2,
  FolderArchive,
  ListOrdered,
  Package
} from 'lucide-react';
import { DirectStream, QualityOption, EpisodeOption, MovieSearchResult } from '@/types';

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
      {/* ================= HEADER STATUS BAR ================= */}
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

          {movie?.source && (
            <span className="source-pill">
              Source: {movie.source === 'Rog' ? 'RogMovies' : 'VegaMovies'}
            </span>
          )}
        </div>

        <div className="tunnel-badge">
          <Zap size={14} />
          <span>Cloudflare R2 S3 Tunnel</span>
        </div>
      </div>

      {/* ================= MOVIE / SERIES TOP DETAILS & ACTION BUTTONS ================= */}
      <div className="media-details-container">
        {/* Poster */}
        {movie?.poster && (
          <div className="poster-frame flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={movie.poster}
              alt={movie.title}
              className="poster-img"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Info & Action */}
        <div className="media-info-column">
          <h2 className="title-heading">
            {movie?.title || 'Media Download'}
          </h2>

          <div className="meta-chips-row">
            <span className="meta-pill meta-quality">
              {isResolvingQuality ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : isBatchMode ? (
                <FolderArchive size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>
                {isSeries
                  ? isBatchMode
                    ? `${activeSeason} • Full Season Batch Zip ${fileSize ? `[${fileSize}]` : ''}`
                    : `${activeSeason} • Episode ${selectedEpisodeNumber} (${displayQuality})`
                  : (displayQualityLabel || displayQuality)}
              </span>
            </span>

            {fileSize && (
              <span className="meta-pill meta-size">
                <HardDrive size={14} />
                <span>{fileSize}</span>
              </span>
            )}

            {fileName && (
              <span className="meta-pill meta-filename" title={fileName}>
                <Film size={13} />
                <span>{fileName}</span>
              </span>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="action-buttons-row">
            {isResolvingQuality ? (
              <div className="btn-extracting">
                <Loader2 size={18} className="animate-spin" />
                <span>Extracting Direct Stream...</span>
              </div>
            ) : hasPendingExtraction ? (
              <button
                type="button"
                onClick={onExtract}
                className="btn-primary main-action-btn"
              >
                <Zap size={18} />
                <span>Extract Direct Stream</span>
              </button>
            ) : primaryStream ? (
              <>
                <a
                  href={primaryStream.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="btn-primary main-action-btn"
                >
                  <Download size={18} />
                  <span>
                    {isSeries
                      ? isBatchMode
                        ? `Download Complete Season Zip ${fileSize ? `[${fileSize}]` : ''}`
                        : `Download Episode ${selectedEpisodeNumber}`
                      : 'Start Direct Download'}
                  </span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(primaryStream.url)}
                  className="btn-secondary"
                >
                  {copiedUrl === primaryStream.url ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  <span>{copiedUrl === primaryStream.url ? 'Link Copied!' : 'Copy Stream Link'}</span>
                </button>

                <a
                  href={primaryStream.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  title="Stream directly in browser"
                >
                  <Play size={15} />
                  <span>Stream Online</span>
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ================= WEB SERIES: CLEAN SEASON TABS ================= */}
      {isSeries && seasons.length > 0 && (
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
      )}

      {/* ================= WEB SERIES: SECTION A - EPISODE BY EPISODE DOWNLOADS ================= */}
      {isSeries && (
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
      )}

      {/* ================= WEB SERIES: SECTION B - FULL SEASON BATCH ZIP (ALL-IN-ONE) ================= */}
      {isSeries && batchPackages.length > 0 && (
        <div className="section-panel mb-6 border-accent-subtle bg-accent-subtle">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FolderArchive size={18} className="text-accent" />
              <h3 className="text-lg font-bold text-accent">
                Full Season Batch Zip Archive ({activeSeason})
              </h3>
            </div>
            <span className="text-sm text-accent opacity-80">
              Download all episodes together in a single zip package
            </span>
          </div>

          <div className="batch-grid">
            {batchPackages.map((q) => {
              const isSelected = isBatchMode && (selectedQualityId === q.id || selectedQualityId === q.generatorUrl);
              const isThisLoading = isResolvingQuality && isSelected;

              return (
                <button
                  key={q.generatorUrl}
                  type="button"
                  disabled={isResolvingQuality}
                  onClick={() => onSelectBatchPackage?.(q)}
                  className={`batch-card ${isSelected ? 'active' : ''} ${isResolvingQuality ? 'cursor-wait' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="batch-title">
                      <Package size={15} className="text-accent" />
                      {q.quality} Complete Pack
                    </span>

                    {q.size && (
                      <span className="batch-size">
                        {q.size}
                      </span>
                    )}
                  </div>

                  <div className="batch-status flex items-center justify-between mt-1">
                    <span>{isSelected ? '✓ Selected Batch' : 'Click to Load Batch'}</span>
                    {isThisLoading && <Loader2 size={12} className="animate-spin" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MOVIES: QUALITY PACKAGES GRID ================= */}
      {!isSeries && availableQualities.length > 0 && (
        <div className="section-panel mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
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
                  <div className="flex items-center justify-between mb-1.5">
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
      )}

      {/* ================= DIRECT MIRROR ENDPOINTS TABLE ================= */}
      <div className={`mirror-panel ${isResolvingQuality ? 'opacity-50' : 'opacity-100'}`}>
        <div className="flex items-center justify-between text-xs text-muted font-bold tracking-wide uppercase mb-3">
          <span>Direct Mirror Endpoints ({streams.length}):</span>
          {isResolvingQuality && (
            <span className="text-primary flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Updating mirrors...
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {streams.map((stream, idx) => {
            const isCopied = copiedUrl === stream.url;
            return (
              <div key={idx} className={`mirror-row ${stream.recommended ? 'recommended' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className={`indicator-dot ${stream.recommended ? 'primary' : 'secondary'}`} />
                  <div>
                    <div className="font-bold">{stream.name}</div>
                    <div className="text-xs text-muted">{stream.speed}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={stream.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className={`btn-download-sm ${isResolvingQuality ? 'pointer-events-none' : ''}`}
                  >
                    <Download size={14} />
                    Download
                  </a>

                  <button
                    type="button"
                    disabled={isResolvingQuality}
                    onClick={() => handleCopy(stream.url)}
                    className="btn-copy-sm"
                    title="Copy URL"
                  >
                    {isCopied ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-muted" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        /* Global scoped tweaks */
        .download-card-main {
          margin: 28px 0;
          padding: 24px;
        }

        @media (min-width: 640px) {
          .download-card-main {
            padding: 32px;
          }
        }

        .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
        .border-subtle { border-color: var(--border-subtle); }
        .pb-4 { padding-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .mb-8 { margin-bottom: 32px; }

        .opacity-50 { opacity: 0.5; }
        .opacity-60 { opacity: 0.6; }
        .opacity-80 { opacity: 0.8; }
        .opacity-100 { opacity: 1; }
        .pointer-events-none { pointer-events: none; }
        .cursor-wait { cursor: wait; }

        /* Card Header Bar */
        .card-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-bottom: 16px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .status-dot.ready {
          background-color: var(--success);
          box-shadow: 0 0 6px var(--success);
        }
        .status-dot.resolving {
          background-color: var(--primary);
          box-shadow: 0 0 6px var(--primary);
        }

        .status-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.02em;
        }

        .type-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          background-color: var(--bg-input);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }

        .source-pill {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          background-color: var(--bg-input);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }

        .tunnel-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* Media Details Container (Side-by-side & Responsive) */
        .media-details-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 28px;
        }

        @media (min-width: 640px) {
          .media-details-container {
            flex-direction: row;
            align-items: flex-start;
            gap: 24px;
          }
        }

        .poster-frame {
          width: 120px;
          height: 175px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-md);
          background-color: var(--bg-input);
          align-self: center;
        }

        @media (min-width: 640px) {
          .poster-frame {
            width: 140px;
            height: 205px;
            align-self: flex-start;
          }
        }

        .poster-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .media-info-column {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .title-heading {
          font-size: clamp(1.2rem, 2.5vw, 1.55rem);
          font-weight: 800;
          line-height: 1.28;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          word-break: break-word;
        }

        .meta-chips-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }

        .meta-quality {
          background-color: var(--bg-input);
          color: var(--text-primary);
          font-weight: 700;
          border-color: var(--border-subtle);
        }

        .meta-filename {
          font-family: var(--font-mono);
          font-size: 0.74rem;
          color: var(--text-muted);
          max-width: 320px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .action-buttons-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 4px;
        }

        .main-action-btn {
          padding: 11px 24px;
          font-size: 0.92rem;
          box-shadow: var(--shadow-md);
        }

        .btn-extracting {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: var(--bg-surface);
          border: 1px solid var(--primary);
          color: var(--primary);
          padding: 11px 24px;
          border-radius: var(--radius-full);
          font-weight: 700;
          font-size: 0.9rem;
        }

        /* Sections */
        .section-panel {
          background-color: var(--bg-surface);
          border-radius: var(--radius-lg);
          padding: 24px;
          border: 1px solid var(--border-subtle);
        }
        .section-label {
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .border-primary-subtle { border-color: rgba(255, 255, 255, 0.2); }
        .border-accent-subtle { border-color: rgba(234, 179, 8, 0.25); }
        .bg-accent-subtle { background-color: rgba(234, 179, 8, 0.05); }

        .season-tab {
          padding: 8px 20px;
          border-radius: var(--radius-full);
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: var(--bg-surface-hover);
          color: var(--text-secondary);
          border: 1px solid transparent;
        }
        .season-tab:hover {
          background-color: var(--bg-card);
          border-color: var(--border-subtle);
        }
        .season-tab.active {
          background-color: var(--primary);
          color: #FFF;
          border-color: var(--primary);
        }

        /* Episode List */
        .quality-pill {
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          background-color: var(--bg-surface-hover);
          color: var(--text-secondary);
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }
        .quality-pill:hover {
          border-color: var(--border-subtle);
        }
        .quality-pill.active {
          background-color: rgba(255, 255, 255, 0.15);
          color: var(--primary);
          border-color: var(--primary);
        }

        .episode-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 10px;
        }
        .episode-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px 10px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .episode-card:hover:not(.active) {
          border-color: var(--border-muted);
          background-color: var(--bg-surface-hover);
        }
        .episode-card.active {
          background-color: var(--bg-card);
          border: 2px solid var(--border-active);
        }
        .episode-number {
          font-size: 0.85rem;
          font-weight: 800;
          margin-bottom: 2px;
          color: var(--text-primary);
        }
        .episode-card.active .episode-number {
          color: var(--text-primary);
        }
        .episode-status {
          font-size: 0.68rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .episode-card.active .episode-status {
          color: var(--success);
          font-weight: 700;
        }

        /* Batch Grid */
        .batch-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }
        .batch-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .batch-card:hover:not(.active) {
          border-color: var(--border-muted);
          background-color: var(--bg-surface-hover);
        }
        .batch-card.active {
          background-color: var(--bg-card);
          border: 2px solid var(--border-active);
        }
        .batch-title {
          font-size: 0.95rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-primary);
        }
        .batch-card.active .batch-title {
          color: var(--text-primary);
        }
        .batch-size {
          font-size: 0.78rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          background-color: var(--bg-input);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }
        .batch-card.active .batch-size {
          background-color: var(--border-subtle);
          color: var(--text-primary);
        }
        .batch-status {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .batch-card.active .batch-status {
          color: var(--success);
          font-weight: 700;
        }

        /* Quality Packages Grid */
        .quality-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }
        .quality-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .quality-card:hover:not(.active) {
          border-color: var(--border-muted);
          background-color: var(--bg-surface-hover);
        }
        .quality-card.active {
          background-color: var(--bg-card);
          border: 2px solid var(--border-active);
          box-shadow: 0 0 0 1px var(--border-active);
        }
        .quality-title {
          font-size: 1rem;
          color: var(--text-primary);
        }
        .quality-size {
          font-size: 0.78rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          background-color: var(--bg-input);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }
        .quality-card.active .quality-size,
        .quality-size.active {
          background-color: var(--border-subtle);
          color: var(--text-primary);
        }
        .quality-format {
          font-size: 0.78rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 6px;
        }
        .quality-status {
          font-size: 0.75rem;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--border-subtle);
        }
        .status-active {
          color: var(--success);
          font-weight: 700;
        }

        /* Mirrors Panel */
        .mirror-panel {
          background-color: var(--bg-surface);
          border-radius: var(--radius-md);
          padding: 18px;
          border: 1px solid var(--border-subtle);
          transition: opacity 0.2s ease;
        }
        .mirror-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--bg-surface-hover);
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
        }
        .mirror-row.recommended {
          border-color: rgba(255, 255, 255, 0.3);
        }
        .indicator-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }
        .indicator-dot.primary { background-color: var(--primary); }
        .indicator-dot.secondary { background-color: var(--accent); }

        .btn-download-sm {
          color: var(--primary);
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 6px;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
        }
        .btn-download-sm:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .btn-copy-sm {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
        }
        .btn-copy-sm:hover .lucide {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};
