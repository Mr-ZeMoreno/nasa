"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { useHabitat } from "@/store/use-habitat"
import { axialToPixel, hexVertices, hexToKey } from "@/lib/hex"
import type { HexCoord, Zone, HabitatObject } from "@/lib/types"
import { nanoid } from "nanoid"
import { validatePlacement } from "@/rules/validate"

export function HabitatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())

  const [hoveredCell, setHoveredCell] = useState<HexCoord | null>(null)
  const [selectedObject, setSelectedObject] = useState<HabitatObject | null>(null)
  const [draggedPlacementId, setDraggedPlacementId] = useState<string | null>(null)

  const { zones, placements, objects, radius, mode, addPlacement, removePlacement, updatePlacement } = useHabitat()

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, radius * 4)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = radius * 2
    controls.maxDistance = radius * 8
    controls.maxPolarAngle = Math.PI / 2
    controlsRef.current = controls

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }
    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [radius])

  // Handle mouse move for hover and drag
  useEffect(() => {
    if (!containerRef.current || !sceneRef.current || !cameraRef.current) return

    const container = containerRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    const raycaster = raycasterRef.current
    const mouse = mouseRef.current

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      const hexagons = scene.children.filter((child) => child.userData.type === "hexagon")
      const intersects = raycaster.intersectObjects(hexagons, false)

      if (intersects.length > 0) {
        const cell = intersects[0].object.userData.cell as HexCoord
        setHoveredCell(cell)
      } else {
        setHoveredCell(null)
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (mode !== "manual" || !selectedObject || !hoveredCell) return

      // Check if cell is already occupied
      const occupiedCells = new Set<string>()
      placements.forEach((p) => {
        p.cells.forEach((cell) => occupiedCells.add(hexToKey(cell)))
      })

      if (occupiedCells.has(hexToKey(hoveredCell))) {
        console.log("Cell already occupied")
        return
      }

      // Find zone for this cell
      const zone = zones.find((z) => z.cells.some((c) => c.q === hoveredCell.q && c.r === hoveredCell.r))

      if (!zone) {
        console.log("No zone found for cell")
        return
      }

      // For multi-cell objects, find contiguous cells
      const cells = findContiguousCells(hoveredCell, selectedObject.slots, zone.cells, occupiedCells)

      if (cells.length < selectedObject.slots) {
        console.log("Not enough contiguous cells")
        return
      }

      // Validate placement
      const validation = validatePlacement(selectedObject, zone, cells, zones, placements, objects)

      const hasHardFailure = validation.results.some((r) => r.severity === "hard" && !r.ok)

      if (hasHardFailure) {
        console.log("Validation failed:", validation.results)
        return
      }

      // Create placement
      const placement = {
        id: nanoid(),
        objectId: selectedObject.id,
        zoneId: zone.id,
        cells,
      }

      addPlacement(placement)
      setSelectedObject(null)
    }

    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("click", handleClick)

    return () => {
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("click", handleClick)
    }
  }, [mode, selectedObject, hoveredCell, zones, placements, objects, addPlacement])

  // Render hexagonal grid
  useEffect(() => {
    if (!sceneRef.current) return

    const scene = sceneRef.current

    // Clear previous hexagons
    const hexagons = scene.children.filter((child) => child.userData.type === "hexagon")
    hexagons.forEach((hex) => scene.remove(hex))

    // Render zones
    zones.forEach((zone) => {
      zone.cells.forEach((cell) => {
        const isHovered = hoveredCell && cell.q === hoveredCell.q && cell.r === hoveredCell.r
        const hexMesh = createHexagonMesh(cell, zone, isHovered)
        scene.add(hexMesh)
      })
    })
  }, [zones, hoveredCell])

  // Render placements
  useEffect(() => {
    if (!sceneRef.current) return

    const scene = sceneRef.current

    // Clear previous objects
    const objectMeshes = scene.children.filter((child) => child.userData.type === "object")
    objectMeshes.forEach((obj) => scene.remove(obj))

    // Render placed objects
    placements.forEach((placement) => {
      const object = objects.find((o) => o.id === placement.objectId)
      if (!object) return

      placement.cells.forEach((cell, index) => {
        const objectMesh = createObjectMesh(cell, object.name, index === 0)
        scene.add(objectMesh)
      })
    })
  }, [placements, objects])

  // Listen for object selection from ObjectList
  useEffect(() => {
    const handleObjectSelect = (event: CustomEvent) => {
      setSelectedObject(event.detail)
    }

    window.addEventListener("select-object" as any, handleObjectSelect)

    return () => {
      window.removeEventListener("select-object" as any, handleObjectSelect)
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {mode === "manual" && selectedObject && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur border border-border rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-foreground">
            Click on a cell to place <span className="font-semibold text-primary">{selectedObject.name}</span>
          </p>
          <button
            onClick={() => setSelectedObject(null)}
            className="text-xs text-muted-foreground hover:text-foreground mt-1"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// Create hexagon mesh for a cell
function createHexagonMesh(cell: HexCoord, zone: Zone, isHovered: boolean): THREE.Mesh {
  const HEX_SIZE = 0.9
  const pixel = axialToPixel(cell, 1)

  // Create hexagon shape
  const shape = new THREE.Shape()
  const vertices = hexVertices({ x: 0, y: 0 }, HEX_SIZE)

  shape.moveTo(vertices[0].x, vertices[0].y)
  for (let i = 1; i < vertices.length; i++) {
    shape.lineTo(vertices[i].x, vertices[i].y)
  }
  shape.closePath()

  // Extrude geometry
  const extrudeSettings = {
    depth: 0.1,
    bevelEnabled: false,
  }
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

  // Material with zone color
  const color = new THREE.Color(zone.color)
  const material = new THREE.MeshPhongMaterial({
    color: color,
    transparent: true,
    opacity: isHovered ? 0.9 : 0.6,
    side: THREE.DoubleSide,
    emissive: isHovered ? new THREE.Color(0x00ffcc) : new THREE.Color(0x000000),
    emissiveIntensity: isHovered ? 0.3 : 0,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(pixel.x, pixel.y, 0)
  mesh.userData = { type: "hexagon", cell, zone }

  // Add edge outline
  const edges = new THREE.EdgesGeometry(geometry)
  const lineMaterial = new THREE.LineBasicMaterial({
    color: isHovered ? 0x00ffcc : 0x00ffcc,
    opacity: isHovered ? 0.8 : 0.3,
    transparent: true,
  })
  const line = new THREE.LineSegments(edges, lineMaterial)
  mesh.add(line)

  return mesh
}

// Create object mesh for placed objects
function createObjectMesh(cell: HexCoord, objectName: string, showLabel: boolean): THREE.Mesh {
  const HEX_SIZE = 0.8
  const pixel = axialToPixel(cell, 1)

  // Create smaller hexagon for object
  const shape = new THREE.Shape()
  const vertices = hexVertices({ x: 0, y: 0 }, HEX_SIZE)

  shape.moveTo(vertices[0].x, vertices[0].y)
  for (let i = 1; i < vertices.length; i++) {
    shape.lineTo(vertices[i].x, vertices[i].y)
  }
  shape.closePath()

  const extrudeSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
  }
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

  const material = new THREE.MeshPhongMaterial({
    color: 0x00ffcc,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.2,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(pixel.x, pixel.y, 0.15)
  mesh.userData = { type: "object", cell, objectName }

  return mesh
}

// Find contiguous cells starting from a seed cell
function findContiguousCells(
  startCell: HexCoord,
  count: number,
  availableCells: HexCoord[],
  occupiedCells: Set<string>,
): HexCoord[] {
  const result: HexCoord[] = [startCell]
  const visited = new Set<string>([hexToKey(startCell)])

  const queue: HexCoord[] = [startCell]

  while (queue.length > 0 && result.length < count) {
    const current = queue.shift()!

    // Get neighbors
    const neighbors = [
      { q: current.q + 1, r: current.r },
      { q: current.q + 1, r: current.r - 1 },
      { q: current.q, r: current.r - 1 },
      { q: current.q - 1, r: current.r },
      { q: current.q - 1, r: current.r + 1 },
      { q: current.q, r: current.r + 1 },
    ]

    for (const neighbor of neighbors) {
      const key = hexToKey(neighbor)

      if (!visited.has(key) && !occupiedCells.has(key)) {
        // Check if neighbor is in available cells
        const isAvailable = availableCells.some((cell) => cell.q === neighbor.q && cell.r === neighbor.r)

        if (isAvailable) {
          result.push(neighbor)
          visited.add(key)
          queue.push(neighbor)

          if (result.length >= count) break
        }
      }
    }
  }

  return result
}
