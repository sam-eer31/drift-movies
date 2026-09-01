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
      <div className="flex items-center justify-between mb-8 px-1">
        <div className="flex items-center gap-2">
          <span className="status-indicator"></span>
          <span className="pipeline-header-title">Live Extraction Pipeline</span>
        </div>

      </div>

      {/* Steps Track */}
      <div className="pipeline-track">
        {STEP_DEFINITIONS.map((def, index) => {
          const stepData = steps[def.id] || { status: 'idle', label: def.fallbackLabel };
          const Icon = def.icon;
          const isRunning = stepData.status === 'running';
          const isDone = stepData.status === 'completed';
          const isIdle = !isRunning && !isDone;

          return (
            <div 
              key={def.id} 
              className={`step-container ${isRunning ? 'is-running' : ''} ${isDone ? 'is-done' : ''} ${isIdle ? 'is-idle' : ''}`}
            >
              {/* Connector to next step */}
              {index < STEP_DEFINITIONS.length - 1 && (
                <div className="step-connector">
                  {isDone && <div className="connector-fill" />}
                </div>
              )}
              
              <div className="step-bubble-wrapper">
                <div className="step-bubble">
                  {isDone ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                </div>
                {isRunning && (
                  <div className="step-pulse"></div>
                )}
              </div>

              <div className="step-content">
                <div className="step-label flex items-center gap-2">
                  <span>{stepData.label || def.fallbackLabel}</span>
                  {isRunning && (
                    <Loader2 size={14} className="animate-spin text-primary" />
                  )}
                </div>
                <div className="step-desc">
                  {def.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .my-8 { margin-top: 32px; margin-bottom: 32px; }
        .px-1 { padding-left: 4px; padding-right: 4px; }
        .mb-8 { margin-bottom: 32px; }
        
        .pipeline-container {
          background-color: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-md);
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--success);
          box-shadow: 0 0 8px var(--success);
          display: inline-block;
        }

        .pipeline-header-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .pipeline-header-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .pipeline-track {
          display: flex;
          flex-direction: column;
          gap: 32px;
          position: relative;
          padding: 10px 0;
        }

        .step-container {
          display: flex;
          flex-direction: row;
          position: relative;
          align-items: flex-start;
          gap: 20px;
        }

        .step-connector {
          position: absolute;
          left: 19px; /* 38px bubble / 2 */
          top: 38px;
          height: calc(100% - 6px); /* 100% of container height minus bubble height plus gap (32px) = 100% - 38px + 32px = 100% - 6px */
          width: 2px;
          background-color: var(--border-muted);
          z-index: 0;
        }

        .connector-fill {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--success);
          animation: fillLine 0.5s ease-out forwards;
        }

        @keyframes fillLine {
          from { height: 0; }
          to { height: 100%; }
        }

        .step-bubble-wrapper {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
        }

        .step-bubble {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: var(--bg-surface);
          border: 2px solid var(--border-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
        }

        .step-container.is-running .step-bubble {
          border-color: var(--primary);
          color: var(--primary);
          background-color: var(--bg-surface-hover);
        }

        .step-container.is-done .step-bubble {
          background-color: var(--success);
          border-color: var(--success);
          color: #fff;
        }

        .step-pulse {
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          border: 2px solid var(--primary);
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          opacity: 0.5;
          z-index: 1;
        }

        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .step-content {
          display: flex;
          flex-direction: column;
          padding-top: 2px; /* adjust for vertical centering with bubble */
        }

        .step-label {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .step-container.is-idle .step-label {
          color: var(--text-muted);
        }

        .step-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        
        .step-container.is-idle .step-desc {
          opacity: 0.7;
        }

        /* Desktop Layout */
        @media (min-width: 768px) {
          .pipeline-track {
            flex-direction: row;
            justify-content: space-between;
            gap: 0;
          }

          .step-container {
            flex-direction: column;
            align-items: center;
            text-align: center;
            flex: 1;
            gap: 16px;
          }

          .step-connector {
            left: 50%;
            right: -50%;
            top: 19px; /* center of 38px bubble */
            height: 2px;
            width: auto;
          }

          .connector-fill {
            width: 100%;
            height: 100%;
            animation: fillLineHorizontal 0.5s ease-out forwards;
          }

          @keyframes fillLineHorizontal {
            from { width: 0; }
            to { width: 100%; }
          }

          .step-content {
            padding-top: 0;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};
