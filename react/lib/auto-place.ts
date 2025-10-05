import type { Zone, HabitatObject, Placement, SectorCoord } from "@/lib/types"
import { validatePlacement } from "@/rules/validate"
import { sectorToKey, hexDistance, getHexagonSectors } from "@/lib/hex"
import { nanoid } from "nanoid"

/**
 * Modo debug:
 * - STRICT_TAGS: si true exige match estricto (todos los tags); si false, basta intersección o vacío.
 * - ALLOW_NON_CONTIGUOUS_FALLBACK: coloca aunque no haya clúster contiguo (solo para depurar/visualizar).
 * - LOG_VERBOSE: logs detallados.
 */
const STRICT_TAGS = false
const ALLOW_NON_CONTIGUOUS_FALLBACK = true
const LOG_VERBOSE = true

// ------------ Utils de prioridad (colocar grandes primero) ------------

/** Usa footprint (w*h) si existe; si no, usa slots como proxy de tamaño. */
function areaOfObject(obj: HabitatObject): number {
  const fp = (obj as any)?.footprint as { w?: number; h?: number } | undefined
  const w = typeof fp?.w === "number" && fp.w > 0 ? fp.w : 0
  const h = typeof fp?.h === "number" && fp.h > 0 ? fp.h : 0
  if (w > 0 && h > 0) return w * h
  const slots = typeof obj.slots === "number" && obj.slots > 0 ? obj.slots : 1
  return slots
}
const priority = (a: HabitatObject, b: HabitatObject) => areaOfObject(b) - areaOfObject(a)

/** Capacidad por defecto si la zona no define capacitySlots: #sectores de la zona. */
function defaultZoneCapacity(zone: Zone): number {
  const sectors = zone.cells?.length ? zone.cells.length * 6 : 0
  return sectors > 0 ? sectors : Number.POSITIVE_INFINITY
}

/** Normaliza sinónimos de tags para facilitar coincidencias. */
function normalizeTag(t: string): string {
  const key = t?.toLowerCase?.() ?? t
  const map: Record<string, string> = {
    galley: "galley",
    food: "galley",
    kitchen: "galley",

    storage: "stowage",
    stowage: "stowage",

    eclss: "eclss",
    "life-support": "eclss",
    lifesupport: "eclss",

    hygiene: "hygiene",
    sleep: "sleep",
    medical: "medical",
    exercise: "exercise",
    noisy: "noisy",
  }
  return map[key] ?? key
}

/** Coincidencia de tags; en modo relajado, basta intersección o listas vacías. */
function normalizedOverlap(objTagsRaw: string[] | undefined, allowedRaw: string[] | undefined, strict: boolean) {
  const objTags = (objTagsRaw ?? []).map(normalizeTag)
  const allowed = (allowedRaw ?? []).map(normalizeTag)
  if (!strict) {
    if (objTags.length === 0 || allowed.length === 0) return true
    return objTags.some((t) => allowed.includes(t))
  } else {
    if (objTags.length === 0) return true
    if (allowed.length === 0) return false
    return objTags.every((t) => allowed.includes(t))
  }
}

/**
 * Algoritmo de autoplacement por zonas/sectores.
 * - Ordena objetos por tamaño
 * - Filtra zonas compatibles (capacidad + tags normalizados)
 * - Busca clúster contiguo de sectores libres (BFS)
 * - Valida con validatePlacement y confirma
 * - Actualiza occupiedSectors y zone.usedSlots
 * - Fallbacks: relaxTags (si STRICT_TAGS=true) y non-contiguous (depuración)
 */
export function autoPlaceObjects(
  objects: HabitatObject[],
  zones: Zone[],
  existingPlacements: Placement[] = [],
): Placement[] {
  const placements: Placement[] = [...existingPlacements]

  // Ocupación actual
  const occupiedSectors = new Set<string>()
  existingPlacements.forEach((p) => p.sectors.forEach((s) => occupiedSectors.add(sectorToKey(s))))

  // Alinear usedSlots con placements iniciales
  recomputeZoneUsedSlotsFromPlacements(zones, placements, objects)

  // Orden por tamaño
  const sorted = [...objects].sort(priority)
  if (LOG_VERBOSE) {
    console.log("[autoPlace] Orden:", sorted.map((o) => ({ name: o.name, slots: o.slots, area: areaOfObject(o) })))
  }

  for (const object of sorted) {
    const placement = findBestPlacement(
      object, zones, placements, objects, occupiedSectors, { relaxTags: !STRICT_TAGS }
    )

    if (placement) {
      placements.push(placement)
      placement.sectors.forEach((s) => occupiedSectors.add(sectorToKey(s)))
      const z = zones.find((zz) => zz.id === placement.zoneId)
      if (z) z.usedSlots = (z.usedSlots ?? 0) + (object.slots ?? 1)
      if (LOG_VERBOSE) console.log(`[autoPlace] Colocado: ${object.name} en zona ${placement.zoneId}`)
      continue
    }

    console.warn(`Could not place object: ${object.name}`)

    // Si estabas en modo estricto y falló, intenta relajado explícito
    if (STRICT_TAGS) {
      const relaxed = findBestPlacement(object, zones, placements, objects, occupiedSectors, { relaxTags: true })
      if (relaxed) {
        placements.push(relaxed)
        relaxed.sectors.forEach((s) => occupiedSectors.add(sectorToKey(s)))
        const z = zones.find((zz) => zz.id === relaxed.zoneId)
        if (z) z.usedSlots = (z.usedSlots ?? 0) + (object.slots ?? 1)
        console.warn(`[autoPlace] (relaxed tags) Colocado: ${object.name} en zona ${relaxed.zoneId}`)
        continue
      }
    }

    // Fallback: no contiguo (solo depuración visual)
    if (ALLOW_NON_CONTIGUOUS_FALLBACK) {
      const nonContig = placeNonContiguous(object, zones, placements, objects, occupiedSectors)
      if (nonContig) {
        placements.push(nonContig)
        nonContig.sectors.forEach((s) => occupiedSectors.add(sectorToKey(s)))
        const z = zones.find((zz) => zz.id === nonContig.zoneId)
        if (z) z.usedSlots = (z.usedSlots ?? 0) + (object.slots ?? 1)
        console.warn(`[autoPlace] (non-contiguous) Colocado: ${object.name} en zona ${nonContig.zoneId}`)
        continue
      }
    }
  }

  return placements
}

/** Recalcula usedSlots por zona desde los placements iniciales. */
function recomputeZoneUsedSlotsFromPlacements(
  zones: Zone[],
  placements: Placement[],
  objects: HabitatObject[],
) {
  zones.forEach((z) => (z.usedSlots = 0))
  for (const p of placements) {
    const o = objects.find((x) => x.id === p.objectId)
    const z = zones.find((zz) => zz.id === p.zoneId)
    if (o && z) z.usedSlots += (o.slots ?? 1)
  }
}

/** Encuentra el mejor placement contiguo cumpliendo reglas. */
function findBestPlacement(
  object: HabitatObject,
  zones: Zone[],
  existingPlacements: Placement[],
  allObjects: HabitatObject[],
  occupiedSectors: Set<string>,
  opts?: { relaxTags?: boolean },
): Placement | null {
  const candidates: Array<{ zone: Zone; sectors: SectorCoord[]; score: number }> = []

  // 1) Zonas compatibles (capacidad + tags)
  const compatibleZones = zones.filter((zone) => {
    const cap = zone.capacitySlots ?? defaultZoneCapacity(zone)
    const used = zone.usedSlots ?? 0
    const hasCapacity = used + (object.slots ?? 1) <= cap

    const tagsOk = normalizedOverlap(object.tags, zone.allowedTags, !opts?.relaxTags)

    if (LOG_VERBOSE && (!hasCapacity || !tagsOk)) {
      console.log(
        `[findBestPlacement] descarta zona ${zone.id} para ${object.name}:`,
        { hasCapacity, used, cap, tagsOk, objTags: object.tags, allowedTags: zone.allowedTags }
      )
    }

    return hasCapacity && tagsOk
  })

  if (LOG_VERBOSE) {
    console.log(
      `[findBestPlacement] ${object.name} zonas compatibles:`,
      compatibleZones.map((z) => ({ id: z.id, used: z.usedSlots, cap: z.capacitySlots, ring: (z as any).ring })),
    )
  }

  // 2) Generar candidatos contiguos por zona
  for (const zone of compatibleZones) {
    const allSectorsInZone: SectorCoord[] = []
    zone.cells.forEach((cell) => allSectorsInZone.push(...getHexagonSectors(cell)))

    const free = allSectorsInZone.filter((s) => !occupiedSectors.has(sectorToKey(s)))
    if (free.length < (object.slots ?? 1)) {
      if (LOG_VERBOSE) console.log(`[findBestPlacement] zona ${zone.id} sin slots libres suficientes`)
      continue
    }

    // Probar distintas semillas (greedy BFS)
    for (const startSector of free) {
      const cluster = findContiguousSectors(startSector, (object.slots ?? 1), zone.cells, occupiedSectors)

      if (cluster.length === (object.slots ?? 1)) {
        const score = scorePlacement(object, zone, cluster, zones, existingPlacements, allObjects)
        candidates.push({ zone, sectors: cluster, score })
      }
    }
  }

  // 3) Ordenar candidatos y validar con reglas
  candidates.sort((a, b) => b.score - a.score)
  if (LOG_VERBOSE && candidates.length) {
    console.log(`[findBestPlacement] candidatos ${object.name}:`, candidates.slice(0, 5).map(c => ({
      zone: c.zone.id, score: c.score, sectors: c.sectors.length
    })))
  }

  for (const candidate of candidates) {
    const validation = validatePlacement(
      object,
      candidate.zone,
      candidate.sectors,
      zones,
      existingPlacements,
      allObjects,
    )
    const hardFail = validation.results.some((r) => r.severity === "hard" && !r.ok)
    if (!hardFail) {
      return {
        id: nanoid(),
        objectId: object.id,
        zoneId: candidate.zone.id,
        sectors: candidate.sectors,
      }
    } else if (LOG_VERBOSE) {
      const reasons = validation.results.filter(r => !r.ok).map(r => `[${r.severity}] ${r.message ?? r.rule ?? "rule"}`)
      console.warn(`[validatePlacement] hard fail ${object.name} en zona ${candidate.zone.id}:`, reasons)
    }
  }

  return null
}

/** BFS: busca sectores contiguos hasta completar `count`. */
function findContiguousSectors(
  startSector: SectorCoord,
  count: number,
  availableCells: Array<{ q: number; r: number }>,
  occupiedSectors: Set<string>,
): SectorCoord[] {
  const result: SectorCoord[] = [startSector]
  const visited = new Set<string>([sectorToKey(startSector)])
  const queue: SectorCoord[] = [startSector]

  while (queue.length > 0 && result.length < count) {
    const current = queue.shift()!
    const adjacent = getAdjacentSectors(current, availableCells)
    for (const neighbor of adjacent) {
      const key = sectorToKey(neighbor)
      if (!visited.has(key) && !occupiedSectors.has(key)) {
        visited.add(key)
        result.push(neighbor)
        queue.push(neighbor)
        if (result.length >= count) break
      }
    }
  }
  return result
}

/** Vecinos de un sector (mismo hex y hexes contiguos). */
function getAdjacentSectors(
  sector: SectorCoord,
  availableCells: Array<{ q: number; r: number }>
): SectorCoord[] {
  const adjacent: SectorCoord[] = []

  // Dentro del mismo hex
  const prevSector = (sector.sector + 5) % 6
  const nextSector = (sector.sector + 1) % 6
  adjacent.push({ hex: sector.hex, sector: prevSector })
  adjacent.push({ hex: sector.hex, sector: nextSector })

  // Hex vecinos (axial)
  const neighbors = [
    { q: sector.hex.q + 1, r: sector.hex.r },
    { q: sector.hex.q + 1, r: sector.hex.r - 1 },
    { q: sector.hex.q,     r: sector.hex.r - 1 },
    { q: sector.hex.q - 1, r: sector.hex.r },
    { q: sector.hex.q - 1, r: sector.hex.r + 1 },
    { q: sector.hex.q,     r: sector.hex.r + 1 },
  ]

  neighbors.forEach((neighborHex) => {
    const isAvailable = availableCells.some((cell) => cell.q === neighborHex.q && cell.r === neighborHex.r)
    if (isAvailable) {
      const oppositeSector = (sector.sector + 3) % 6
      adjacent.push({ hex: neighborHex, sector: oppositeSector })
    }
  })

  return adjacent
}

/** Scoring para priorizar candidatos. */
function scorePlacement(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
  allZones: Zone[],
  existingPlacements: Placement[],
  allObjects: HabitatObject[],
): number {
  let score = 0

  // Prefer core para ECLSS
  if (object.tags?.map(normalizeTag).includes("eclss") && (zone as any).ring === "core") score += 50

  // Living al mid
  const tags = (object.tags ?? []).map(normalizeTag)
  if ((tags.includes("sleep") || tags.includes("hygiene")) && (zone as any).ring === "mid") score += 40

  // Noisy al outer
  if (tags.includes("noisy") && (zone as any).ring === "outer") score += 40

  // Galley cerca de storage
  if (tags.includes("galley")) {
    const storagePlacements = existingPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags?.map(normalizeTag).includes("stowage")
    })
    if (storagePlacements.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY
      storagePlacements.forEach((p) => {
        p.sectors.forEach((s1) => {
          sectors.forEach((s2) => {
            minDistance = Math.min(minDistance, hexDistance(s1.hex, s2.hex))
          })
        })
      })
      if (minDistance <= 3) score += 30
    }
  }

  // Penalizar distancia del centro
  const avgDistance =
    sectors.reduce((sum, s) => sum + hexDistance(s.hex, { q: 0, r: 0 }), 0) / sectors.length
  score -= avgDistance * 2

  // Bonus por usar la zona (llenado)
  const cap = zone.capacitySlots ?? defaultZoneCapacity(zone)
  const zoneUtil = ((zone.usedSlots ?? 0) + (object.slots ?? 1)) / (cap || 1)
  score += zoneUtil * 20

  return score
}

/** Fallback: coloca no-contiguo (solo para depuración visual). */
function placeNonContiguous(
  object: HabitatObject,
  zones: Zone[],
  existingPlacements: Placement[],
  allObjects: HabitatObject[],
  occupiedSectors: Set<string>,
): Placement | null {
  const candidateZones = zones.filter((zone) => {
    const cap = zone.capacitySlots ?? defaultZoneCapacity(zone)
    const used = zone.usedSlots ?? 0
    const hasCapacity = used + (object.slots ?? 1) <= cap
    const tagsOk = normalizedOverlap(object.tags, zone.allowedTags, STRICT_TAGS)
    return hasCapacity && tagsOk
  })

  for (const zone of candidateZones) {
    const allSectorsInZone: SectorCoord[] = []
    zone.cells.forEach((cell) => allSectorsInZone.push(...getHexagonSectors(cell)))

    const free = allSectorsInZone.filter((s) => !occupiedSectors.has(sectorToKey(s)))
    if (free.length >= (object.slots ?? 1)) {
      const chosen = free.slice(0, (object.slots ?? 1))

      const validation = validatePlacement(object, zone, chosen, zones, existingPlacements, allObjects)
      const hardFail = validation.results.some((r) => r.severity === "hard" && !r.ok)
      if (!hardFail) {
        return { id: nanoid(), objectId: object.id, zoneId: zone.id, sectors: chosen }
      }
    }
  }

  return null
}
