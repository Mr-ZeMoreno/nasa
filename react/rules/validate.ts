import type { Zone, HabitatObject, Placement, ValidationResult, RuleResult, SectorCoord } from "@/lib/types"
import { hexDistance, sectorToKey } from "@/lib/hex"

/**
 * Validate a placement against all rules
 */
export function validatePlacement(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
  allZones: Zone[],
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): ValidationResult {
  const results: RuleResult[] = []

  results.push(validateCapacity(object, zone))
  results.push(validateTags(object, zone))
  results.push(...validateNoiseSeparation(object, zone, sectors, allZones, allPlacements, allObjects))
  results.push(...validateFunctionalAdjacency(object, zone, sectors, allZones, allPlacements, allObjects))
  results.push(validateProhibitedZone(object, zone))
  results.push(validateAccessibility(object, zone, sectors, allZones, allPlacements))
  results.push(...validateHygieneSeparation(object, zone, sectors, allZones, allPlacements, allObjects))
  results.push(...validateThermalManagement(object, zone, sectors, allZones, allPlacements, allObjects))
  results.push(...validateEmergencyAccess(object, zone, sectors, allZones, allPlacements))
  results.push(...validateCriticalRedundancy(object, allPlacements, allObjects))

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
      ? `${object.name}: Capacity OK in ${zone.name}`
      : `${object.name}: Insufficient capacity in ${zone.name} (needs ${object.slots} slots, only ${availableSlots} available)`,
    hint: ok ? undefined : `Try placing ${object.name} in a different zone or increase habitat radius`,
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
    message: ok
      ? `${object.name}: Tags compatible with ${zone.name}`
      : `${object.name}: Incompatible with ${zone.name} (tags: ${incompatibleTags.join(", ")})`,
    hint: ok ? undefined : `${object.name} requires a zone that allows: ${incompatibleTags.join(", ")}`,
  }
}

/**
 * Rule: Noise separation (soft)
 * Noisy objects should be at least 2 cells away from sleep areas
 */
function validateNoiseSeparation(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
  allZones: Zone[],
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): RuleResult[] {
  const results: RuleResult[] = []
  const violations = new Map<string, number>()

  if (object.tags.includes("noisy")) {
    const sleepZones = allZones.filter((z) => z.allowedTags.includes("sleep"))

    sleepZones.forEach((sleepZone) => {
      const sleepPlacements = allPlacements.filter((p) => p.zoneId === sleepZone.id)

      sleepPlacements.forEach((sleepPlacement) => {
        const sleepObject = allObjects.find((o) => o.id === sleepPlacement.objectId)
        let minDistance = Number.POSITIVE_INFINITY

        sleepPlacement.sectors.forEach((sleepSector) => {
          sectors.forEach((sector) => {
            const distance = hexDistance(sector.hex, sleepSector.hex)
            minDistance = Math.min(minDistance, distance)
          })
        })

        if (minDistance < 2) {
          const key = `${object.id}-${sleepPlacement.id}`
          violations.set(key, minDistance)
        }
      })
    })

    violations.forEach((distance, key) => {
      results.push({
        rule: "noise-separation",
        ok: false,
        severity: "soft",
        message: `${object.name} (noisy) too close to sleep area (${distance.toFixed(1)} cells away)`,
        hint: `Move ${object.name} to at least 2 cells away from sleep quarters for crew rest`,
      })
    })
  }

  if (object.tags.includes("sleep")) {
    const noisyPlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("noisy")
    })

    noisyPlacements.forEach((noisyPlacement) => {
      const noisyObject = allObjects.find((o) => o.id === noisyPlacement.objectId)
      let minDistance = Number.POSITIVE_INFINITY

      noisyPlacement.sectors.forEach((noisySector) => {
        sectors.forEach((sector) => {
          const distance = hexDistance(sector.hex, noisySector.hex)
          minDistance = Math.min(minDistance, distance)
        })
      })

      if (minDistance < 2 && noisyObject) {
        const key = `${object.id}-${noisyPlacement.id}`
        if (!violations.has(key)) {
          violations.set(key, minDistance)
          results.push({
            rule: "noise-separation",
            ok: false,
            severity: "soft",
            message: `${object.name} (sleep) too close to ${noisyObject.name} (${minDistance.toFixed(1)} cells away)`,
            hint: `Move ${object.name} to at least 2 cells away from noisy equipment`,
          })
        }
      }
    })
  }

  return results.length > 0
    ? results
    : [{ rule: "noise-separation", ok: true, severity: "soft", message: `${object.name}: Noise separation OK` }]
}

/**
 * Rule: Functional adjacency (soft)
 * Galley should be within 3 cells of stowage, hygiene near sleep, etc.
 */
function validateFunctionalAdjacency(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
  allZones: Zone[],
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): RuleResult[] {
  const results: RuleResult[] = []

  if (object.tags.includes("food")) {
    const storagePlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("storage")
    })

    if (storagePlacements.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY
      let nearestStorage: HabitatObject | undefined

      storagePlacements.forEach((storagePlacement) => {
        storagePlacement.sectors.forEach((storageSector) => {
          sectors.forEach((sector) => {
            const distance = hexDistance(sector.hex, storageSector.hex)
            if (distance < minDistance) {
              minDistance = distance
              nearestStorage = allObjects.find((o) => o.id === storagePlacement.objectId)
            }
          })
        })
      })

      const ok = minDistance <= 3

      if (!ok) {
        results.push({
          rule: "functional-adjacency",
          ok: false,
          severity: "soft",
          message: `${object.name} too far from ${nearestStorage?.name || "storage"} (${minDistance.toFixed(1)} cells)`,
          hint: `Place ${object.name} within 3 cells of storage for efficient workflow`,
        })
      }
    }
  }

  if (object.tags.includes("hygiene")) {
    const sleepPlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("sleep")
    })

    if (sleepPlacements.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY

      sleepPlacements.forEach((sleepPlacement) => {
        sleepPlacement.sectors.forEach((sleepSector) => {
          sectors.forEach((sector) => {
            const distance = hexDistance(sector.hex, sleepSector.hex)
            minDistance = Math.min(minDistance, distance)
          })
        })
      })

      const ok = minDistance <= 2

      if (!ok) {
        results.push({
          rule: "functional-adjacency",
          ok: false,
          severity: "soft",
          message: `${object.name} too far from sleep quarters (${minDistance.toFixed(1)} cells)`,
          hint: `Place ${object.name} within 2 cells of crew quarters for convenience`,
        })
      }
    }
  }

  if (object.tags.includes("exercise")) {
    const hygienePlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("hygiene")
    })

    if (hygienePlacements.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY

      hygienePlacements.forEach((hygienePlacement) => {
        hygienePlacement.sectors.forEach((hygieneSector) => {
          sectors.forEach((sector) => {
            const distance = hexDistance(sector.hex, hygieneSector.hex)
            minDistance = Math.min(minDistance, distance)
          })
        })
      })

      const ok = minDistance <= 2

      if (!ok) {
        results.push({
          rule: "functional-adjacency",
          ok: false,
          severity: "soft",
          message: `${object.name} should be near hygiene facilities (${minDistance.toFixed(1)} cells away)`,
          hint: `Place ${object.name} within 2 cells of hygiene for post-workout cleanup`,
        })
      }
    }
  }

  return results.length > 0
    ? results
    : [{ rule: "functional-adjacency", ok: true, severity: "soft", message: `${object.name}: Adjacency OK` }]
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
    message: ok
      ? `${object.name}: Zone placement OK`
      : `${object.name}: Noisy objects not allowed in ${zone.name} (core ring)`,
    hint: ok ? undefined : `Move ${object.name} to mid or outer ring zones`,
  }
}

/**
 * Rule: Accessibility (soft)
 * Objects should not be completely surrounded (need at least one free neighbor)
 */
function validateAccessibility(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
  allZones: Zone[],
  allPlacements: Placement[],
): RuleResult {
  const occupiedSectors = new Set<string>()
  allPlacements.forEach((p) => {
    p.sectors.forEach((sector) => {
      occupiedSectors.add(sectorToKey(sector))
    })
  })

  let hasFreeNeighbor = false

  for (const sector of sectors) {
    // Check adjacent sectors in same hex
    const adjacentInSameHex = [
      { hex: sector.hex, sector: (sector.sector + 5) % 6 },
      { hex: sector.hex, sector: (sector.sector + 1) % 6 },
    ]

    for (const neighbor of adjacentInSameHex) {
      if (!occupiedSectors.has(sectorToKey(neighbor))) {
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
    message: hasFreeNeighbor ? `${object.name}: Accessible` : `${object.name}: Completely surrounded, no access`,
    hint: hasFreeNeighbor ? undefined : `Ensure at least one adjacent sector is free for crew access to ${object.name}`,
  }
}

/**
 * Rule: Hygiene separation (hard)
 * Waste management and hygiene should be separated from food preparation
 */
function validateHygieneSeparation(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
  allZones: Zone[],
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): RuleResult[] {
  const results: RuleResult[] = []
  const minSeparation = 3

  if (object.tags.includes("hygiene") || object.tags.includes("waste")) {
    const foodPlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj?.tags.includes("food")
    })

    foodPlacements.forEach((foodPlacement) => {
      const foodObject = allObjects.find((o) => o.id === foodPlacement.objectId)
      let minDistance = Number.POSITIVE_INFINITY

      foodPlacement.sectors.forEach((foodSector) => {
        sectors.forEach((sector) => {
          const distance = hexDistance(sector.hex, foodSector.hex)
          minDistance = Math.min(minDistance, distance)
        })
      })

      if (minDistance < minSeparation && foodObject) {
        results.push({
          rule: "hygiene-separation",
          ok: false,
          severity: "hard",
          message: `${object.name} too close to ${foodObject.name} (${minDistance.toFixed(1)} cells) - contamination risk`,
          hint: `Maintain at least ${minSeparation} cells between hygiene/waste and food preparation areas`,
        })
      }
    })
  }

  return results.length > 0
    ? results
    : [{ rule: "hygiene-separation", ok: true, severity: "hard", message: `${object.name}: Hygiene separation OK` }]
}

/**
 * Rule: Thermal management (soft)
 * Heat-generating equipment should be distributed, not clustered
 */
function validateThermalManagement(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
  allZones: Zone[],
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): RuleResult[] {
  const results: RuleResult[] = []
  const heatTags = ["exercise", "food", "power"]

  if (heatTags.some((tag) => object.tags.includes(tag))) {
    const heatPlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return obj && heatTags.some((tag) => obj.tags.includes(tag)) && p.id !== object.id
    })

    let nearbyHeatSources = 0

    heatPlacements.forEach((heatPlacement) => {
      const heatObject = allObjects.find((o) => o.id === heatPlacement.objectId)
      let minDistance = Number.POSITIVE_INFINITY

      heatPlacement.sectors.forEach((heatSector) => {
        sectors.forEach((sector) => {
          const distance = hexDistance(sector.hex, heatSector.hex)
          minDistance = Math.min(minDistance, distance)
        })
      })

      if (minDistance <= 2) {
        nearbyHeatSources++
      }
    })

    if (nearbyHeatSources >= 2) {
      results.push({
        rule: "thermal-management",
        ok: false,
        severity: "soft",
        message: `${object.name}: ${nearbyHeatSources} heat sources nearby - thermal clustering`,
        hint: `Distribute heat-generating equipment to avoid thermal hotspots`,
      })
    }
  }

  return results.length > 0
    ? results
    : [{ rule: "thermal-management", ok: true, severity: "soft", message: `${object.name}: Thermal distribution OK` }]
}

/**
 * Rule: Emergency access (soft)
 * Critical systems should have clear access paths
 */
function validateEmergencyAccess(
  object: HabitatObject,
  zone: Zone,
  sectors: SectorCoord[],
  allZones: Zone[],
  allPlacements: Placement[],
): RuleResult[] {
  const results: RuleResult[] = []
  const criticalTags = ["life-support", "power", "medical"]

  if (criticalTags.some((tag) => object.tags.includes(tag))) {
    const occupiedSectors = new Set<string>()
    allPlacements.forEach((p) => {
      p.sectors.forEach((sector) => {
        occupiedSectors.add(sectorToKey(sector))
      })
    })

    let freeNeighborCount = 0

    sectors.forEach((sector) => {
      const adjacentInSameHex = [
        { hex: sector.hex, sector: (sector.sector + 5) % 6 },
        { hex: sector.hex, sector: (sector.sector + 1) % 6 },
      ]

      adjacentInSameHex.forEach((neighbor) => {
        if (!occupiedSectors.has(sectorToKey(neighbor))) {
          freeNeighborCount++
        }
      })
    })

    const ok = freeNeighborCount >= 2

    if (!ok) {
      results.push({
        rule: "emergency-access",
        ok: false,
        severity: "soft",
        message: `${object.name}: Limited emergency access (only ${freeNeighborCount} free adjacent sectors)`,
        hint: `Critical systems should have at least 2 free adjacent sectors for emergency access`,
      })
    }
  }

  return results.length > 0
    ? results
    : [{ rule: "emergency-access", ok: true, severity: "soft", message: `${object.name}: Emergency access OK` }]
}

/**
 * Rule: Critical redundancy (soft)
 * Life-support and critical systems should have backups
 */
function validateCriticalRedundancy(
  object: HabitatObject,
  allPlacements: Placement[],
  allObjects: HabitatObject[],
): RuleResult[] {
  const results: RuleResult[] = []
  const criticalTags = ["life-support", "power", "water"]

  if (criticalTags.some((tag) => object.tags.includes(tag))) {
    const sameTypePlacements = allPlacements.filter((p) => {
      const obj = allObjects.find((o) => o.id === p.objectId)
      return (
        obj && obj.id !== object.id && criticalTags.some((tag) => obj.tags.includes(tag) && object.tags.includes(tag))
      )
    })

    const hasRedundancy = sameTypePlacements.length > 0

    if (!hasRedundancy) {
      results.push({
        rule: "critical-redundancy",
        ok: false,
        severity: "soft",
        message: `${object.name}: No redundancy for critical system`,
        hint: `Consider adding backup ${object.name} for mission safety`,
      })
    }
  }

  return results.length > 0
    ? results
    : [{ rule: "critical-redundancy", ok: true, severity: "soft", message: `${object.name}: Redundancy OK` }]
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
      const result = validatePlacement(object, zone, placement.sectors, zones, placements, objects)
      allResults.push(...result.results)
    }
  })

  const ok = allResults.every((r) => r.ok || r.severity === "soft")

  return { ok, results: allResults }
}
