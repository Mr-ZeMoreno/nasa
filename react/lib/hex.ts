import type { HabitatObject, HexCoord, PixelCoord, SectorCoord } from "./types"

import * as THREE from "three";

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
const API = "http://localhost:8000/formas"

export const hexVertices = async (center: PixelCoord, size: number): Promise<PixelCoord[]> => {
  try {
    const payload = {
      centro: [[center.x], [center.y], [0]], // así espera tu backend
      radio: size,
    }

    const response = await fetch(`${API}/hex`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const rawData: number[][][] = await response.json()

    // transformar [[x],[y],[z]] -> {x,y}
    const data: PixelCoord[] = rawData.map((colVector) => ({
      x: colVector[0][0],
      y: colVector[1][0],
    }))

    return data
  } catch (error) {
    console.error("Error fetching hex vertices:", error)
    return []
  }
}

export const createFloorMeshes = async (): Promise<THREE.Mesh[]> => {
  try {
    const response = await fetch(`${API}/piso`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const rawData: number[][][][] = await response.json();

    // cada hexágono
    const meshes: THREE.Mesh[] = rawData.map(hex => {
      const vertices: PixelCoord[] = hex.map(v => ({ x: v[0][0], y: v[1][0] }));

      // crear Shape
      const shape = new THREE.Shape();
      shape.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) shape.lineTo(vertices[i].x, vertices[i].y);
      shape.closePath();

      // extruir
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
      const material = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
      const mesh = new THREE.Mesh(geometry, material);

      return mesh;
    });

    return meshes;
  } catch (err) {
    console.error("Error fetching floor:", err);
    return [];
  }
};



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
export async function getSectorVertices(
  center: PixelCoord,
  hexCenter: PixelCoord,
  size: number,
  sectorIndex: number,
): Promise<PixelCoord[]> { // la función ahora devuelve Promise<PixelCoord[]>
  const hexVerts = await hexVertices(center, size) // <-- await aquí
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


// /* ----------------------- Helpers ----------------------- */
export async function createHexMesh(pos: { x: number; y: number; z: number }) {
  const HEX_SIZE = 0.9;
  const pixel = axialToPixel({ q: pos.x, r: pos.y }, 1);

  const shape = new THREE.Shape();
  const vertices = await hexVertices({ x: 0, y: 0 }, HEX_SIZE); // await aquí
  shape.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) shape.lineTo(vertices[i].x, vertices[i].y);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  const material = new THREE.MeshPhongMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.4 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pixel.x, pixel.y, pos.z * 0.15);
  mesh.userData = { type: "hex" };
  return mesh;
}


export async function createObjectMesh(obj: HabitatObject, pos: { x: number; y: number; z: number }) {
  const HEX_SIZE = 0.8;
  const pixel = axialToPixel({ q: pos.x, r: pos.y }, 1);

  const shape = new THREE.Shape();
  const vertices = await hexVertices({ x: 0, y: 0 }, HEX_SIZE); // await
  shape.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) shape.lineTo(vertices[i].x, vertices[i].y);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 });
  const material = new THREE.MeshPhongMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.3 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pixel.x, pixel.y, pos.z * 0.15 + 0.15);
  mesh.userData = { type: "object" };
  return mesh;
}
