import type { HabitatObject } from "@/lib/types"

/**
 * Catalog of habitat objects
 */
export const OBJECT_CATALOG: HabitatObject[] = [
  // Sleep
  {
    id: "obj-sleep-pod",
    name: "Sleep Pod",
    slots: 2,
    tags: ["quiet", "personal", "sleep"],
    priority: 10,
    description: "Individual sleeping quarters",
  },

  // Galley
  {
    id: "obj-galley-unit",
    name: "Galley Unit",
    slots: 4,
    tags: ["food", "heat", "wet"],
    priority: 9,
    description: "Food preparation and dining",
  },
  {
    id: "obj-food-storage",
    name: "Food Storage",
    slots: 2,
    tags: ["food", "storage"],
    priority: 8,
    description: "Refrigerated food storage",
  },

  // Hygiene
  {
    id: "obj-hygiene-module",
    name: "Hygiene Module",
    slots: 3,
    tags: ["wet", "hygiene"],
    priority: 9,
    description: "Shower and waste management",
  },

  // ECLSS
  {
    id: "obj-eclss-rack",
    name: "ECLSS Rack",
    slots: 4,
    tags: ["life_support", "critical"],
    priority: 10,
    description: "Environmental control and life support",
  },
  {
    id: "obj-oxygen-gen",
    name: "O2 Generator",
    slots: 2,
    tags: ["life_support", "critical"],
    priority: 10,
    description: "Oxygen generation system",
  },

  // Exercise
  {
    id: "obj-treadmill",
    name: "Treadmill",
    slots: 3,
    tags: ["noisy", "exercise"],
    priority: 7,
    description: "Exercise treadmill",
  },
  {
    id: "obj-bike",
    name: "Exercise Bike",
    slots: 2,
    tags: ["noisy", "exercise"],
    priority: 7,
    description: "Stationary bicycle",
  },

  // Medical
  {
    id: "obj-medical-station",
    name: "Medical Station",
    slots: 4,
    tags: ["medical", "quiet"],
    priority: 8,
    description: "Medical examination and treatment",
  },
  {
    id: "obj-medical-storage",
    name: "Medical Storage",
    slots: 2,
    tags: ["medical", "storage"],
    priority: 7,
    description: "Medical supplies and equipment",
  },

  // Stowage
  {
    id: "obj-storage-rack",
    name: "Storage Rack",
    slots: 2,
    tags: ["storage"],
    priority: 5,
    description: "General storage",
  },

  // Command
  {
    id: "obj-command-console",
    name: "Command Console",
    slots: 3,
    tags: ["critical", "command"],
    priority: 9,
    description: "Mission control and communications",
  },
]

/**
 * Get objects needed for selected functions
 */
export function getObjectsForFunctions(functions: string[], crew: number): HabitatObject[] {
  const objects: HabitatObject[] = []

  functions.forEach((func) => {
    switch (func) {
      case "sleep":
        // One sleep pod per crew member
        for (let i = 0; i < crew; i++) {
          objects.push({ ...OBJECT_CATALOG[0], id: `${OBJECT_CATALOG[0].id}-${i}` })
        }
        break
      case "galley":
        objects.push(OBJECT_CATALOG[1]) // Galley unit
        objects.push(OBJECT_CATALOG[2]) // Food storage
        break
      case "hygiene":
        objects.push(OBJECT_CATALOG[3]) // Hygiene module
        break
      case "eclss":
        objects.push(OBJECT_CATALOG[4]) // ECLSS rack
        objects.push(OBJECT_CATALOG[5]) // O2 generator
        break
      case "exercise":
        objects.push(OBJECT_CATALOG[6]) // Treadmill
        objects.push(OBJECT_CATALOG[7]) // Bike
        break
      case "medical":
        objects.push(OBJECT_CATALOG[8]) // Medical station
        objects.push(OBJECT_CATALOG[9]) // Medical storage
        break
      case "stowage":
        // Add storage racks based on crew size
        const storageCount = Math.ceil(crew / 2)
        for (let i = 0; i < storageCount; i++) {
          objects.push({ ...OBJECT_CATALOG[10], id: `${OBJECT_CATALOG[10].id}-${i}` })
        }
        break
      case "command":
        objects.push(OBJECT_CATALOG[11]) // Command console
        break
    }
  })

  return objects
}
