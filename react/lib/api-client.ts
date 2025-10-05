// API client for backend integration

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"

export interface FormularioRequest {
  crew: number
  duration_days: number
  functions: string[]
}

export interface FormularioComplete {
  nombre: string
  habitat: "luna" | "marte" // Must be enum: luna or marte
  tripulantes: number
  tipo_geometria: "cilindro" | "domo" // Must be enum: cilindro or domo
  geometria: Record<string, any> // Must be object, not string
  prioridad: string[] // Must be array
  mantenimiento: boolean // Must be boolean
  soporte_vital: boolean // Must be boolean
  notas: string
}

export interface RoomResponse {
  id: string
  floor: number[][]
  zones: any[]
  objects: any[]
  placements: any[]
}

/**
 * Call the /rooms/ POST endpoint to generate habitat floor plan
 */
export async function generateFloorPlan(data: FormularioRequest): Promise<RoomResponse> {
  const url = `${API_BASE}/rooms/`

  const payload: FormularioComplete = {
    nombre: `Habitat-${Date.now()}`,
    habitat: "luna",
    tripulantes: data.crew,
    tipo_geometria: "domo",
    geometria: {
      cilindro: {
        radio: 5.0,
        altura: 10.0,
        longitud: 15.0,
        diametro: 10.0,
      },
      domo: {
        radio: 5.0,
        altura: 8.0,
        diametro: 10.0,
      },
    },
    prioridad: ["standard"],
    mantenimiento: true,
    soporte_vital: true,
    notas: `Generated for ${data.crew} crew, ${data.duration_days} days, functions: ${data.functions.join(", ")}`,
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "<no body>")
    throw new Error(`HTTP ${response.status} - ${text}`)
  }

  return response.json()
}

/**
 * Get room data by ID
 */
export async function getRoomData(id: string): Promise<RoomResponse> {
  const url = `${API_BASE}/rooms/${id}`

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "<no body>")
    throw new Error(`HTTP ${response.status} - ${text}`)
  }

  return response.json()
}
