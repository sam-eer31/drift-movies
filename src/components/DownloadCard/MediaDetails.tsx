import React from 'react';
import {
  Download,
  Copy,
  Check,
  Play,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Loader2,
  FolderArchive,
  Zap
} from 'lucide-react';
import { DirectStream } from '@/types';

interface MediaDetailsProps {
  title?: string;
  poster?: string;
  isSeries: boolean;
  isBatchMode: boolean;
  activeSeason: string;
  selectedEpisodeNumber: number;
  displayQuality: string;
  displayQualityLabel?: string;
  fileSize?: string;
  isResolvingQuality: boolean;
  hasPendingExtraction: boolean;
  onExtract?: () => void;
  primaryStream?: DirectStream;
  handleCopy: (url: string) => void;
  copiedUrl: string | null;
}

export const MediaDetails: React.FC<MediaDetailsProps> = ({
  title,
  poster,
  isSeries,
  isBatchMode,
  activeSeason,
  selectedEpisodeNumber,
  displayQuality,
  displayQualityLabel,
  fileSize,
  isResolvingQuality,
  hasPendingExtraction,
  onExtract,
  primaryStream,
  handleCopy,
  copiedUrl
}) => {
  return (
    <div className="media-details-container">
      {/* Poster */}
      {poster && (
        <div className="poster-frame flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt={title || 'Poster'}
            className="poster-img"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Info & Action */}
      <div className="media-info-column">
        <h2 className="title-heading">
          {title || 'Media Download'}
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
        </div>

        {/* Primary Action Buttons */}
        <div id="extract-action-row" className="action-buttons-row" style={{ scrollMarginTop: '100px' }}>
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
  );
};
