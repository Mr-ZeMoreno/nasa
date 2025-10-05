import type { Zone, HabitatObject, Placement, ValidationResult, RuleResult } from "@/lib/types"
import { hexDistance, hexToKey } from "@/lib/hex"

/**
 * Validate a placement against all rules
 */
export function validatePlacement(
  object: HabitatObject,
  zone: Zone,
  cells: typeof object extends { slots: number } ? any[] : never,
  allZones: Zone[],
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): ValidationResult {
  const results: RuleResult[] = []

  // Run all validation rules
  results.push(validateCapacity(object, zone))
  results.push(validateTags(object, zone))
  results.push(...validateNoiseSeparation(object, cells, allZones, allPlacements, allObjects))
  results.push(...validateFunctionalAdjacency(object, zone, cells, allZones, allPlacements, allObjects))
  results.push(validateProhibitedZone(object, zone))
  results.push(validateAccessibility(cells, allZones, allPlacements))

  const ok = results.every((r) => r.ok || r.severity === "soft")

  return { ok, results: results.filter((r) => !r.ok) }
}

/**
 * Rule: Capacity check (hard)
 * Zone must have enough free slots for the object
 */
function validateCapacity(object: HabitatObject, zone: Zone): RuleResult {
  const availableSlots = zone.capacitySlots - zone.usedSlots
  const ok = object.slots <= availableSlots

  return {
    rule: "capacity",
    ok,
    severity: "hard",
    message: ok
      ? "Capacity OK"
      : `Insufficient capacity: needs ${object.slots} slots, only ${availableSlots} available`,
    hint: ok ? undefined : "Try a different zone or increase habitat radius",
  }
}

/**
 * Rule: Tag compatibility (hard)
 * All object tags must be in zone's allowed tags
 */
function validateTags(object: HabitatObject, zone: Zone): RuleResult {
  const incompatibleTags = object.tags.filter((tag) => !zone.allowedTags.includes(tag))
  const ok = incompatibleTags.length === 0

  return {
    rule: "tags",
    ok,
    severity: "hard",
    message: ok ? "Tags compatible" : `Incompatible tags: ${incompatibleTags.join(", ")}`,
    hint: ok ? undefined : `This object requires a zone that allows: ${incompatibleTags.join(", ")}`,
  }
}

/**
 * Rule: Noise separation (soft)
 * Noisy objects should be at least 2 cells away from sleep areas
 */
function validateNoiseSeparation(
  object: HabitatObject,
  cells: any[],
  allZones: Zone[],
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): RuleResult[] {
  const results: RuleResult[] = []

  // If this is a noisy object, check distance to sleep zones
  if (object.tags.includes("noisy")) {
    const sleepZones = allZones.filter((z) => z.allowedTags.includes("sleep"))

    sleepZones.forEach((sleepZone) => {
      const sleepPlacements = allPlacements.filter((p) => p.zoneId === sleepZone.id)

      sleepPlacements.forEach((sleepPlacement) => {
        sleepPlacement.cells.forEach((sleepCell) => {
          cells.forEach((cell) => {
            const distance = hexDistance(cell, sleepCell)
            const ok = distance >= 2

            if (!ok) {
              results.push({
                rule: "noise-separation",
                ok: false,
                severity: "soft",
                message: `Noisy object too close to sleep area (${distance} cells)`,
                hint: "Move to at least 2-3 cells away from sleep quarters",
              })
            }
          })
        })
      })
    })
  }

  // If this is a sleep object, check distance to noisy zones
  if (object.tags.includes("sleep")) {
    const noisyPlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("noisy")
    })

    noisyPlacements.forEach((noisyPlacement) => {
      noisyPlacement.cells.forEach((noisyCell) => {
        cells.forEach((cell) => {
          const distance = hexDistance(cell, noisyCell)
          const ok = distance >= 2

          if (!ok) {
            results.push({
              rule: "noise-separation",
              ok: false,
              severity: "soft",
              message: `Sleep area too close to noisy equipment (${distance} cells)`,
              hint: "Move to at least 2-3 cells away from exercise/noisy areas",
            })
          }
        })
      })
    })
  }

  return results.length > 0 ? results : [{ rule: "noise-separation", ok: true, severity: "soft", message: "OK" }]
}

/**
 * Rule: Functional adjacency (soft)
 * Galley should be within 3 cells of stowage
 */
function validateFunctionalAdjacency(
  object: HabitatObject,
  zone: Zone,
  cells: any[],
  allZones: Zone[],
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): RuleResult[] {
  const results: RuleResult[] = []

  // If this is galley, check proximity to stowage
  if (object.tags.includes("food")) {
    const storagePlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("storage")
    })

    if (storagePlacements.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY

      storagePlacements.forEach((storagePlacement) => {
        storagePlacement.cells.forEach((storageCell) => {
          cells.forEach((cell) => {
            const distance = hexDistance(cell, storageCell)
            minDistance = Math.min(minDistance, distance)
          })
        })
      })

      const ok = minDistance <= 3

      if (!ok) {
        results.push({
          rule: "functional-adjacency",
          ok: false,
          severity: "soft",
          message: `Galley too far from storage (${minDistance} cells)`,
          hint: "Place galley within 3 cells of stowage for efficiency",
        })
      }
    }
  }

  return results.length > 0 ? results : [{ rule: "functional-adjacency", ok: true, severity: "soft", message: "OK" }]
}

/**
 * Rule: Prohibited zone (hard)
 * Noisy objects cannot be in core ring
 */
function validateProhibitedZone(object: HabitatObject, zone: Zone): RuleResult {
  const isNoisy = object.tags.includes("noisy")
  const isCore = zone.ring === "core"
  const ok = !(isNoisy && isCore)

  return {
    rule: "prohibited-zone",
    ok,
    severity: "hard",
    message: ok ? "Zone OK" : "Noisy objects not allowed in core ring",
    hint: ok ? undefined : "Move to mid or outer ring",
  }
}

/**
 * Rule: Accessibility (soft)
 * Objects should not be completely surrounded (need at least one free neighbor)
 */
function validateAccessibility(cells: any[], allZones: Zone[], allPlacements: Placement[]): RuleResult {
  // Build occupancy map
  const occupiedCells = new Set<string>()
  allPlacements.forEach((p) => {
    p.cells.forEach((cell) => {
      occupiedCells.add(hexToKey(cell))
    })
  })

  // Check if at least one cell has a free neighbor
  let hasFreeNeighbor = false

  for (const cell of cells) {
    const neighbors = [
      { q: cell.q + 1, r: cell.r },
      { q: cell.q + 1, r: cell.r - 1 },
      { q: cell.q, r: cell.r - 1 },
      { q: cell.q - 1, r: cell.r },
      { q: cell.q - 1, r: cell.r + 1 },
      { q: cell.q, r: cell.r + 1 },
    ]

    for (const neighbor of neighbors) {
      if (!occupiedCells.has(hexToKey(neighbor))) {
        hasFreeNeighbor = true
        break
      }
    }

    if (hasFreeNeighbor) break
  }

  return {
    rule: "accessibility",
    ok: hasFreeNeighbor,
    severity: "soft",
    message: hasFreeNeighbor ? "Accessible" : "Object is completely surrounded",
    hint: hasFreeNeighbor ? undefined : "Ensure at least one adjacent cell is free for access",
  }
}

/**
 * Validate entire habitat layout
 */
export function validateLayout(zones: Zone[], placements: Placement[], objects: HabitatObject[]): ValidationResult {
  const allResults: RuleResult[] = []

  placements.forEach((placement) => {
    const object = objects.find((o) => o.id === placement.objectId)
    const zone = zones.find((z) => z.id === placement.zoneId)

    if (object && zone) {
      const result = validatePlacement(object, zone, placement.cells, zones, placements, objects)
      allResults.push(...result.results)
    }
  })

  const ok = allResults.every((r) => r.ok || r.severity === "soft")

  return { ok, results: allResults }
}
