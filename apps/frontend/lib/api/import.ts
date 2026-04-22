import { api } from './client';

export interface EntityType {
  value: string;
  label: string;
  requiredFields: string[];
  optionalFields: string[];
}

export interface PreviewRow {
  rowNumber: number;
  original: Record<string, any>;
  transformed: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export interface ImportPreview {
  fileName: string;
  entityType: string;
  totalRows: number;
  headers: string[];
  requiredFields: string[];
  optionalFields: string[];
  suggestedMapping: Record<string, string>;
  previewRows: PreviewRow[];
}

export interface ValidationResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  errors: { row: number; errors: string[] }[];
  canProceed: boolean;
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  failed: number;
  failedRows: { row: number; error: string }[];
}

export const importApi = {
  /**
   * Get available entity types for import
   */
  async getEntityTypes(): Promise<EntityType[]> {
    const response = await api.get<{ data: EntityType[] }>('/import/entity-types');
    return response.data.data;
  },

  /**
   * Download template for an entity type
   */
  getTemplateUrl(entityType: string): string {
    return `${api.defaults.baseURL}/import/templates/${entityType}`;
  },

  /**
   * Upload file and get preview with auto-mapped columns
   */
  async preview(file: File, entityType: string): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);

    const response = await api.post<{ data: ImportPreview }>('/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Validate all rows with custom column mapping
   */
  async validate(file: File, entityType: string, mapping: Record<string, string>): Promise<ValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('mapping', JSON.stringify(mapping));

    const response = await api.post<{ data: ValidationResult }>('/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Execute the import
   */
  async execute(
    file: File,
    entityType: string,
    mapping: Record<string, string>,
    skipInvalid: boolean = false
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('skipInvalid', String(skipInvalid));

    const response = await api.post<{ message: string; data: ImportResult }>('/import/execute', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },
};
