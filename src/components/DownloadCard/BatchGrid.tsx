import React from 'react';
import { FolderArchive, Package, Loader2 } from 'lucide-react';
import { QualityOption } from '@/types';

interface BatchGridProps {
  activeSeason: string;
  batchPackages: QualityOption[];
  selectedQualityId?: string;
  isBatchMode: boolean;
  isResolvingQuality: boolean;
  onSelectBatchPackage?: (batchOption: QualityOption) => void;
}

export const BatchGrid: React.FC<BatchGridProps> = ({
  activeSeason,
  batchPackages,
  selectedQualityId,
  isBatchMode,
  isResolvingQuality,
  onSelectBatchPackage
}) => {
  if (batchPackages.length === 0) return null;

  return (
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
  );
};
