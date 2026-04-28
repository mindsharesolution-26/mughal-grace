'use client';

import { useState, useEffect } from 'react';
import { colorsApi } from '@/lib/api/settings';
import { Color } from '@/lib/types/settings';
import { Check, Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ColorSelectorProps {
  selectedColorId?: number;
  onColorSelect: (color: Color | null) => void;
  onAddNewColor?: () => void;
  label?: string;
  className?: string;
  allowClear?: boolean;
}

export function ColorSelector({
  selectedColorId,
  onColorSelect,
  onAddNewColor,
  label = 'Select Color',
  className = '',
  allowClear = true,
}: ColorSelectorProps) {
  const [colors, setColors] = useState<Color[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadColors = async () => {
      try {
        setIsLoading(true);
        const data = await colorsApi.getAll();
        setColors(data.filter(c => c.isActive));
        setError(null);
      } catch (err) {
        setError('Failed to load colors');
        console.error('Failed to load colors:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadColors();
  }, []);

  const filteredColors = colors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const selectedColor = colors.find((c) => c.id === selectedColorId);

  const handleColorClick = (color: Color) => {
    if (selectedColorId === color.id && allowClear) {
      onColorSelect(null);
    } else {
      onColorSelect(color);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="block text-sm font-medium text-neutral-300">{label}</label>
        <div className="flex items-center justify-center py-8 bg-factory-gray/30 rounded-xl border border-factory-border">
          <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
          <span className="ml-2 text-neutral-400">Loading colors...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="block text-sm font-medium text-neutral-300">{label}</label>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-300">{label}</label>
        {selectedColor && (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-factory-border"
              style={{ backgroundColor: selectedColor.hexCode || '#6B7280' }}
            />
            <span className="text-sm text-white">{selectedColor.name}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search colors..."
          className="w-full pl-10 pr-4 py-2 bg-factory-gray border border-factory-border rounded-xl text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Color Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
        {filteredColors.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => handleColorClick(color)}
            title={`${color.name} (${color.code})`}
            className={cn(
              'relative w-full aspect-square rounded-lg border-2 transition-all',
              'hover:scale-110 hover:z-10',
              selectedColorId === color.id
                ? 'border-primary-500 ring-2 ring-primary-500/50'
                : 'border-transparent hover:border-neutral-500'
            )}
            style={{ backgroundColor: color.hexCode || '#6B7280' }}
          >
            {selectedColorId === color.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}

        {/* Add New Color Button */}
        {onAddNewColor && (
          <button
            type="button"
            onClick={onAddNewColor}
            title="Add new color"
            className={cn(
              'w-full aspect-square rounded-lg border-2 border-dashed border-neutral-600',
              'flex items-center justify-center',
              'hover:border-primary-500 hover:bg-primary-500/10 transition-all',
              'text-neutral-400 hover:text-primary-400'
            )}
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {filteredColors.length === 0 && !search && (
        <p className="text-sm text-neutral-500 text-center py-4">
          No colors available. Add colors in Settings.
        </p>
      )}

      {filteredColors.length === 0 && search && (
        <p className="text-sm text-neutral-500 text-center py-4">
          No colors match &quot;{search}&quot;
        </p>
      )}
    </div>
  );
}

export default ColorSelector;
