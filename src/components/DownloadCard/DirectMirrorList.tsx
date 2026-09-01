import React from 'react';
import { Download, Copy, Check, Loader2 } from 'lucide-react';
import { DirectStream } from '@/types';

interface DirectMirrorListProps {
  streams: DirectStream[];
  isResolvingQuality: boolean;
  copiedUrl: string | null;
  handleCopy: (url: string) => void;
}

export const DirectMirrorList: React.FC<DirectMirrorListProps> = ({
  streams,
  isResolvingQuality,
  copiedUrl,
  handleCopy
}) => {
  return (
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
  );
};
