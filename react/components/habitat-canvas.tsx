"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { useHabitat } from "@/store/use-habitat"
import { axialToPixel, hexVertices, getSectorVertices, sectorToKey } from "@/lib/hex"
import type { HexCoord, Zone, HabitatObject, SectorCoord } from "@/lib/types"
import { nanoid } from "nanoid"
import { validatePlacement } from "@/rules/validate"
import { toast } from "sonner"

export function HabitatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  // three refs
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rafRef = useRef<number | null>(null)
  const initialized = useRef<boolean>(false)

  // interaction refs
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())

  const [hoveredSector, setHoveredSector] = useState<SectorCoord | null>(null)
  const [selectedObject, setSelectedObject] = useState<HabitatObject | null>(null)
  const [draggedPlacementId, setDraggedPlacementId] = useState<string | null>(null)

  const { zones, placements, objects, radius, mode, addPlacement /*, removePlacement, updatePlacement*/ } = useHabitat()

  // ---------- INIT (una sola vez, sin depender de radius) ----------
  useEffect(() => {
    if (!containerRef.current || initialized.current) return
    initialized.current = true

    const container = containerRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 8)
    cameraRef.current = camera

    // Renderer (un solo contexto)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.maxPolarAngle = Math.PI / 2
    controlsRef.current = controls

    // Resize
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !containerRef.current) return
      const w = containerRef.current.clientWidth || 800
      const h = containerRef.current.clientHeight || 600
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener("resize", handleResize)

    // Animación
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) return
      controlsRef.current.update()
      rendererRef.current.render(sceneRef.current, cameraRef.current)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    // Cleanup TOTAL
    return () => {
      window.removeEventListener("resize", handleResize)

      if (rafRef.current) cancelAnimationFrame(rafRef.current)

      if (sceneRef.current) {
        disposeAllChildren(sceneRef.current)
      }

      if (controlsRef.current) {
        controlsRef.current.dispose()
        controlsRef.current = null
      }

      if (rendererRef.current) {
        try {
          // @ts-ignore
          rendererRef.current.renderLists?.dispose?.()
        } catch {}
        rendererRef.current.dispose()
        try {
          // @ts-ignore
          rendererRef.current.forceContextLoss?.()
        } catch {}
        const canvas = rendererRef.current.domElement
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
        rendererRef.current = null
      }

      cameraRef.current = null
      sceneRef.current = null
      initialized.current = false
    }
  }, [])

  // ---------- Ajustar cámara/controles cuando cambia radius ----------
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return
    const cam = cameraRef.current
    const controls = controlsRef.current

    cam.position.set(0, 0, radius * 4)
    cam.updateProjectionMatrix()

    controls.minDistance = Math.max(1, radius * 2)
    controls.maxDistance = radius * 8
    controls.update()
  }, [radius])

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

      const sectors = scene.children.filter((child: THREE.Object3D) => child.userData.type === "sector")
      const intersects = raycaster.intersectObjects(sectors, false)

      if (intersects.length > 0) {
        const sectorCoord = intersects[0].object.userData.sector as SectorCoord
        setHoveredSector(sectorCoord)
      } else {
        setHoveredSector(null)
      }
    }

    const handleClick = (_event: MouseEvent) => {
      if (mode !== "manual" || !selectedObject || !hoveredSector) return

      // sectores ocupados
      const occupiedSectors = new Set<string>()
      placements.forEach((p) => {
        p.sectors.forEach((sector) => occupiedSectors.add(sectorToKey(sector)))
      })

      if (occupiedSectors.has(sectorToKey(hoveredSector))) {
        toast.error("Sector already occupied")
        return
      }

      // zona para esta celda
      const zone = zones.find((z) => z.cells.some((c) => c.q === hoveredSector.hex.q && c.r === hoveredSector.hex.r))
      if (!zone) {
        toast.error("No zone found for sector")
        return
      }

      // sectores contiguos para objetos multi-slot
      const sectors = findContiguousSectors(hoveredSector, selectedObject.slots, zone.cells, occupiedSectors)
      if (sectors.length < selectedObject.slots) {
        toast.error("Not enough contiguous sectors")
        return
      }

      const validation = validatePlacement(selectedObject, zone, sectors, zones, placements, objects)
      const hardErrors = validation.results.filter((r) => r.severity === "hard" && !r.ok)
      const softErrors = validation.results.filter((r) => r.severity !== "hard" && !r.ok)

      if (hardErrors.length) {
        const first = hardErrors[0]
        toast.error(first.message || "Colocación no permitida", {
          description: first.hint || "Revisa los requisitos de la zona u objeto.",
          duration: 6000,
        })
        return
      }

      if (softErrors.length) {
        const first = softErrors[0]
        toast.warning(first.message || "Advertencia de validación", {
          description: first.hint || "Puedes continuar, pero con observaciones.",
          duration: 6000,
        })
      }

      // crear placement con sectores
      const placement = {
        id: nanoid(),
        objectId: selectedObject.id,
        zoneId: zone.id,
        sectors,
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
  }, [mode, selectedObject, hoveredSector, zones, placements, objects, addPlacement])

  useEffect(() => {
    if (!sceneRef.current) return
    const scene = sceneRef.current

    removeByUserType(scene, "sector")
    removeByUserType(scene, "hexOutline")

    zones.forEach((zone) => {
      zone.cells.forEach((cell) => {
        // Render hexagon outline
        const outlineMesh = createHexagonOutline(cell, zone)
        scene.add(outlineMesh)

        // Render 6 sectors
        for (let i = 0; i < 6; i++) {
          const sectorCoord: SectorCoord = { hex: cell, sector: i }
          const isHovered = hoveredSector
            ? hoveredSector.hex.q === cell.q && hoveredSector.hex.r === cell.r && hoveredSector.sector === i
            : false
          const sectorMesh = createSectorMesh(sectorCoord, zone, isHovered)
          scene.add(sectorMesh)
        }
      })
    })
  }, [zones, hoveredSector])

  useEffect(() => {
    if (!sceneRef.current) return
    const scene = sceneRef.current

    removeByUserType(scene, "object")

    placements.forEach((placement) => {
      const object = objects.find((o) => o.id === placement.objectId)
      if (!object) return

      // Render each sector of the placement
      placement.sectors.forEach((sector, index) => {
        const objectMesh = createObjectMeshOnSector(sector, object, index === 0)
        scene.add(objectMesh)
      })
    })
  }, [placements, objects])

  // ---------- Selección de objeto desde ObjectList ----------
  useEffect(() => {
    const handleObjectSelect = (event: Event) => {
      const ce = event as CustomEvent<HabitatObject>
      setSelectedObject(ce.detail)
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
            Click on a sector to place <span className="font-semibold text-primary">{selectedObject.name}</span>
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

/* ----------------------- Helpers de limpieza ----------------------- */
function disposeObject3D(obj: THREE.Object3D) {
  // liberar geometrías/materiales y texturas
  obj.traverse((child: THREE.Object3D) => {
    const mesh = child as THREE.Mesh | THREE.LineSegments | THREE.Sprite

    // geometría
    const geom = (mesh as any).geometry as THREE.BufferGeometry | undefined
    if (geom) geom.dispose()

    // material puede ser array
    const mat = (mesh as any).material as THREE.Material | THREE.Material[] | undefined
    if (mat) {
      if (Array.isArray(mat)) {
        mat.forEach((m) => disposeMaterial(m))
      } else {
        disposeMaterial(mat)
      }
    }
  })
}

function disposeMaterial(mat: THREE.Material) {
  // texturas comunes (map, emissiveMap, alphaMap, etc.)
  const anyMat = mat as any
  const keys = [
    "map",
    "alphaMap",
    "aoMap",
    "bumpMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "lightMap",
    "metalnessMap",
    "normalMap",
    "roughnessMap",
  ]
  keys.forEach((k) => {
    const t = anyMat[k] as THREE.Texture | undefined
    if (t) t.dispose()
  })
  mat.dispose()
}

function removeByUserType(scene: THREE.Scene, type: string) {
  const toRemove = scene.children.filter((child) => child.userData?.type === type)
  toRemove.forEach((obj) => {
    disposeObject3D(obj)
    scene.remove(obj)
  })
}

function disposeAllChildren(scene: THREE.Scene) {
  // limpia TODO lo colgado de la escena
  const all = [...scene.children]
  all.forEach((obj) => {
    disposeObject3D(obj)
    scene.remove(obj)
  })
}

/* ----------------------- Render de sectores / objetos ----------------------- */

function createHexagonOutline(cell: HexCoord, zone: Zone): THREE.LineSegments {
  const HEX_SIZE = 0.9
  const pixel = axialToPixel(cell, 1)

  const vertices = hexVertices({ x: 0, y: 0 }, HEX_SIZE)
  const points: THREE.Vector3[] = []

  for (let i = 0; i < vertices.length; i++) {
    points.push(new THREE.Vector3(vertices[i].x, vertices[i].y, 0.05))
  }
  points.push(new THREE.Vector3(vertices[0].x, vertices[0].y, 0.05)) // close the loop

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0x00ffcc,
    opacity: 0.4,
    transparent: true,
    linewidth: 2,
  })

  const line = new THREE.LineSegments(geometry, material)
  line.position.set(pixel.x, pixel.y, 0)
  line.userData = { type: "hexOutline", cell, zone }

  return line
}

function createSectorMesh(sectorCoord: SectorCoord, zone: Zone, isHovered: boolean): THREE.Mesh {
  const HEX_SIZE = 0.9
  const pixel = axialToPixel(sectorCoord.hex, 1)
  const hexCenter = { x: 0, y: 0 }

  // Get the 3 vertices of the triangular sector
  const sectorVerts = getSectorVertices(hexCenter, hexCenter, HEX_SIZE, sectorCoord.sector)

  // Create triangle shape
  const shape = new THREE.Shape()
  shape.moveTo(sectorVerts[0].x, sectorVerts[0].y)
  shape.lineTo(sectorVerts[1].x, sectorVerts[1].y)
  shape.lineTo(sectorVerts[2].x, sectorVerts[2].y)
  shape.closePath()

  // Extrude geometry
  const extrudeSettings = {
    depth: 0.08,
    bevelEnabled: false,
  }
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

  // Material with zone color
  const color = new THREE.Color(zone.color)
  const material = new THREE.MeshPhongMaterial({
    color: color,
    transparent: true,
    opacity: isHovered ? 0.8 : 0.4,
    side: THREE.DoubleSide,
    emissive: isHovered ? new THREE.Color(0x00ffcc) : new THREE.Color(0x000000),
    emissiveIntensity: isHovered ? 0.4 : 0,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(pixel.x, pixel.y, 0)
  mesh.userData = { type: "sector", sector: sectorCoord, zone }

  // Edge outline for sector
  const edges = new THREE.EdgesGeometry(geometry)
  const lineMaterial = new THREE.LineBasicMaterial({
    color: isHovered ? 0x00ffcc : 0x00ffcc,
    opacity: isHovered ? 0.9 : 0.2,
    transparent: true,
  })
  const line = new THREE.LineSegments(edges, lineMaterial)
  mesh.add(line)

  return mesh
}

function createObjectMeshOnSector(sectorCoord: SectorCoord, object: HabitatObject, showLabel: boolean): THREE.Mesh {
  const HEX_SIZE = 0.85
  const pixel = axialToPixel(sectorCoord.hex, 1)
  const hexCenter = { x: 0, y: 0 }

  // Get the 3 vertices of the triangular sector (slightly smaller)
  const sectorVerts = getSectorVertices(hexCenter, hexCenter, HEX_SIZE, sectorCoord.sector)

  // Create triangle shape
  const shape = new THREE.Shape()
  shape.moveTo(sectorVerts[0].x, sectorVerts[0].y)
  shape.lineTo(sectorVerts[1].x, sectorVerts[1].y)
  shape.lineTo(sectorVerts[2].x, sectorVerts[2].y)
  shape.closePath()

  const extrudeSettings = {
    depth: 0.25,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  }
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

  const material = new THREE.MeshPhongMaterial({
    color: 0x00ffcc,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.3,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(pixel.x, pixel.y, 0.12)
  mesh.userData = { type: "object", sector: sectorCoord, objectName: object.name }

  if (showLabel) {
    const label = getObjectLabel(object.name)
    const sprite = createTextSprite(label)

    // Position label at centroid of triangle
    const centroidX = (sectorVerts[0].x + sectorVerts[1].x + sectorVerts[2].x) / 3
    const centroidY = (sectorVerts[0].y + sectorVerts[1].y + sectorVerts[2].y) / 3
    sprite.position.set(centroidX, centroidY, 0.4)
    sprite.scale.set(1.0, 0.5, 1)
    mesh.add(sprite)
  }

  return mesh
}

function createTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!

  // tamaño canvas
  canvas.width = 256
  canvas.height = 128

  // estilo
  context.font = "bold 48px Arial"
  context.fillStyle = "#ffffff"
  context.textAlign = "center"
  context.textBaseline = "middle"

  // sombra
  context.shadowColor = "rgba(0, 0, 0, 0.8)"
  context.shadowBlur = 8
  context.shadowOffsetX = 2
  context.shadowOffsetY = 2
  context.fillText(text, canvas.width / 2, canvas.height / 2)

  // textura
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })

  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(1.5, 0.75, 1)

  return sprite
}

function getObjectLabel(name: string): string {
  const labelMap: Record<string, string> = {
    "Sleep Pod": "SLEEP",
    "Galley Unit": "GALLEY",
    "Hygiene Station": "HYGIENE",
    "ECLSS Rack": "ECLSS",
    "Exercise Equipment": "EXERCISE",
    "Medical Bay": "MEDICAL",
    "Stowage Rack": "STORAGE",
    "Command Console": "COMMAND",
  }

  return labelMap[name] || name.toUpperCase().substring(0, 6)
}

function findContiguousSectors(
  startSector: SectorCoord,
  count: number,
  availableCells: HexCoord[],
  occupiedSectors: Set<string>,
): SectorCoord[] {
  const result: SectorCoord[] = [startSector]
  const visited = new Set<string>([sectorToKey(startSector)])
  const queue: SectorCoord[] = [startSector]

  while (queue.length > 0 && result.length < count) {
    const current = queue.shift()!

    // Get adjacent sectors (within same hex and neighboring hexes)
    const adjacentSectors = getAdjacentSectors(current, availableCells)

    for (const neighbor of adjacentSectors) {
      const key = sectorToKey(neighbor)

      if (!visited.has(key) && !occupiedSectors.has(key)) {
        result.push(neighbor)
        visited.add(key)
        queue.push(neighbor)

        if (result.length >= count) break
      }
    }
  }

  return result
}

function getAdjacentSectors(sector: SectorCoord, availableCells: HexCoord[]): SectorCoord[] {
  const adjacent: SectorCoord[] = []

  // Adjacent sectors in same hexagon
  const prevSector = (sector.sector + 5) % 6
  const nextSector = (sector.sector + 1) % 6
  adjacent.push({ hex: sector.hex, sector: prevSector })
  adjacent.push({ hex: sector.hex, sector: nextSector })

  // Adjacent sectors in neighboring hexagons
  const neighbors = [
    { q: sector.hex.q + 1, r: sector.hex.r },
    { q: sector.hex.q + 1, r: sector.hex.r - 1 },
    { q: sector.hex.q, r: sector.hex.r - 1 },
    { q: sector.hex.q - 1, r: sector.hex.r },
    { q: sector.hex.q - 1, r: sector.hex.r + 1 },
    { q: sector.hex.q, r: sector.hex.r + 1 },
  ]

  neighbors.forEach((neighborHex, direction) => {
    const isAvailable = availableCells.some((cell) => cell.q === neighborHex.q && cell.r === neighborHex.r)
    if (isAvailable) {
      // The opposite sector in the neighboring hex shares an edge
      const oppositeSector = (sector.sector + 3) % 6
      adjacent.push({ hex: neighborHex, sector: oppositeSector })
    }
  })

  return adjacent
}
