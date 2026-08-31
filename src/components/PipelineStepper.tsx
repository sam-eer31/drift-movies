'use client';

import React from 'react';
import { Globe, Search, Layers, Unlock, Check, Loader2 } from 'lucide-react';
import { PipelineStep } from '@/types';

interface PipelineStepperProps {
  steps: Record<string, PipelineStep>;
  currentStage?: string;
}

const STEP_DEFINITIONS = [
  { id: 'gateway', num: '01', title: 'Gateway', fallbackLabel: 'Mirrors Resolved', icon: Globe, desc: 'Pinging Vega & Rog mirrors' },
  { id: 'search', num: '02', title: 'Catalog Search', fallbackLabel: 'Catalog Matched', icon: Search, desc: 'Querying parallel indexes' },
  { id: 'quality', num: '03', title: 'Media Packages', fallbackLabel: 'Packages Loaded', icon: Layers, desc: 'Detecting resolutions & seasons' },
  { id: 'stream', num: '04', title: 'Stream Tunnel', fallbackLabel: 'Direct Stream Ready', icon: Unlock, desc: 'Signed Cloudflare R2 tunnel' },
];

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ steps }) => {
  return (
    <div className="pipeline-container my-8">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="status-indicator"></span>
          <span className="pipeline-header-title">Live Extraction Pipeline</span>
        </div>
        <span className="pipeline-header-subtitle">Zero-Ad Direct Stream</span>
      </div>

      {/* Steps Track */}
      <div className="pipeline-track">
        {STEP_DEFINITIONS.map((def) => {
          const stepData = steps[def.id] || { status: 'idle', label: def.fallbackLabel };
          const Icon = def.icon;
          const isRunning = stepData.status === 'running';
          const isDone = stepData.status === 'completed';
          const isIdle = !isRunning && !isDone;

          return (
            <div 
              key={def.id} 
              className={`pipeline-step ${isRunning ? 'is-running' : ''} ${isDone ? 'is-done' : ''} ${isIdle ? 'is-idle' : ''}`}
            >
              {/* Top status bar */}
              <div className="flex items-center justify-between mb-3">
                <div className={`step-icon-badge ${isRunning ? 'text-primary' : isDone ? 'text-primary' : 'text-muted'}`}>
                  <Icon size={15} />
                </div>
                
                <div>
                  {isRunning && (
                    <span className="state-badge state-running">
                      <Loader2 size={11} className="animate-spin" />
                      <span>Active</span>
                    </span>
                  )}
                  {isDone && (
                    <span className="state-badge state-done">
                      <Check size={11} strokeWidth={3} />
                      <span>Done</span>
                    </span>
                  )}
                  {isIdle && (
                    <span className="state-idle">{def.num}</span>
                  )}
                </div>
              </div>

              {/* Step content */}
              <div>
                <div className="step-label">
                  {stepData.label || def.fallbackLabel}
                </div>
                <div className="step-desc">
                  {def.desc}
                </div>
              </div>

              {isRunning && <div className="step-progress-line" />}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .my-8 { margin-top: 32px; margin-bottom: 32px; }
        .px-1 { padding-left: 4px; padding-right: 4px; }
        
        .pipeline-container {
          background-color: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-md);
        }

        .status-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: var(--success);
          box-shadow: 0 0 6px var(--success);
          display: inline-block;
        }

        .pipeline-header-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .pipeline-header-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .pipeline-track {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .pipeline-step {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-md);
          padding: 16px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .pipeline-step.is-done {
          border-color: var(--border-subtle);
          background-color: var(--bg-surface);
        }

        .pipeline-step.is-running {
          background-color: var(--bg-surface-hover);
          border-color: var(--border-active);
          box-shadow: 0 0 0 1px var(--border-active);
        }

        .pipeline-step.is-idle {
          opacity: 0.6;
        }

        .step-icon-badge {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background-color: var(--bg-input);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .state-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          letter-spacing: 0.02em;
        }

        .state-done {
          color: var(--success);
          background-color: rgba(53, 208, 127, 0.1);
          border: 1px solid rgba(53, 208, 127, 0.25);
        }

        .state-running {
          color: var(--text-primary);
          background-color: rgba(241, 241, 240, 0.1);
          border: 1px solid rgba(241, 241, 240, 0.25);
        }

        .state-idle {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .step-label {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .step-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .step-progress-line {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--primary), transparent);
          animation: sweep 1.5s infinite;
        }

        @keyframes sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
