import type { HexCoord, PixelCoord, SectorCoord } from "./types"

import * as THREE from "three"

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
 * Returns 6 vertices in clockwise order starting from the right
 */
export function getHexVertices(center: PixelCoord, size: number): PixelCoord[] {
  const vertices: PixelCoord[] = []

  // This creates flat edges on top and bottom, points on left and right
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 // 0, 60, 120, 180, 240, 300 degrees
    vertices.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    })
  }

  return vertices
}

/**
 * Get the 3 vertices of a triangular sector within a hexagon
 * A hexagon is divided into 6 triangular sectors by connecting
 * the center to each pair of consecutive vertices
 *
 * @param center - Center point of the hexagon
 * @param size - Radius of the hexagon
 * @param sectorIndex - Sector index (0-5, clockwise from top)
 * @returns Array of 3 vertices [center, vertex_i, vertex_(i+1)]
 */
export function getSectorTriangleVertices(center: PixelCoord, size: number, sectorIndex: number): PixelCoord[] {
  const hexVerts = getHexVertices(center, size)
  const nextIndex = (sectorIndex + 1) % 6

  // Triangle: [center, current vertex, next vertex]
  return [center, hexVerts[sectorIndex], hexVerts[nextIndex]]
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

export const createFloorMeshes = async (): Promise<THREE.Mesh[]> => {
  try {
    const response = await fetch("http://localhost:8000/piso")
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const rawData: number[][][][] = await response.json()

    // cada hexágono
    const meshes: THREE.Mesh[] = rawData.map((hex) => {
      const vertices: PixelCoord[] = hex.map((v) => ({ x: v[0][0], y: v[1][0] }))

      // crear Shape
      const shape = new THREE.Shape()
      shape.moveTo(vertices[0].x, vertices[0].y)
      for (let i = 1; i < vertices.length; i++) shape.lineTo(vertices[i].x, vertices[i].y)
      shape.closePath()

      // extruir
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false })
      const material = new THREE.MeshPhongMaterial({ color: 0xaaaaaa })
      const mesh = new THREE.Mesh(geometry, material)

      return mesh
    })

    return meshes
  } catch (err) {
    console.error("Error fetching floor:", err)
    return []
  }
}

// /* ----------------------- Helpers ----------------------- */
export async function createHexMesh(x: number, y: number) {
  if (x == null || y == null) return null

  const shape = new THREE.Shape()
  // ejemplo: hexágono unitario
  const radius = 1
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const vx = x + radius * Math.cos(angle)
    const vy = y + radius * Math.sin(angle)
    if (i === 0) shape.moveTo(vx, vy)
    else shape.lineTo(vx, vy)
  }
  shape.closePath()

  const geometry = new THREE.ShapeGeometry(shape)
  return geometry
}
