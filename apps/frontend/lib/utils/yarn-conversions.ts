/**
 * Yarn Count Conversion Utilities
 *
 * Mathematical relationships between yarn counting systems:
 * - Tex is the SI base unit (grams per 1000 meters)
 * - All conversions go through Tex as intermediate
 *
 * Formulas:
 * - Ne to Tex: Tex = 590.5 / Ne
 * - Nm to Tex: Tex = 1000 / Nm
 * - Denier to Tex: Tex = Denier / 9
 * - Dtex to Tex: Tex = Dtex / 10
 */

import {
  CountSystem as YarnCountSystem,
  WeightUnit,
  WEIGHT_UNITS,
  CurrencyCode,
  CURRENCIES,
} from '@/lib/types/yarn';

// ============================================
// YARN COUNT CONVERSIONS
// ============================================

/**
 * Convert any yarn count to Tex (base unit)
 */
export function toTex(value: number, fromSystem: YarnCountSystem): number {
  switch (fromSystem) {
    case 'TEX':
      return value;
    case 'NE':
      return 590.5 / value;
    case 'NM':
      return 1000 / value;
    case 'DENIER':
      return value / 9;
    default:
      throw new Error(`Unknown yarn count system: ${fromSystem}`);
  }
}

/**
 * Convert from Tex to any yarn count system
 */
export function fromTex(texValue: number, toSystem: YarnCountSystem): number {
  switch (toSystem) {
    case 'TEX':
      return texValue;
    case 'NE':
      return 590.5 / texValue;
    case 'NM':
      return 1000 / texValue;
    case 'DENIER':
      return texValue * 9;
    default:
      throw new Error(`Unknown yarn count system: ${toSystem}`);
  }
}

/**
 * Convert between any two yarn count systems
 */
export function convertYarnCount(
  value: number,
  fromSystem: YarnCountSystem,
  toSystem: YarnCountSystem
): number {
  if (fromSystem === toSystem) return value;
  const texValue = toTex(value, fromSystem);
  return fromTex(texValue, toSystem);
}

/**
 * Get all count equivalents for a given value
 */
export function getAllCountEquivalents(
  value: number,
  system: YarnCountSystem
): Record<YarnCountSystem, number> {
  const texValue = toTex(value, system);
  return {
    NE: roundToDecimals(fromTex(texValue, 'NE'), 2),
    NM: roundToDecimals(fromTex(texValue, 'NM'), 2),
    TEX: roundToDecimals(texValue, 2),
    DENIER: roundToDecimals(fromTex(texValue, 'DENIER'), 1),
  };
}

/**
 * Format yarn count with unit
 */
export function formatYarnCount(value: number, system: YarnCountSystem): string {
  const decimals = ['TEX', 'NE', 'NM'].includes(system) ? 1 : 0;
  const formatted = roundToDecimals(value, decimals);

  switch (system) {
    case 'NE':
      return `${formatted}s Ne`;
    case 'NM':
      return `Nm ${formatted}`;
    case 'TEX':
      return `${formatted} tex`;
    case 'DENIER':
      return `${formatted}D`;
    default:
      return `${formatted}`;
  }
}

// ============================================
// WEIGHT CONVERSIONS
// ============================================

/**
 * Convert weight to kilograms
 */
export function toKg(value: number, fromUnit: WeightUnit): number {
  return value * WEIGHT_UNITS[fromUnit].toKg;
}

/**
 * Convert from kilograms to target unit
 */
export function fromKg(kgValue: number, toUnit: WeightUnit): number {
  return kgValue / WEIGHT_UNITS[toUnit].toKg;
}

/**
 * Convert between weight units
 */
export function convertWeight(
  value: number,
  fromUnit: WeightUnit,
  toUnit: WeightUnit
): number {
  if (fromUnit === toUnit) return value;
  const kgValue = toKg(value, fromUnit);
  return fromKg(kgValue, toUnit);
}

/**
 * Format weight with unit symbol
 */
export function formatWeight(
  value: number,
  unit: WeightUnit,
  decimals: number = 2
): string {
  const formatted = roundToDecimals(value, decimals);
  return `${formatted.toLocaleString()} ${WEIGHT_UNITS[unit].symbol}`;
}

// ============================================
// CURRENCY FORMATTING
// ============================================

/**
 * Format currency value
 */
export function formatCurrency(
  value: number,
  currency: CurrencyCode,
  options?: { compact?: boolean }
): string {
  const currencyInfo = CURRENCIES[currency];

  if (options?.compact && value >= 1000) {
    if (value >= 1000000) {
      return `${currencyInfo.symbol}${(value / 1000000).toFixed(1)}M`;
    }
    return `${currencyInfo.symbol}${(value / 1000).toFixed(1)}K`;
  }

  return `${currencyInfo.symbol}${value.toLocaleString(currencyInfo.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format price per unit
 */
export function formatPricePerUnit(
  price: number,
  currency: CurrencyCode,
  unit: WeightUnit
): string {
  return `${formatCurrency(price, currency)}/${WEIGHT_UNITS[unit].symbol}`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Round to specific decimal places
 */
function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate blend composition string
 */
export function formatComposition(
  composition: Array<{ fiberType: string; percentage: number }>
): string {
  return composition
    .sort((a, b) => b.percentage - a.percentage)
    .map((c) => `${c.percentage}% ${c.fiberType}`)
    .join(' / ');
}

/**
 * Validate composition totals to 100%
 */
export function validateComposition(
  composition: Array<{ percentage: number }>
): boolean {
  const total = composition.reduce((sum, c) => sum + c.percentage, 0);
  return Math.abs(total - 100) < 0.01; // Allow small floating point errors
}

/**
 * Generate yarn type code suggestion
 */
export function suggestYarnCode(
  primaryFiber: string,
  countValue: number,
  countSystem: YarnCountSystem
): string {
  const fiberPrefix = primaryFiber.substring(0, 3).toUpperCase();
  const countSuffix = countSystem === 'NE' ? 'S' : countSystem.toLowerCase();
  return `${fiberPrefix}-${Math.round(countValue)}${countSuffix}`;
}
