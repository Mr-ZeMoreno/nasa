import { hexagonOfRadius, getRingType, hexToKey } from "./hex"
import type { Zone, HexCoord } from "./types"

/**
 * Generate hexagonal grid and assign cells to zones
 */
export function generateGrid(radius: number, zones: Zone[]): Zone[] {
  // Generate all hex cells
  const allCells = hexagonOfRadius(radius)

  // Group cells by ring type
  const cellsByRing: Record<string, HexCoord[]> = {
    core: [],
    mid: [],
    outer: [],
  }

  allCells.forEach((cell) => {
    const ring = getRingType(cell, radius)
    cellsByRing[ring].push(cell)
  })

  // Distribute cells to zones based on their ring preference
  const updatedZones = zones.map((zone) => {
    const availableCells = cellsByRing[zone.ring]
    const slotsNeeded =
      zone.capacitySlots || Math.floor(availableCells.length / zones.filter((z) => z.ring === zone.ring).length)

    // Take cells from the available pool
    const zoneCells = availableCells.splice(0, slotsNeeded)

    return {
      ...zone,
      cells: zoneCells,
      capacitySlots: zoneCells.length,
    }
  })

  return updatedZones
}

/**
 * Find which zone a hex cell belongs to
 */
export function findZoneForCell(cell: HexCoord, zones: Zone[]): Zone | undefined {
  const cellKey = hexToKey(cell)
  return zones.find((zone) => zone.cells.some((zoneCell) => hexToKey(zoneCell) === cellKey))
}
