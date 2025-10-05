// Core data types for the habitat system

export type RingType = "core" | "mid" | "outer"

export type Severity = "hard" | "soft"

export interface HexCoord {
  q: number // axial coordinate
  r: number // axial coordinate
}

export interface SectorCoord {
  hex: HexCoord // parent hexagon
  sector: number // sector index 0-5 (clockwise from top)
}

export interface PixelCoord {
  x: number
  y: number
}

export interface Zone {
  id: string
  name: string
  ring: RingType
  capacitySlots: number
  usedSlots: number
  allowedTags: string[]
  cells: HexCoord[]
  color: string
}

export interface HabitatObject {
  id: string
  name: string
  slots: number
  tags: string[]
  priority: number
  description?: string
}

export interface Placement {
  id: string
  objectId: string
  zoneId: string
  sectors: SectorCoord[] // changed from cells: HexCoord[]
}

export interface RuleResult {
  rule: string
  ok: boolean
  severity: Severity
  message: string
  hint?: string
}

export interface ValidationResult {
  ok: boolean
  results: RuleResult[]
}

export interface HabitatInputs {
  crew: number
  durationDays: number
  functions: string[]
}

export interface HabitatState {
  inputs: HabitatInputs
  radius: number
  zones: Zone[]
  objects: HabitatObject[]
  placements: Placement[]
  mode: "auto" | "manual"
}
