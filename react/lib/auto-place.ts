import type { Zone, HabitatObject, Placement, SectorCoord } from "@/lib/types"
import { validatePlacement } from "@/rules/validate"
import { sectorToKey, hexDistance, getHexagonSectors } from "@/lib/hex"
import { nanoid } from "nanoid"

interface PlacementCandidate {
  zone: Zone
  sectors: SectorCoord[]
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
  const occupiedSectors = new Set<string>()

  existingPlacements.forEach((p) => {
    p.sectors.forEach((sector) => occupiedSectors.add(sectorToKey(sector)))
  })

  // Sort objects by priority (larger objects first, then by tags)
  const sortedObjects = [...objects].sort((a, b) => {
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

    return b.slots - a.slots
  })

  for (const object of sortedObjects) {
    const placement = findBestPlacement(object, zones, placements, objects, occupiedSectors)

    if (placement) {
      placements.push(placement)
      placement.sectors.forEach((sector) => occupiedSectors.add(sectorToKey(sector)))

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
  occupiedSectors: Set<string>,
): Placement | null {
  const candidates: PlacementCandidate[] = []

  // Find compatible zones
  const compatibleZones = zones.filter((zone) => {
    const hasCompatibleTags = object.tags.every((tag) => zone.allowedTags.includes(tag))
    const hasCapacity = zone.usedSlots + object.slots <= zone.capacitySlots
    return hasCompatibleTags && hasCapacity
  })

  for (const zone of compatibleZones) {
    // Get all sectors in this zone
    const allSectorsInZone: SectorCoord[] = []
    zone.cells.forEach((cell) => {
      allSectorsInZone.push(...getHexagonSectors(cell))
    })

    const availableSectors = allSectorsInZone.filter((sector) => !occupiedSectors.has(sectorToKey(sector)))

    // Try different starting positions
    for (const startSector of availableSectors) {
      const sectorGroup = findContiguousSectors(startSector, object.slots, zone.cells, occupiedSectors)

      if (sectorGroup.length === object.slots) {
        const score = scorePlacement(object, zone, sectorGroup, zones, existingPlacements, allObjects)

        candidates.push({
          zone,
          sectors: sectorGroup,
          score,
        })
      }
    }
  }

  // Sort candidates by score (higher is better)
  candidates.sort((a, b) => b.score - a.score)

  for (const candidate of candidates) {
    const validation = validatePlacement(
      object,
      candidate.zone,
      candidate.sectors,
      zones,
      existingPlacements,
      allObjects,
    )

    const hasHardFailure = validation.results.some((r) => r.severity === "hard" && !r.ok)

    if (!hasHardFailure) {
      return {
        id: nanoid(),
        objectId: object.id,
        zoneId: candidate.zone.id,
        sectors: candidate.sectors,
      }
    }
  }

  return null
}

/**
 * Find contiguous sectors starting from a seed sector
 */
function findContiguousSectors(
  startSector: SectorCoord,
  count: number,
  availableCells: any[],
  occupiedSectors: Set<string>,
): SectorCoord[] {
  const result: SectorCoord[] = [startSector]
  const visited = new Set<string>([sectorToKey(startSector)])
  const queue: SectorCoord[] = [startSector]

  while (queue.length > 0 && result.length < count) {
    const current = queue.shift()!

    // Get adjacent sectors
    const adjacentSectors = getAdjacentSectors(current, availableCells)

    for (const neighbor of adjacentSectors) {
      const key = sectorToKey(neighbor)

      if (!visited.has(key) && !occupiedSectors.has(key)) {
        result.push(neighbor)
        visited.add(key)
        queue.push(neighbor)

        if (result.length >= count) break
      }
    }
  }

  return result
}

/**
 * Get adjacent sectors (within same hex and neighboring hexes)
 */
function getAdjacentSectors(sector: SectorCoord, availableCells: any[]): SectorCoord[] {
  const adjacent: SectorCoord[] = []

  // Adjacent sectors in same hexagon
  const prevSector = (sector.sector + 5) % 6
  const nextSector = (sector.sector + 1) % 6
  adjacent.push({ hex: sector.hex, sector: prevSector })
  adjacent.push({ hex: sector.hex, sector: nextSector })

  // Adjacent sectors in neighboring hexagons
  const neighbors = [
    { q: sector.hex.q + 1, r: sector.hex.r },
    { q: sector.hex.q + 1, r: sector.hex.r - 1 },
    { q: sector.hex.q, r: sector.hex.r - 1 },
    { q: sector.hex.q - 1, r: sector.hex.r },
    { q: sector.hex.q - 1, r: sector.hex.r + 1 },
    { q: sector.hex.q, r: sector.hex.r + 1 },
  ]

  neighbors.forEach((neighborHex) => {
    const isAvailable = availableCells.some((cell: any) => cell.q === neighborHex.q && cell.r === neighborHex.r)
    if (isAvailable) {
      const oppositeSector = (sector.sector + 3) % 6
      adjacent.push({ hex: neighborHex, sector: oppositeSector })
    }
  })

  return adjacent
}

/**
 * Score a placement candidate (higher is better)
 */
function scorePlacement(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
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

  if (object.tags.includes("food")) {
    const storagePlacements = existingPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("storage")
    })

    if (storagePlacements.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY

      storagePlacements.forEach((p) => {
        p.sectors.forEach((storageSector) => {
          sectors.forEach((sector) => {
            minDistance = Math.min(minDistance, hexDistance(sector.hex, storageSector.hex))
          })
        })
      })

      if (minDistance <= 3) {
        score += 30
      }
    }
  }

  const avgDistanceFromCenter =
    sectors.reduce((sum, sector) => sum + hexDistance(sector.hex, { q: 0, r: 0 }), 0) / sectors.length

  score -= avgDistanceFromCenter * 2

  // Bonus for using zone efficiently (filling gaps)
  const zoneUtilization = (zone.usedSlots + object.slots) / zone.capacitySlots
  score += zoneUtilization * 20

  return score
}
