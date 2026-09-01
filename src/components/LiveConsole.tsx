'use client';

import React, { useRef, useEffect } from 'react';
import { Terminal, Copy, Check, Trash2 } from 'lucide-react';
import { PipelineLog } from '@/types';

interface LiveConsoleProps {
  logs: PipelineLog[];
  onClearLogs?: () => void;
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({ logs, onClearLogs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.stage}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="terminal-container">
      {/* Console Top Bar */}
      <div className="terminal-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="window-btn bg-error"></span>
            <span className="window-btn bg-warning"></span>
            <span className="window-btn bg-success"></span>
          </div>
          <span className="terminal-title flex items-center gap-2 text-muted font-mono">
            <Terminal size={14} className="text-primary" />
            pipeline_stream.log
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLogs}
            className="btn-ghost"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onClearLogs && (
            <button
              type="button"
              onClick={onClearLogs}
              className="btn-ghost"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Log Feed */}
      <div className="log-feed font-mono">
        {logs.length === 0 ? (
          <div className="text-muted italic py-2">
            $ Pipeline awaiting movie search query...
          </div>
        ) : (
          logs.map((log) => {
            let logTypeClass = 'text-secondary';
            let badgeClass = 'badge-default';

            if (log.type === 'success') {
              logTypeClass = 'text-success';
              badgeClass = 'badge-success';
            } else if (log.type === 'error') {
              logTypeClass = 'text-error';
              badgeClass = 'badge-error';
            } else if (log.type === 'warning') {
              logTypeClass = 'text-warning';
              badgeClass = 'badge-warning';
            }

            return (
              <div key={log.id} className="log-line">
                <div className="log-meta">
                  <span className="log-timestamp text-muted">
                    {log.timestamp}
                  </span>
                  <span className={`log-badge ${badgeClass}`}>
                    {log.stage}
                  </span>
                </div>
                <span className={`log-message ${logTypeClass}`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <style jsx>{`
        .terminal-container {
          background-color: var(--bg-terminal);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          margin: 24px 0;
        }

        .terminal-header {
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border-subtle);
          padding: 10px 16px;
        }

        .window-btn {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .bg-error { background-color: var(--error); }
        .bg-warning { background-color: var(--warning); }
        .bg-success { background-color: var(--success); }

        .terminal-title {
          font-size: 0.75rem;
        }

        .log-feed {
          padding: 16px;
          max-height: 260px;
          overflow-y: auto;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .py-2 { padding-top: 8px; padding-bottom: 8px; }
        .italic { font-style: italic; }

        .log-line {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 8px;
        }

        .log-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          width: 220px; /* Aligns all log messages into a neat column on desktop */
        }

        @media (max-width: 640px) {
          .log-line {
            flex-direction: column;
            gap: 4px;
            margin-bottom: 16px;
          }
          .log-meta {
            width: auto;
          }
          .log-message {
            padding-left: 10px;
            border-left: 2px solid var(--border-subtle);
            margin-top: 2px;
          }
        }

        .log-timestamp {
          font-size: 0.72rem;
          flex-shrink: 0;
        }

        .log-badge {
          font-size: 0.68rem;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .badge-default {
          background-color: var(--bg-surface-hover);
          color: var(--text-muted);
        }

        .badge-success {
          background-color: rgba(34, 197, 94, 0.15);
          color: var(--success);
        }

        .badge-error {
          background-color: rgba(239, 68, 68, 0.15);
          color: var(--error);
        }

        .badge-warning {
          background-color: rgba(245, 158, 11, 0.15);
          color: var(--warning);
        }

        .log-message {
          flex: 1;
          min-width: 0;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        
        .text-warning { color: var(--warning); }
      `}</style>
    </div>
  );
};
