import type { HexCoord, PixelCoord, SectorCoord } from "./types"

// Hexagon math utilities using axial coordinates (q, r)
// Reference: https://www.redblobgames.com/grids/hexagons/

export const HEX_SIZE = 1.0 // Base size for calculations
export const HEX_SPACING = 1.732 // sqrt(3) for flat-top hexagons

/**
 * Convert axial coordinates to pixel coordinates (flat-top orientation)
 */
export function axialToPixel(hex: HexCoord, size: number = HEX_SIZE): PixelCoord {
  const x = size * ((3 / 2) * hex.q)
  const y = size * ((Math.sqrt(3) / 2) * hex.q + Math.sqrt(3) * hex.r)
  return { x, y }
}

/**
 * Convert pixel coordinates to axial coordinates (flat-top orientation)
 */
export function pixelToAxial(pixel: PixelCoord, size: number = HEX_SIZE): HexCoord {
  const q = ((2 / 3) * pixel.x) / size
  const r = ((-1 / 3) * pixel.x + (Math.sqrt(3) / 3) * pixel.y) / size
  return hexRound({ q, r })
}

/**
 * Round fractional hex coordinates to nearest hex
 */
export function hexRound(hex: HexCoord): HexCoord {
  let q = Math.round(hex.q)
  let r = Math.round(hex.r)
  const s = Math.round(-hex.q - hex.r)

  const qDiff = Math.abs(q - hex.q)
  const rDiff = Math.abs(r - hex.r)
  const sDiff = Math.abs(s - (-hex.q - hex.r))

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s
  } else if (rDiff > sDiff) {
    r = -q - s
  }

  return { q, r }
}

/**
 * Calculate distance between two hexes (in hex steps)
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

/**
 * Check if two hex coordinates are equal
 */
export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r
}

/**
 * Get all hexes in a ring at distance N from center
 */
export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [center]

  const results: HexCoord[] = []
  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]

  let hex = { q: center.q + directions[4].q * radius, r: center.r + directions[4].r * radius }

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push({ ...hex })
      hex = { q: hex.q + directions[i].q, r: hex.r + directions[i].r }
    }
  }

  return results
}

/**
 * Get all hexes within radius N from center (filled hexagon)
 */
export function hexagonOfRadius(radius: number, center: HexCoord = { q: 0, r: 0 }): HexCoord[] {
  const results: HexCoord[] = []

  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius)
    const r2 = Math.min(radius, -q + radius)
    for (let r = r1; r <= r2; r++) {
      results.push({ q: center.q + q, r: center.r + r })
    }
  }

  return results
}

/**
 * Get the ring type (core/mid/outer) based on distance from center
 */
export function getRingType(hex: HexCoord, totalRadius: number): "core" | "mid" | "outer" {
  const distance = hexDistance({ q: 0, r: 0 }, hex)
  const coreRadius = Math.floor(totalRadius * 0.25)
  const midRadius = Math.floor(totalRadius * 0.65)

  if (distance <= coreRadius) return "core"
  if (distance <= midRadius) return "mid"
  return "outer"
}

/**
 * Get neighbors of a hex
 */
export function hexNeighbors(hex: HexCoord): HexCoord[] {
  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]

  return directions.map((dir) => ({ q: hex.q + dir.q, r: hex.r + dir.r }))
}

/**
 * Get vertices of a hexagon for rendering (flat-top orientation)
 */
export function hexVertices(center: PixelCoord, size: number): PixelCoord[] {
  const vertices: PixelCoord[] = []
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i
    const angleRad = (Math.PI / 180) * angleDeg
    vertices.push({
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    })
  }
  return vertices
}

/**
 * Convert hex coordinate to string key for maps
 */
export function hexToKey(hex: HexCoord): string {
  return `${hex.q},${hex.r}`
}

/**
 * Convert string key back to hex coordinate
 */
export function keyToHex(key: string): HexCoord {
  const [q, r] = key.split(",").map(Number)
  return { q, r }
}

/**
 * Convert sector coordinate to string key for maps
 */
export function sectorToKey(sector: SectorCoord): string {
  return `${sector.hex.q},${sector.hex.r}:${sector.sector}`
}

/**
 * Convert string key back to sector coordinate
 */
export function keyToSector(key: string): SectorCoord {
  const [hexPart, sectorPart] = key.split(":")
  const [q, r] = hexPart.split(",").map(Number)
  return {
    hex: { q, r },
    sector: Number(sectorPart),
  }
}

/**
 * Get the 6 triangular sector vertices for a hexagon
 * Each sector is defined by [center, vertex_i, vertex_(i+1)]
 */
export function getSectorVertices(
  center: PixelCoord,
  hexCenter: PixelCoord,
  size: number,
  sectorIndex: number,
): PixelCoord[] {
  const hexVerts = hexVertices(center, size)
  const nextIndex = (sectorIndex + 1) % 6

  return [hexCenter, hexVerts[sectorIndex], hexVerts[nextIndex]]
}

/**
 * Get all 6 sectors for a hexagon
 */
export function getHexagonSectors(hex: HexCoord): SectorCoord[] {
  const sectors: SectorCoord[] = []
  for (let i = 0; i < 6; i++) {
    sectors.push({ hex, sector: i })
  }
  return sectors
}

/**
 * Check if a sector is adjacent to another sector
 */
export function areSectorsAdjacent(a: SectorCoord, b: SectorCoord): boolean {
  // Same hexagon, adjacent sectors
  if (hexEqual(a.hex, b.hex)) {
    const diff = Math.abs(a.sector - b.sector)
    return diff === 1 || diff === 5
  }

  // Different hexagons - check if they share an edge
  const neighbors = hexNeighbors(a.hex)
  const isNeighbor = neighbors.some((n) => hexEqual(n, b.hex))

  if (!isNeighbor) return false

  // Check if sectors are on the shared edge
  // This is a simplified check - sectors on opposite sides of shared edge are adjacent
  return true
}
