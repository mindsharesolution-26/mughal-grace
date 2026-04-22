'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import {
  importApi,
  EntityType,
  ImportPreview,
  ValidationResult,
  ImportResult,
} from '@/lib/api/import';
import {
  Upload,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  AlertCircle,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

type Step = 'select' | 'upload' | 'mapping' | 'validate' | 'import' | 'complete';

export default function DataImportPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<Step>('select');
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load entity types on mount
  useEffect(() => {
    loadEntityTypes();
  }, []);

  const loadEntityTypes = async () => {
    try {
      const types = await importApi.getEntityTypes();
      setEntityTypes(types);
    } catch (error) {
      showToast('error', 'Failed to load entity types');
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedEntityType) {
      showToast('error', 'Please select an entity type first');
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const previewData = await importApi.preview(selectedFile, selectedEntityType);
      setPreview(previewData);
      setColumnMapping(previewData.suggestedMapping);
      setStep('mapping');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to parse file');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEntityType, showToast]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // Handle validation
  const handleValidate = async () => {
    if (!file || !preview) return;

    setIsLoading(true);
    try {
      const result = await importApi.validate(file, selectedEntityType, columnMapping);
      setValidation(result);
      setStep('validate');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!file || !preview) return;

    setIsLoading(true);
    try {
      const result = await importApi.execute(file, selectedEntityType, columnMapping, skipInvalid);
      setImportResult(result);
      setStep('complete');
      showToast('success', `Successfully imported ${result.imported} records`);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset everything
  const handleReset = () => {
    setStep('select');
    setSelectedEntityType('');
    setFile(null);
    setPreview(null);
    setColumnMapping({});
    setValidation(null);
    setImportResult(null);
    setSkipInvalid(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    if (!selectedEntityType) return;
    window.open(importApi.getTemplateUrl(selectedEntityType), '_blank');
  };

  // Get selected entity type config
  const selectedConfig = entityTypes.find(t => t.value === selectedEntityType);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Data Import</h1>
        <p className="text-neutral-400 mt-1">
          Import data from Excel or CSV files into the system
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { key: 'select', label: 'Select Type' },
            { key: 'upload', label: 'Upload File' },
            { key: 'mapping', label: 'Map Columns' },
            { key: 'validate', label: 'Validate' },
            { key: 'complete', label: 'Complete' },
          ].map((s, index) => {
            const stepOrder = ['select', 'upload', 'mapping', 'validate', 'complete'];
            const currentIndex = stepOrder.indexOf(step === 'import' ? 'validate' : step);
            const stepIndex = stepOrder.indexOf(s.key);
            const isActive = step === s.key || (step === 'import' && s.key === 'validate');
            const isCompleted = stepIndex < currentIndex;

            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isCompleted
                        ? 'bg-success text-white'
                        : isActive
                        ? 'bg-primary-500 text-white'
                        : 'bg-factory-gray text-neutral-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                    {s.label}
                  </span>
                </div>
                {index < 4 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-success' : 'bg-factory-border'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        {/* Step 1: Select Entity Type */}
        {step === 'select' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Select Data Type to Import</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {entityTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedEntityType(type.value);
                      setStep('upload');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedEntityType === type.value
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-factory-border hover:border-primary-500/50 bg-factory-gray'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <FileSpreadsheet className="w-5 h-5 text-primary-400" />
                      <span className="font-medium text-white">{type.label}</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Required: {type.requiredFields.join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload File */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Upload {selectedConfig?.label} File</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Supported formats: Excel (.xlsx, .xls) or CSV
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-factory-border rounded-xl p-12 text-center hover:border-primary-500/50 transition-colors"
            >
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-primary-400 animate-spin mb-4" />
                  <p className="text-white">Processing file...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-white mb-2">Drag and drop your file here</p>
                  <p className="text-neutral-400 text-sm mb-4">or</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) handleFileSelect(selectedFile);
                    }}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Select File
                  </Button>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('select')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Column Mapping */}
        {step === 'mapping' && preview && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Map Columns</h2>
              <p className="text-sm text-neutral-400 mt-1">
                {preview.fileName} - {preview.totalRows} rows found
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...preview.requiredFields, ...preview.optionalFields].map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm text-neutral-300">
                      {field}
                      {preview.requiredFields.includes(field) && (
                        <span className="text-error ml-1">*</span>
                      )}
                    </label>
                  </div>
                  <div className="w-1/2">
                    <select
                      value={columnMapping[field] || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- Select Column --</option>
                      {preview.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Table */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Data Preview (First 5 rows)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-factory-border">
                      <th className="px-3 py-2 text-left text-neutral-400">Row</th>
                      <th className="px-3 py-2 text-left text-neutral-400">Status</th>
                      {Object.keys(columnMapping).filter(k => columnMapping[k]).map((field) => (
                        <th key={field} className="px-3 py-2 text-left text-neutral-400">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.previewRows.map((row) => (
                      <tr key={row.rowNumber} className="border-b border-factory-border">
                        <td className="px-3 py-2 text-neutral-400">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error" />
                          )}
                        </td>
                        {Object.keys(columnMapping).filter(k => columnMapping[k]).map((field) => (
                          <td key={field} className="px-3 py-2 text-white">
                            {row.transformed[field] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleValidate} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                Validate Data
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Validation Results */}
        {step === 'validate' && validation && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Validation Results</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-factory-gray rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{validation.totalRows}</p>
                <p className="text-sm text-neutral-400">Total Rows</p>
              </div>
              <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-success">{validation.validCount}</p>
                <p className="text-sm text-neutral-400">Valid</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${
                validation.invalidCount > 0
                  ? 'bg-error/10 border border-error/30'
                  : 'bg-factory-gray'
              }`}>
                <p className={`text-2xl font-bold ${validation.invalidCount > 0 ? 'text-error' : 'text-white'}`}>
                  {validation.invalidCount}
                </p>
                <p className="text-sm text-neutral-400">Invalid</p>
              </div>
            </div>

            {validation.invalidCount > 0 && (
              <>
                <div className="bg-error/10 border border-error/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">
                        {validation.invalidCount} rows have validation errors
                      </p>
                      <p className="text-sm text-neutral-400 mt-1">
                        You can skip invalid rows or go back to fix your data.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-factory-dark">
                      <tr className="border-b border-factory-border">
                        <th className="px-3 py-2 text-left text-neutral-400">Row</th>
                        <th className="px-3 py-2 text-left text-neutral-400">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.errors.map((err) => (
                        <tr key={err.row} className="border-b border-factory-border">
                          <td className="px-3 py-2 text-neutral-300">{err.row}</td>
                          <td className="px-3 py-2 text-error text-xs">
                            {err.errors.join('; ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="w-4 h-4 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-white">Skip invalid rows and import only valid data</span>
                </label>
              </>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('mapping')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Mapping
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading || (validation.invalidCount > 0 && !skipInvalid)}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Import {skipInvalid ? validation.validCount : validation.totalRows} Records
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && importResult && (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white">Import Complete!</h2>
              <p className="text-neutral-400 mt-2">
                Your data has been successfully imported into the system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="bg-factory-gray rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{importResult.totalRows}</p>
                <p className="text-xs text-neutral-400">Total Rows</p>
              </div>
              <div className="bg-success/10 border border-success/30 rounded-xl p-4">
                <p className="text-2xl font-bold text-success">{importResult.imported}</p>
                <p className="text-xs text-neutral-400">Imported</p>
              </div>
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
                <p className="text-2xl font-bold text-warning">{importResult.skipped}</p>
                <p className="text-xs text-neutral-400">Skipped</p>
              </div>
              <div className={`rounded-xl p-4 ${
                importResult.failed > 0 ? 'bg-error/10 border border-error/30' : 'bg-factory-gray'
              }`}>
                <p className={`text-2xl font-bold ${importResult.failed > 0 ? 'text-error' : 'text-white'}`}>
                  {importResult.failed}
                </p>
                <p className="text-xs text-neutral-400">Failed</p>
              </div>
            </div>

            {importResult.failedRows.length > 0 && (
              <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-left max-w-2xl mx-auto">
                <p className="text-white font-medium mb-2">Failed Rows:</p>
                <div className="max-h-40 overflow-y-auto text-sm">
                  {importResult.failedRows.map((r) => (
                    <p key={r.row} className="text-error">
                      Row {r.row}: {r.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button variant="secondary" onClick={handleReset}>
                Import More Data
              </Button>
              <Button onClick={() => window.history.back()}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
