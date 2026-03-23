import { useAuth } from '@/contexts/AuthContext'

export type UnitSystem = 'imperial' | 'metric'

/** Hook — returns the org's unit system, defaulting to 'imperial'. */
export function useUnitSystem(): UnitSystem {
  const { org } = useAuth()
  return (org?.unit_system ?? 'imperial') as UnitSystem
}

/** kg → lbs (rounded to nearest 0.5) */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.2046 * 2) / 2
}

/** lbs → kg (rounded to 1 decimal) */
export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.2046) * 10) / 10
}

/** Label to show next to weight inputs/columns */
export function weightLabel(unit: UnitSystem): string {
  return unit === 'imperial' ? 'lbs' : 'kg'
}

/**
 * Check-ins store weight in kg. Convert to display value for the given unit.
 * Returns null if input is null.
 */
export function displayWeightKg(weight_kg: number | null, unit: UnitSystem): number | null {
  if (weight_kg == null) return null
  return unit === 'imperial' ? kgToLbs(weight_kg) : weight_kg
}

/**
 * When the user enters a weight value in their preferred unit,
 * convert it to kg for storage in check_ins.weight_kg.
 */
export function enteredWeightToKg(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? lbsToKg(value) : value
}
