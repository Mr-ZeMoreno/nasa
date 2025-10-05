import type { Zone } from "@/lib/types"

/**
 * Zone templates based on function requirements
 */
export const ZONE_TEMPLATES: Record<string, Omit<Zone, "id" | "cells" | "usedSlots">> = {
  sleep: {
    name: "Sleep Quarters",
    ring: "outer",
    capacitySlots: 0, // Will be calculated
    allowedTags: ["quiet", "personal", "sleep"],
    color: "#10b981",
  },
  galley: {
    name: "Galley",
    ring: "mid",
    capacitySlots: 0,
    allowedTags: ["food", "heat", "wet"],
    color: "#f59e0b",
  },
  hygiene: {
    name: "Hygiene",
    ring: "mid",
    capacitySlots: 0,
    allowedTags: ["wet", "hygiene"],
    color: "#06b6d4",
  },
  eclss: {
    name: "ECLSS",
    ring: "core",
    capacitySlots: 0,
    allowedTags: ["life_support", "critical"],
    color: "#8b5cf6",
  },
  exercise: {
    name: "Exercise",
    ring: "outer",
    capacitySlots: 0,
    allowedTags: ["noisy", "exercise"],
    color: "#ef4444",
  },
  medical: {
    name: "Medical",
    ring: "mid",
    capacitySlots: 0,
    allowedTags: ["medical", "quiet"],
    color: "#ec4899",
  },
  stowage: {
    name: "Stowage",
    ring: "mid",
    capacitySlots: 0,
    allowedTags: ["storage"],
    color: "#64748b",
  },
  command: {
    name: "Command",
    ring: "core",
    capacitySlots: 0,
    allowedTags: ["critical", "command"],
    color: "#00ffcc",
  },
}

/**
 * Create zones from selected functions
 */
export function createZones(functions: string[], radius: number): Zone[] {
  const zones: Zone[] = []

  functions.forEach((func, index) => {
    const template = ZONE_TEMPLATES[func]
    if (!template) return

    zones.push({
      id: `zone-${func}-${index}`,
      ...template,
      cells: [], // Will be populated during grid generation
      usedSlots: 0,
    })
  })

  return zones
}
