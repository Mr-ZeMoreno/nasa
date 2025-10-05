import { create } from "zustand"
import type { HabitatState, HabitatInputs, Placement, RuleResult } from "@/lib/types"
import { calculateRadius } from "@/lib/dimensioning"
import { createZones } from "@/data/catalog-zones"
import { getObjectsForFunctions } from "@/data/catalog-objects"
import { generateGrid } from "@/lib/grid-generator"
import { autoPlaceObjects } from "@/lib/auto-place"
import { validateLayout } from "@/rules/validate"

interface HabitatStore extends HabitatState {
  // State
  validationResults: RuleResult[]
  isGenerating: boolean

  // Actions
  setInputs: (inputs: HabitatInputs) => void
  generateHabitat: () => void
  setMode: (mode: "auto" | "manual") => void
  addPlacement: (placement: Placement) => void
  removePlacement: (placementId: string) => void
  updatePlacement: (placementId: string, updates: Partial<Placement>) => void
  setValidationResults: (results: RuleResult[]) => void
  reset: () => void
  exportLayout: () => string
  importLayout: (json: string) => void
}

const DEFAULT_INPUTS: HabitatInputs = {
  crew: 4,
  durationDays: 30,
  functions: ["sleep", "galley", "hygiene", "eclss", "exercise", "medical", "stowage"],
}

export const useHabitat = create<HabitatStore>((set, get) => ({
  // Initial state
  inputs: DEFAULT_INPUTS,
  radius: 6,
  zones: [],
  objects: [],
  placements: [],
  mode: "auto",
  validationResults: [],
  isGenerating: false,

  // Set inputs
  setInputs: (inputs) => {
    set({ inputs })
  },

  // Generate habitat from inputs
  generateHabitat: () => {
    set({ isGenerating: true })

    const { inputs, mode } = get()

    // Calculate radius
    const radius = calculateRadius(inputs)

    // Create zones from selected functions
    const zones = createZones(inputs.functions, radius)

    // Generate grid and assign cells to zones
    const zonesWithCells = generateGrid(radius, zones)

    // Get objects needed for these functions
    const objects = getObjectsForFunctions(inputs.functions, inputs.crew)

    let placements: Placement[] = []
    if (mode === "auto") {
      placements = autoPlaceObjects(objects, zonesWithCells)
    }

    const validation = validateLayout(zonesWithCells, placements, objects)

    set({
      radius,
      zones: zonesWithCells,
      objects,
      placements,
      validationResults: validation.results,
      isGenerating: false,
    })
  },

  // Set mode
  setMode: (mode) => {
    set({ mode })
  },

  // Add placement
  addPlacement: (placement) => {
    const { placements, zones } = get()

    // Update zone used slots
    const zone = zones.find((z) => z.id === placement.zoneId)
    if (zone) {
      const updatedZones = zones.map((z) =>
        z.id === placement.zoneId ? { ...z, usedSlots: z.usedSlots + placement.cells.length } : z,
      )
      set({ zones: updatedZones })
    }

    set({ placements: [...placements, placement] })
  },

  // Remove placement
  removePlacement: (placementId) => {
    const { placements, zones, objects } = get()
    const placement = placements.find((p) => p.id === placementId)

    if (placement) {
      // Update zone used slots
      const object = objects.find((o) => o.id === placement.objectId)
      if (object) {
        const updatedZones = zones.map((z) =>
          z.id === placement.zoneId ? { ...z, usedSlots: Math.max(0, z.usedSlots - object.slots) } : z,
        )
        set({ zones: updatedZones })
      }
    }

    set({ placements: placements.filter((p) => p.id !== placementId) })
  },

  // Update placement
  updatePlacement: (placementId, updates) => {
    const { placements } = get()
    set({
      placements: placements.map((p) => (p.id === placementId ? { ...p, ...updates } : p)),
    })
  },

  // Set validation results
  setValidationResults: (results) => {
    set({ validationResults: results })
  },

  // Reset
  reset: () => {
    set({
      inputs: DEFAULT_INPUTS,
      radius: 6,
      zones: [],
      objects: [],
      placements: [],
      validationResults: [],
      mode: "auto",
    })
  },

  // Export layout as JSON
  exportLayout: () => {
    const { inputs, zones, objects, placements, radius } = get()
    return JSON.stringify({ inputs, zones, objects, placements, radius }, null, 2)
  },

  // Import layout from JSON
  importLayout: (json) => {
    try {
      const data = JSON.parse(json)
      set({
        inputs: data.inputs,
        zones: data.zones,
        objects: data.objects,
        placements: data.placements,
        radius: data.radius,
      })
    } catch (error) {
      console.error("Failed to import layout:", error)
    }
  },
}))
