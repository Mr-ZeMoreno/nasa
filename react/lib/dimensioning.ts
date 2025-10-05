import type { HabitatInputs } from "./types"

/**
 * Calculate habitat radius based on inputs
 * Formula: R = f(crew, duration, functions)
 */
export function calculateRadius(inputs: HabitatInputs): number {
  const { crew, durationDays, functions } = inputs

  // Base slots calculation
  // A = slots per crew member
  // B = slots per function
  // C = duration factor (per 30 days)
  const A = 8 // Each crew member needs ~8 slots (sleep, personal, etc.)
  const B = 12 // Each function needs ~12 slots
  const C = 2 // Additional slots per month

  const totalSlots = A * crew + B * functions.length + C * (durationDays / 30)

  // Hexagon with radius R has approximately 3*R^2 + 3*R + 1 cells
  // Solve for R: 3R^2 + 3R + 1 = totalSlots
  // Using quadratic formula: R = (-3 + sqrt(9 + 12*(totalSlots-1))) / 6
  const R = Math.ceil((-3 + Math.sqrt(9 + 12 * (totalSlots - 1))) / 6)

  // Minimum radius of 3, maximum of 12 for demo
  return Math.max(3, Math.min(12, R))
}

/**
 * Calculate capacity for each zone type based on radius
 */
export function calculateZoneCapacities(radius: number): Record<string, number> {
  const totalCells = 3 * radius * radius + 3 * radius + 1

  // Distribute capacity based on ring sizes
  const coreRadius = Math.floor(radius * 0.25)
  const midRadius = Math.floor(radius * 0.65)

  const coreCells = 3 * coreRadius * coreRadius + 3 * coreRadius + 1
  const midCells = 3 * midRadius * midRadius + 3 * midRadius + 1 - coreCells
  const outerCells = totalCells - coreCells - midCells

  return {
    core: coreCells,
    mid: midCells,
    outer: outerCells,
    total: totalCells,
  }
}
