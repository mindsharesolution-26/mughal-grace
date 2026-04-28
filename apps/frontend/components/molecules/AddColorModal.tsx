'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { colorsApi } from '@/lib/api/settings';
import { Color, ColorFormData } from '@/lib/types/settings';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AddColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorCreated: (color: Color) => void;
}

export function AddColorModal({ isOpen, onClose, onColorCreated }: AddColorModalProps) {
  const [formData, setFormData] = useState<ColorFormData>({
    name: '',
    hexCode: '#6B7280',
    pantoneCode: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Color name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const newColor = await colorsApi.create(formData);
      onColorCreated(newColor);
      onClose();
      // Reset form
      setFormData({
        name: '',
        hexCode: '#6B7280',
        pantoneCode: '',
        description: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create color');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-factory-dark border border-factory-border rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-factory-border">
          <h2 className="text-lg font-semibold text-white">Add New Color</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Color Preview */}
          <div className="flex items-center gap-4 p-4 bg-factory-gray/50 rounded-xl">
            <div
              className="w-16 h-16 rounded-xl border-2 border-factory-border shadow-inner"
              style={{ backgroundColor: formData.hexCode || '#6B7280' }}
            />
            <div>
              <p className="text-white font-medium">{formData.name || 'Color Name'}</p>
              <p className="text-neutral-400 text-sm font-mono">{formData.hexCode}</p>
            </div>
          </div>

          {/* Color Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Color Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Navy Blue, Forest Green"
              className={cn(
                'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white',
                'placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                'border-factory-border'
              )}
            />
          </div>

          {/* Hex Code with Color Picker */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Color (Hex Code)
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={formData.hexCode || '#6B7280'}
                onChange={(e) => setFormData({ ...formData, hexCode: e.target.value })}
                className="w-14 h-10 rounded-lg border border-factory-border cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={formData.hexCode || ''}
                onChange={(e) => setFormData({ ...formData, hexCode: e.target.value })}
                placeholder="#000000"
                className={cn(
                  'flex-1 px-4 py-2.5 bg-factory-gray border rounded-xl text-white font-mono',
                  'placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'border-factory-border uppercase'
                )}
              />
            </div>
          </div>

          {/* Pantone Code (Optional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Pantone Code <span className="text-neutral-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.pantoneCode || ''}
              onChange={(e) => setFormData({ ...formData, pantoneCode: e.target.value })}
              placeholder="e.g., 19-4052 TCX"
              className={cn(
                'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white',
                'placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                'border-factory-border'
              )}
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Description <span className="text-neutral-500">(Optional)</span>
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional notes about this color..."
              rows={2}
              className={cn(
                'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white resize-none',
                'placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                'border-factory-border'
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-factory-border">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create Color
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddColorModal;
