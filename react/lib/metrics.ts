import type { Zone, Placement, HabitatObject, HabitatInputs } from "@/lib/types"

export interface HabitatMetrics {
  // Basic stats
  totalCells: number
  usedCells: number
  freeCells: number
  utilizationPercent: number

  // Zone breakdown
  zoneStats: {
    zoneId: string
    zoneName: string
    capacity: number
    used: number
    free: number
    utilizationPercent: number
  }[]

  // Object stats
  totalObjects: number
  placedObjects: number
  unplacedObjects: number
  placementPercent: number

  // Volume estimates (assuming 2m cell diameter, 2.5m height)
  totalVolumeM3: number
  usedVolumeM3: number
  volumePerCrew: number

  // Mass estimates (rough)
  estimatedMassKg: number

  // Functional coverage
  functionalCoverage: {
    function: string
    required: boolean
    present: boolean
  }[]
}

const CELL_DIAMETER_M = 2.0
const CELL_HEIGHT_M = 2.5
const CELL_VOLUME_M3 = (3 * Math.sqrt(3) * CELL_DIAMETER_M * CELL_DIAMETER_M * CELL_HEIGHT_M) / 8 // Hexagonal prism volume

const MASS_PER_CELL_KG = 500 // Rough estimate for structure + equipment

export function calculateMetrics(
  inputs: HabitatInputs,
  zones: Zone[],
  placements: Placement[],
  objects: HabitatObject[],
): HabitatMetrics {
  // Calculate total cells
  const totalCells = zones.reduce((sum, zone) => sum + zone.cells.length, 0)

  // Each hexagon has 6 sectors, so we count unique hexagons from sectors
  const usedSectors = placements.reduce((sum, placement) => sum + placement.sectors.length, 0)
  const uniqueHexagons = new Set(placements.flatMap((p) => p.sectors.map((s) => `${s.hex.q},${s.hex.r}`)))
  const usedCells = uniqueHexagons.size

  const freeCells = totalCells - usedCells
  const utilizationPercent = totalCells > 0 ? (usedCells / totalCells) * 100 : 0

  // Zone breakdown
  const zoneStats = zones.map((zone) => {
    const zonePlacements = placements.filter((p) => p.zoneId === zone.id)
    const zoneHexagons = new Set(zonePlacements.flatMap((p) => p.sectors.map((s) => `${s.hex.q},${s.hex.r}`)))
    const used = zoneHexagons.size
    const capacity = zone.cells.length
    const free = capacity - used
    const utilizationPercent = capacity > 0 ? (used / capacity) * 100 : 0

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      capacity,
      used,
      free,
      utilizationPercent,
    }
  })

  // Object stats
  const totalObjects = objects.length
  const placedObjectIds = new Set(placements.map((p) => p.objectId))
  const placedObjects = placedObjectIds.size
  const unplacedObjects = totalObjects - placedObjects
  const placementPercent = totalObjects > 0 ? (placedObjects / totalObjects) * 100 : 0

  // Volume estimates
  const totalVolumeM3 = totalCells * CELL_VOLUME_M3
  const usedVolumeM3 = usedCells * CELL_VOLUME_M3
  const volumePerCrew = inputs.crew > 0 ? totalVolumeM3 / inputs.crew : 0

  // Mass estimates
  const estimatedMassKg = totalCells * MASS_PER_CELL_KG

  // Functional coverage
  const requiredFunctions = ["sleep", "galley", "hygiene", "eclss"]
  const presentFunctions = new Set(
    placements.flatMap((p) => {
      const obj = objects.find((o) => o.id === p.objectId)
      return obj?.tags || []
    }),
  )

  const functionalCoverage = [
    ...requiredFunctions.map((func) => ({
      function: func,
      required: true,
      present: presentFunctions.has(func),
    })),
    ...Array.from(presentFunctions)
      .filter((func) => !requiredFunctions.includes(func))
      .map((func) => ({
        function: func,
        required: false,
        present: true,
      })),
  ]

  return {
    totalCells,
    usedCells,
    freeCells,
    utilizationPercent,
    zoneStats,
    totalObjects,
    placedObjects,
    unplacedObjects,
    placementPercent,
    totalVolumeM3,
    usedVolumeM3,
    volumePerCrew,
    estimatedMassKg,
    functionalCoverage,
  }
}
