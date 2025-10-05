import type { Zone, HabitatObject, Placement, HexCoord } from "@/lib/types"
import { validatePlacement } from "@/rules/validate"
import { hexToKey, hexDistance } from "@/lib/hex"
import { nanoid } from "nanoid"

interface PlacementCandidate {
  zone: Zone
  cells: HexCoord[]
  score: number
}

/**
 * Automatically place all objects using a greedy heuristic algorithm
 */
export function autoPlaceObjects(
  objects: HabitatObject[],
  zones: Zone[],
  existingPlacements: Placement[] = [],
): Placement[] {
  const placements: Placement[] = [...existingPlacements]
  const occupiedCells = new Set<string>()

  // Mark existing placements as occupied
  existingPlacements.forEach((p) => {
    p.cells.forEach((cell) => occupiedCells.add(hexToKey(cell)))
  })

  // Sort objects by priority (larger objects first, then by tags)
  const sortedObjects = [...objects].sort((a, b) => {
    // Priority order: sleep > galley > hygiene > eclss > exercise > medical > stowage
    const priority: Record<string, number> = {
      sleep: 7,
      food: 6,
      hygiene: 5,
      eclss: 4,
      exercise: 3,
      medical: 2,
      storage: 1,
    }

    const aPriority = Math.max(...a.tags.map((t) => priority[t] || 0))
    const bPriority = Math.max(...b.tags.map((t) => priority[t] || 0))

    if (aPriority !== bPriority) return bPriority - aPriority

    // Then by size (larger first)
    return b.slots - a.slots
  })

  // Place each object
  for (const object of sortedObjects) {
    const placement = findBestPlacement(object, zones, placements, objects, occupiedCells)

    if (placement) {
      placements.push(placement)
      placement.cells.forEach((cell) => occupiedCells.add(hexToKey(cell)))

      // Update zone used slots
      const zone = zones.find((z) => z.id === placement.zoneId)
      if (zone) {
        zone.usedSlots += object.slots
      }
    } else {
      console.warn(`Could not place object: ${object.name}`)
    }
  }

  return placements
}

/**
 * Find the best placement for an object
 */
function findBestPlacement(
  object: HabitatObject,
  zones: Zone[],
  existingPlacements: Placement[],
  allObjects: HabitatObject[],
  occupiedCells: Set<string>,
): Placement | null {
  const candidates: PlacementCandidate[] = []

  // Find compatible zones
  const compatibleZones = zones.filter((zone) => {
    // Check if zone allows all object tags
    const hasCompatibleTags = object.tags.every((tag) => zone.allowedTags.includes(tag))

    // Check if zone has capacity
    const hasCapacity = zone.usedSlots + object.slots <= zone.capacitySlots

    return hasCompatibleTags && hasCapacity
  })

  // Try to find valid placements in each compatible zone
  for (const zone of compatibleZones) {
    const availableCells = zone.cells.filter((cell) => !occupiedCells.has(hexToKey(cell)))

    // Try different starting positions
    for (const startCell of availableCells) {
      const cellGroup = findContiguousCells(startCell, object.slots, availableCells, occupiedCells)

      if (cellGroup.length === object.slots) {
        // Score this placement
        const score = scorePlacement(object, zone, cellGroup, zones, existingPlacements, allObjects)

        candidates.push({
          zone,
          cells: cellGroup,
          score,
        })
      }
    }
  }

  // Sort candidates by score (higher is better)
  candidates.sort((a, b) => b.score - a.score)

  // Return best valid placement
  for (const candidate of candidates) {
    const validation = validatePlacement(object, candidate.zone, candidate.cells, zones, existingPlacements, allObjects)

    // Accept if no hard failures
    const hasHardFailure = validation.results.some((r) => r.severity === "hard" && !r.ok)

    if (!hasHardFailure) {
      return {
        id: nanoid(),
        objectId: object.id,
        zoneId: candidate.zone.id,
        cells: candidate.cells,
      }
    }
  }

  return null
}

/**
 * Find contiguous cells starting from a seed cell
 */
function findContiguousCells(
  startCell: HexCoord,
  count: number,
  availableCells: HexCoord[],
  occupiedCells: Set<string>,
): HexCoord[] {
  const result: HexCoord[] = [startCell]
  const visited = new Set<string>([hexToKey(startCell)])

  const queue: HexCoord[] = [startCell]

  while (queue.length > 0 && result.length < count) {
    const current = queue.shift()!

    // Get neighbors
    const neighbors = [
      { q: current.q + 1, r: current.r },
      { q: current.q + 1, r: current.r - 1 },
      { q: current.q, r: current.r - 1 },
      { q: current.q - 1, r: current.r },
      { q: current.q - 1, r: current.r + 1 },
      { q: current.q, r: current.r + 1 },
    ]

    for (const neighbor of neighbors) {
      const key = hexToKey(neighbor)

      if (!visited.has(key) && !occupiedCells.has(key)) {
        // Check if neighbor is in available cells
        const isAvailable = availableCells.some((cell) => cell.q === neighbor.q && cell.r === neighbor.r)

        if (isAvailable) {
          result.push(neighbor)
          visited.add(key)
          queue.push(neighbor)

          if (result.length >= count) break
        }
      }
    }
  }

  return result
}

/**
 * Score a placement candidate (higher is better)
 */
function scorePlacement(
  object: HabitatObject,
  zone: Zone,
  cells: HexCoord[],
  allZones: Zone[],
  existingPlacements: Placement[],
  allObjects: HabitatObject[],
): number {
  let score = 0

  // Prefer core ring for critical systems
  if (object.tags.includes("eclss") && zone.ring === "core") {
    score += 50
  }

  // Prefer mid ring for living spaces
  if ((object.tags.includes("sleep") || object.tags.includes("hygiene")) && zone.ring === "mid") {
    score += 40
  }

  // Prefer outer ring for noisy equipment
  if (object.tags.includes("noisy") && zone.ring === "outer") {
    score += 40
  }

  // Bonus for proximity to related functions
  if (object.tags.includes("food")) {
    // Galley near stowage
    const storagePlacements = existingPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("storage")
    })

    if (storagePlacements.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY

      storagePlacements.forEach((p) => {
        p.cells.forEach((storageCell) => {
          cells.forEach((cell) => {
            minDistance = Math.min(minDistance, hexDistance(cell, storageCell))
          })
        })
      })

      if (minDistance <= 3) {
        score += 30
      }
    }
  }

  // Penalty for being far from center (prefer compact layouts)
  const avgDistanceFromCenter = cells.reduce((sum, cell) => sum + hexDistance(cell, { q: 0, r: 0 }), 0) / cells.length

  score -= avgDistanceFromCenter * 2

  // Bonus for using zone efficiently (filling gaps)
  const zoneUtilization = (zone.usedSlots + object.slots) / zone.capacitySlots
  score += zoneUtilization * 20

  return score
}
