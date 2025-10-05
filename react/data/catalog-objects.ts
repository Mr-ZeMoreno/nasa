import type { HabitatObject } from "@/lib/types"

const API = "http://localhost:8000/habitat/objects"

export const getObjectsForFunctions = async (
  functions: string[],
  crew: number
): Promise<HabitatObject[]> => {
  try {
    // Construir query string
    const params = new URLSearchParams()
    functions.forEach(f => params.append("functions", f))
    params.append("crew", crew.toString())

    const response = await fetch(`${API}?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: HabitatObject[] = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching catalog:", error)
    return []
  }
}
