'use client';

import { FabricEntry } from '@/lib/types/dyeing';
import { Check, Trash2, Palette, Layers, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface FabricEntryCardProps {
  entry: FabricEntry;
  isSelected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
  compact?: boolean;
}

export function FabricEntryCard({
  entry,
  isSelected = false,
  onClick,
  onRemove,
  showRemove = true,
  compact = false,
}: FabricEntryCardProps) {
  const totalWeight = entry.rolls.reduce((sum, r) => sum + Number(r.greyWeight), 0);

  return (
    <div
      className={cn(
        'relative p-3 rounded-xl border transition-all',
        isSelected
          ? 'bg-primary-500/10 border-primary-500'
          : 'bg-factory-gray/50 border-factory-border hover:border-neutral-600',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      {/* Remove button */}
      {showRemove && onRemove && !isSelected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Content */}
      <div className={cn('space-y-2', showRemove && 'pr-8')}>
        {/* Fabric Info */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary-400" />
          <span className="font-medium text-white">{entry.fabricName || entry.fabricCode}</span>
          {entry.fabricCode && entry.fabricName && (
            <span className="text-neutral-500 text-sm">({entry.fabricCode})</span>
          )}
        </div>

        {/* Color */}
        {entry.colorName && (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-factory-border"
              style={{ backgroundColor: entry.hexCode || '#6B7280' }}
            />
            <span className="text-sm text-neutral-300">{entry.colorName}</span>
            {entry.colorCode && (
              <span className="text-neutral-500 text-xs">({entry.colorCode})</span>
            )}
          </div>
        )}

        {!entry.colorName && (
          <div className="flex items-center gap-2 text-neutral-500">
            <Palette className="w-4 h-4" />
            <span className="text-sm italic">No color selected</span>
          </div>
        )}

        {/* Stats */}
        {!compact && (
          <div className="flex items-center gap-4 pt-1 text-sm">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <ScrollText className="w-3.5 h-3.5" />
              <span>{entry.rolls.length} roll{entry.rolls.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-primary-400 font-medium">
              {totalWeight.toFixed(2)} kg
            </div>
          </div>
        )}

        {/* Compact stats */}
        {compact && (
          <div className="text-xs text-neutral-400">
            {entry.rolls.length} roll{entry.rolls.length !== 1 ? 's' : ''} | {totalWeight.toFixed(2)} kg
          </div>
        )}

        {/* Notes */}
        {entry.notes && !compact && (
          <p className="text-xs text-neutral-500 italic truncate">{entry.notes}</p>
        )}
      </div>
    </div>
  );
}

export default FabricEntryCard;
