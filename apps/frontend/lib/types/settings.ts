// Department types
export interface Department {
  id: number;
  code: string;  // Auto-generated
  name: string;
  description: string | null;
  parentId: number | null;
  // Personnel Information
  managerName: string | null;
  contactPerson: string | null;
  employeeCount: number | null;
  // Keep for future User linkage
  managerId: number | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
  parent?: { id: number; code: string; name: string } | null;
  children?: { id: number; code: string; name: string }[];
}

export interface DepartmentFormData {
  // code is auto-generated, not in form
  name: string;  // REQUIRED
  description?: string;
  parentId?: number | null;
  // Personnel Information
  managerName?: string | null;
  contactPerson?: string | null;
  employeeCount?: number | null;
  // Keep for future User linkage
  managerId?: number | null;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Product Group types
export interface ProductGroup {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
  parent?: { id: number; code: string; name: string } | null;
  children?: { id: number; code: string; name: string }[];
}

export interface ProductGroupFormData {
  code: string;
  name: string;
  description?: string;
  parentId?: number | null;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Brand types
export interface Brand {
  id: number;
  code: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  // Contact Information
  phone: string | null;
  email: string | null;
  fax: string | null;
  contactPerson: string | null;
  // Address Fields
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  // Business Registration
  taxId: string | null;
  registrationNumber: string | null;
  // Other
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandFormData {
  code?: string;  // Optional - auto-generated
  name: string;   // REQUIRED
  description?: string;
  logoUrl?: string | null;
  website?: string | null;
  // Contact Information
  phone?: string | null;
  email?: string | null;
  fax?: string | null;
  contactPerson?: string | null;
  // Address Fields
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string;
  // Business Registration
  taxId?: string | null;
  registrationNumber?: string | null;
  // Other
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Unit types
export type UnitCategory =
  | 'LENGTH'
  | 'MASS'
  | 'VOLUME'
  | 'AREA'
  | 'COUNT'
  | 'TIME'
  | 'TEMPERATURE'
  | 'OTHER';

export interface Unit {
  id: number;
  code: string;
  name: string;
  symbol: string;
  category: UnitCategory;
  description: string | null;
  baseUnit: string | null;
  conversionFactor: string | null;
  siUnit: boolean;
  isoCode: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnitFormData {
  code: string;
  name: string;
  symbol: string;
  category: UnitCategory;
  description?: string;
  baseUnit?: string | null;
  conversionFactor?: number | null;
  siUnit?: boolean;
  isoCode?: string | null;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Unit category options for dropdowns
export const unitCategoryOptions: { value: UnitCategory; label: string }[] = [
  { value: 'LENGTH', label: 'Length' },
  { value: 'MASS', label: 'Mass / Weight' },
  { value: 'VOLUME', label: 'Volume' },
  { value: 'AREA', label: 'Area' },
  { value: 'COUNT', label: 'Count / Quantity' },
  { value: 'TIME', label: 'Time' },
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'OTHER', label: 'Other' },
];

// Country options for brands
export const countryOptions = [
  'Pakistan',
  'China',
  'India',
  'Bangladesh',
  'Turkey',
  'Italy',
  'Germany',
  'USA',
  'UK',
  'Japan',
  'South Korea',
  'Taiwan',
  'Vietnam',
  'Indonesia',
  'Other',
];

// ==================== GROUP TYPES ====================

export interface Group {
  id: number;
  code: string;           // Auto-generated: GRP-001, GRP-002, etc.
  name: string;
  departmentId: number;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
  department?: { id: number; code: string; name: string } | null;
}

export interface GroupFormData {
  name: string;            // REQUIRED
  departmentId: number;    // REQUIRED
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ==================== MATERIAL (YARN SPECIFICATION / RAW MATERIAL) TYPES ====================
// Material = Yarn Spec used in knitting factories
// Examples: "70/24/1 RW", "150/48/2 FD", "75/36/1 SD"
// Format: Count/Filaments/Ply + Type (RW=Raw White, FD=Full Dull, SD=Semi Dull, BR=Bright)

export interface Material {
  id: number;
  code: string;             // Auto-generated: MAT-001, MAT-002
  name: string;             // Yarn spec: "70/24/1 RW", "150/48/2 FD"
  grade: string | null;     // Quality grade: AAA, AA, A, B, C
  gradeNumber: string | null;  // Internal grade code/number
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialFormData {
  name: string;             // REQUIRED - Yarn spec name
  grade?: string | null;    // Quality grade
  gradeNumber?: string | null;  // Internal grade code
  description?: string | null;
  notes?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

// Common yarn grades for dropdowns
export const yarnGradeOptions = [
  { value: 'AAA', label: 'AAA - Premium' },
  { value: 'AA', label: 'AA - High Quality' },
  { value: 'A', label: 'A - Standard' },
  { value: 'B', label: 'B - Economy' },
  { value: 'C', label: 'C - Basic' },
];

// Common yarn types (suffix in spec name)
export const yarnTypeOptions = [
  { value: 'RW', label: 'RW - Raw White' },
  { value: 'FD', label: 'FD - Full Dull' },
  { value: 'SD', label: 'SD - Semi Dull' },
  { value: 'BR', label: 'BR - Bright' },
  { value: 'BRT', label: 'BRT - Bright Trilobal' },
];

// ==================== FABRIC TYPES ====================

// Nested relation types for Fabric
export interface FabricRelation {
  id: number;
  code: string;
  name: string;
}

export interface FabricColorRelation extends FabricRelation {
  hexCode: string | null;
}

export interface Fabric {
  id: number;
  code: string; // Auto-generated: FAB000001
  name: string;
  qrPayload: string | null; // Format: FABRIC|FAB000001
  qrGeneratedAt: string | null;
  // Required relations
  departmentId: number;
  department?: FabricRelation;
  groupId: number;
  group?: FabricRelation;
  // Optional relations
  materialId: number | null;
  material?: FabricRelation | null;
  brandId: number | null;
  brand?: FabricRelation | null;
  colorId: number | null;
  color?: FabricColorRelation | null;
  machineId: number | null;
  machine?: { id: number; machineNumber: string; name: string | null; gauge: number | null; diameter: number | null } | null;
  gradeId: number | null;
  grade?: FabricRelation | null;
  // Fabric Type & Composition (master data relations)
  fabricTypeId: number | null;
  fabricType?: FabricRelation | null;
  fabricCompositionId: number | null;
  fabricComposition?: FabricRelation | null;
  // Fabric properties (legacy string fields - DEPRECATED)
  type: string | null;
  composition: string | null;
  gsm: number | null;
  width: number | null;
  widthUnit: string | null; // 'inch' | 'cm'
  isTube: boolean;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FabricFormData {
  name: string;
  // Required relations
  departmentId: number;
  groupId: number;
  // Optional relations
  materialId?: number | null;
  brandId?: number | null;
  colorId?: number | null;
  machineId?: number | null;
  gradeId?: number | null;
  // Fabric Type & Composition (master data relations)
  fabricTypeId?: number | null;
  fabricCompositionId?: number | null;
  // Fabric properties (legacy - prefer using fabricTypeId and fabricCompositionId)
  type?: string;
  composition?: string;
  gsm?: number | null;
  width?: number | null;
  widthUnit?: 'inch' | 'cm' | null;
  isTube?: boolean;
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface FabricLookupResponse {
  data: Fabric;
  status: 'active' | 'inactive';
  message: string;
}

// Fabric type options
export const fabricTypeOptions = [
  'Single Jersey',
  'Double Jersey',
  'Rib',
  'Interlock',
  'Pique',
  'Fleece',
  'Terry',
  'Velour',
  'Jacquard',
  'Other',
];

// Common fabric composition options
export const fabricCompositionOptions = [
  '100% Cotton',
  '100% Polyester',
  '50/50 Cotton/Polyester',
  '60/40 Cotton/Polyester',
  '80/20 Cotton/Polyester',
  '95/5 Cotton/Spandex',
  '100% Viscose',
  'Cotton/Viscose Blend',
  'Other',
];

// Width unit options
export const widthUnitOptions = [
  { value: 'inch', label: 'Inches' },
  { value: 'cm', label: 'Centimeters' },
];

// ==================== COLOR TYPES ====================

export interface Color {
  id: number;
  code: string;
  name: string;
  hexCode: string | null;
  pantoneCode: string | null;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColorFormData {
  code?: string;  // Optional - auto-generated if not provided
  name: string;   // REQUIRED - only required field
  hexCode?: string | null;
  pantoneCode?: string | null;
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ==================== GRADE TYPES ====================

export interface Grade {
  id: number;
  code: string;
  name: string;
  level: number;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GradeFormData {
  code: string;
  name: string;
  level?: number;
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ==================== KNITTING MACHINE SIZE TYPES ====================

export interface KnittingMachineSize {
  id: number;
  code: string;
  name: string;
  gauge: number | null;
  diameter: number | null;
  needleCount: number | null;
  machineType: string | null;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnittingMachineSizeFormData {
  code: string;
  name: string;
  gauge?: number | null;
  diameter?: number | null;
  needleCount?: number | null;
  machineType?: string;
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Machine type options for knitting machine sizes
export const knittingMachineTypeOptions = [
  'Circular Knitting',
  'Flat Knitting',
  'Warp Knitting',
  'Jacquard',
  'Other',
];

// ==================== FABRIC SIZE TYPES ====================

export type WidthUnit = 'INCHES' | 'MM';

export interface FabricSize {
  id: number;
  code: string;           // Auto-generated: FS-001, FS-002, etc.
  widthValue: string;     // Decimal as string
  unit: WidthUnit;
  displayName: string;    // Auto-generated: "36 Inches", "900 mm"
  formId: number | null;  // Reference to FabricForm (Open/Tube)
  form: { id: number; code: string; name: string } | null;  // Included relation
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FabricSizeFormData {
  widthValue: number;     // REQUIRED
  unit: WidthUnit;        // REQUIRED
  formId?: number | null; // Optional - reference to FabricForm (Open/Tube)
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Width unit options for fabric sizes
export const fabricWidthUnitOptions: { value: WidthUnit; label: string }[] = [
  { value: 'INCHES', label: 'Inches' },
  { value: 'MM', label: 'Millimeters (mm)' },
];

// ==================== FABRIC FORM TYPES ====================

export interface FabricForm {
  id: number;
  code: string;           // Auto-generated: FF-001, FF-002, etc.
  name: string;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FabricFormFormData {
  name: string;           // REQUIRED
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ==================== FABRIC TYPE TYPES ====================

export interface FabricType {
  id: number;
  code: string;           // Auto-generated: FT-001, FT-002, etc.
  name: string;           // e.g., "Single Jersey", "Double Jersey"
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FabricTypeFormData {
  name: string;           // REQUIRED
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ==================== FABRIC COMPOSITION TYPES ====================

export interface FabricCompositionType {
  id: number;
  code: string;           // Auto-generated: FC-001, FC-002, etc.
  name: string;           // e.g., "100% Cotton", "50/50 Cotton/Polyester"
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FabricCompositionFormData {
  name: string;           // REQUIRED
  description?: string;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
}
