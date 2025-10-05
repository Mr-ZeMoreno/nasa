"use client"

import { useEffect, useRef, useState } from "react"
import { useHabitat } from "@/store/use-habitat"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { axialToPixel, getHexVertices, getSectorTriangleVertices, sectorToKey } from "@/lib/hex"
import type { HexCoord, SectorCoord } from "@/lib/types"
import { toast } from "sonner"

function createTextSprite(text: string, color = "#ffffff"): THREE.Sprite {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!

  canvas.width = 512
  canvas.height = 128

  

  context.font = "bold 32px Arial"
  context.fillStyle = color
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture })
  const sprite = new THREE.Sprite(material)

  sprite.scale.set(3, 0.75, 1)

  return sprite
}

function getTriangleCentroid(vertices: { x: number; y: number }[]): { x: number; y: number } {
  return {
    x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
    y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3,
  }
}

export function HabitatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rafRef = useRef<number | null>(null)
  const floorGroupRef = useRef<THREE.Group | null>(null)
  const sectorMeshesRef = useRef<THREE.Mesh[]>([])

  const { zones, placements, objects, mode, floorMatrix, addPlacement } = useHabitat()
  const [hoveredSector, setHoveredSector] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<any>(null)

  const hexRadius = 1.5
  const hexSpacing = (hexRadius * Math.sqrt(3)) / 1.75

  useEffect(() => {
    const handleSelectObject = (event: any) => {
      const object = event.detail
      setSelectedObject(object)
      toast.info(`Selected: ${object.name}. Click on ${object.slots} sector(s) to place it.`)
    }

    window.addEventListener("select-object", handleSelectObject)
    return () => {
      window.removeEventListener("select-object", handleSelectObject)
    }
  }, [])

  useEffect(() => {
    if (mode === "auto") {
      setSelectedObject(null)
    }
  }, [mode])

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, -20, 40)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)

    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5)
    scene.add(hemisphere)

    const directional1 = new THREE.DirectionalLight(0xffffff, 0.8)
    directional1.position.set(10, 15, 10)
    directional1.castShadow = true
    directional1.shadow.mapSize.width = 2048
    directional1.shadow.mapSize.height = 2048
    directional1.shadow.camera.near = 0.5
    directional1.shadow.camera.far = 500
    directional1.shadow.camera.left = -50
    directional1.shadow.camera.right = 50
    directional1.shadow.camera.top = 50
    directional1.shadow.camera.bottom = -50
    scene.add(directional1)

    const directional2 = new THREE.DirectionalLight(0x4a9eff, 0.3)
    directional2.position.set(-10, 10, -10)
    scene.add(directional2)

    const floorGroup = new THREE.Group()
    floorGroup.name = "floorGroup"
    scene.add(floorGroup)
    floorGroupRef.current = floorGroup

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 10
    controls.maxDistance = 100
    controls.maxPolarAngle = Math.PI / 2.2
    controls.minPolarAngle = 0
    controlsRef.current = controls

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !containerRef.current) return
      const w = containerRef.current.clientWidth || 800
      const h = containerRef.current.clientHeight || 600
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener("resize", handleResize)

    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)

      if (floorGroupRef.current) {
        while (floorGroupRef.current.children.length) {
          const obj = floorGroupRef.current.children.pop()!
          ;(obj as any).geometry?.dispose?.()
          const m = (obj as any).material
          if (Array.isArray(m)) m.forEach((mm: any) => mm?.dispose?.())
          else m?.dispose?.()
        }
      }

      if (rendererRef.current) {
        const canvas = rendererRef.current.domElement
        canvas?.parentElement?.removeChild(canvas)
      }
      rendererRef.current?.dispose()
      sceneRef.current = null
      rendererRef.current = null
      cameraRef.current = null
      controlsRef.current = null
    }
  }, [])

  useEffect(() => {
    const renderer = rendererRef.current
    const camera = cameraRef.current
    const scene = sceneRef.current

    if (!renderer || !camera || !scene || mode !== "manual") {
      return
    }

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handleMouseMove = (event: MouseEvent) => {
      if (!selectedObject) return

      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(sectorMeshesRef.current, false)

      if (intersects.length > 0) {
        const intersected = intersects[0].object as THREE.Mesh
        const userData = intersected.userData

        if (userData.sectorKey && !userData.isOccupied) {
          if (hoveredSector !== userData.sectorKey) {
            if (hoveredSector) {
              const prevMesh = sectorMeshesRef.current.find((m) => m.userData.sectorKey === hoveredSector)
              if (prevMesh && prevMesh.material instanceof THREE.MeshStandardMaterial) {
                prevMesh.material.emissive.setHex(0x000000)
              }
            }

            setHoveredSector(userData.sectorKey)
            if (intersected.material instanceof THREE.MeshStandardMaterial) {
              intersected.material.emissive.setHex(0x4a9eff)
              intersected.material.emissiveIntensity = 0.3
            }
          }
          renderer.domElement.style.cursor = "pointer"
        } else {
          renderer.domElement.style.cursor = "not-allowed"
        }
      } else {
        if (hoveredSector) {
          const prevMesh = sectorMeshesRef.current.find((m) => m.userData.sectorKey === hoveredSector)
          if (prevMesh && prevMesh.material instanceof THREE.MeshStandardMaterial) {
            prevMesh.material.emissive.setHex(0x000000)
          }
          setHoveredSector(null)
        }
        renderer.domElement.style.cursor = "default"
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (!selectedObject) {
        toast.warning("Please select an object to place first")
        return
      }

      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(sectorMeshesRef.current, false)

      if (intersects.length > 0) {
        const intersected = intersects[0].object
        const userData = intersected.userData

        if (userData.sectorCoord && !userData.isOccupied) {
          const sectorCoord: SectorCoord = userData.sectorCoord

          const zone = zones.find((z) =>
            z.cells.some((cell: HexCoord) => cell.q === sectorCoord.hex.q && cell.r === sectorCoord.hex.r),
          )

          if (zone) {
            const placement = {
              id: `placement-${Date.now()}`,
              objectId: selectedObject.id,
              zoneId: zone.id,
              sectors: [sectorCoord],
            }

            addPlacement(placement)
            toast.success(`Placed ${selectedObject.name}`)
            setSelectedObject(null)
            setHoveredSector(null)
          } else {
            toast.error("Cannot place object: sector not in any zone")
          }
        } else if (userData.isOccupied) {
          toast.warning("This sector is already occupied")
        }
      }
    }

    renderer.domElement.addEventListener("mousemove", handleMouseMove)
    renderer.domElement.addEventListener("click", handleClick)

    return () => {
      renderer.domElement.removeEventListener("mousemove", handleMouseMove)
      renderer.domElement.removeEventListener("click", handleClick)
      renderer.domElement.style.cursor = "default"
    }
  }, [mode, selectedObject, zones, addPlacement, hoveredSector])

  useEffect(() => {
    const scene = sceneRef.current
    const floorGroup = floorGroupRef.current
    if (!scene || !floorGroup) return

    while (floorGroup.children.length) {
      const obj = floorGroup.children.pop()!
      ;(obj as any).geometry?.dispose?.()
      const m = (obj as any).material
      if (Array.isArray(m)) m.forEach((mm: any) => mm?.dispose?.())
      else m?.dispose?.()
    }
    sectorMeshesRef.current = []

    if (!zones || zones.length === 0) return

    const occupiedSectors = new Map<string, string>()
    placements.forEach((placement) => {
      placement.sectors.forEach((sector) => {
        occupiedSectors.set(sectorToKey(sector), placement.objectId)
      })
    })

    zones.forEach((zone) => {
      zone.cells.forEach((cell: HexCoord) => {
        const center = axialToPixel(cell, hexSpacing)
        const hexVerts = getHexVertices(center, hexRadius)

        const hexShape = new THREE.Shape()
        hexShape.moveTo(hexVerts[0].x, hexVerts[0].y)
        for (let i = 1; i < hexVerts.length; i++) {
          hexShape.lineTo(hexVerts[i].x, hexVerts[i].y)
        }
        hexShape.closePath()

        const extrudeSettings = {
          depth: 0.2,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.05,
          bevelSegments: 2,
        }

        const baseGeometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings)
        const baseMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(zone.color || "#c0c7d1ff").multiplyScalar(0.2),
          roughness: 0.8,
          metalness: 0.3,
        })
        const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial)
        baseMesh.position.z = -0.2
        baseMesh.castShadow = true
        baseMesh.receiveShadow = true
        floorGroup.add(baseMesh)

        const outlinePoints: THREE.Vector3[] = []
        hexVerts.forEach((v) => {
          outlinePoints.push(new THREE.Vector3(v.x, v.y, 0.3))
        })
        outlinePoints.push(new THREE.Vector3(hexVerts[0].x, hexVerts[0].y, 0.3))

        const outlineGeom = new THREE.BufferGeometry().setFromPoints(outlinePoints)
        const outlineMat = new THREE.LineBasicMaterial({ color: 0x4a9eff, linewidth: 2 })
        const outlineMesh = new THREE.Line(outlineGeom, outlineMat)
        floorGroup.add(outlineMesh)

        for (let sectorIdx = 0; sectorIdx < 6; sectorIdx++) {
          const sectorCoord: SectorCoord = { hex: cell, sector: sectorIdx }
          const sectorKey = sectorToKey(sectorCoord)
          const isOccupied = occupiedSectors.has(sectorKey)
          const objectId = occupiedSectors.get(sectorKey)

          const triangleVerts = getSectorTriangleVertices(center, hexRadius, sectorIdx)

          const triangleShape = new THREE.Shape()
          triangleShape.moveTo(triangleVerts[0].x, triangleVerts[0].y)
          triangleShape.lineTo(triangleVerts[1].x, triangleVerts[1].y)
          triangleShape.lineTo(triangleVerts[2].x, triangleVerts[2].y)
          triangleShape.closePath()

          const sectorExtrudeSettings = {
            depth: isOccupied ? 0.8 : 0.1,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 1,
          }

          const geometry = new THREE.ExtrudeGeometry(triangleShape, sectorExtrudeSettings)

          let color = new THREE.Color(zone.color || "#3a7bd5")
          if (isOccupied) {
            const obj = objects.find((o) => o.id === objectId)
            if (obj) {
              const tag = obj.tags?.[0] || "default"
              const tagColors: Record<string, number> = {
                sleep: 0x6b5b95,
                galley: 0xf39c12,
                hygiene: 0x3498db,
                eclss: 0x2ecc71,
                exercise: 0xe74c3c,
                medical: 0xe67e22,
                stowage: 0x95a5a6,
                command: 0x9b59b6,
              }
              color = new THREE.Color(tagColors[tag] || 0x7f8c8d)
            }
          } else {
            color.multiplyScalar(0.3)
          }

          const material = new THREE.MeshStandardMaterial({
            color,
            roughness: isOccupied ? 0.5 : 0.7,
            metalness: isOccupied ? 0.4 : 0.2,
            side: THREE.FrontSide,
            transparent: !isOccupied,
            opacity: isOccupied ? 1.0 : 0.5,
            emissive: color,
            emissiveIntensity: isOccupied ? 0.1 : 0,
          })

          const mesh = new THREE.Mesh(geometry, material)
          mesh.position.z = 0
          mesh.castShadow = true
          mesh.receiveShadow = true
          mesh.userData = { sectorKey, sectorCoord, isOccupied, objectId }
          floorGroup.add(mesh)
          sectorMeshesRef.current.push(mesh)

          if (isOccupied && objectId) {
            const obj = objects.find((o) => o.id === objectId)
            if (obj) {
              const centroid = getTriangleCentroid(triangleVerts)
              const sprite = createTextSprite(obj.name, "#ffffff")
              sprite.position.set(centroid.x, centroid.y, 1.2)
              floorGroup.add(sprite)
            }
          }

          const centerVec = new THREE.Vector3(center.x, center.y, 0.05)
          const vertexVec = new THREE.Vector3(hexVerts[sectorIdx].x, hexVerts[sectorIdx].y, 0.05)
          const lineGeom = new THREE.BufferGeometry().setFromPoints([centerVec, vertexVec])
          const lineMat = new THREE.LineBasicMaterial({ color: 0x2a2a2a, linewidth: 1 })
          const line = new THREE.Line(lineGeom, lineMat)
          floorGroup.add(line)
        }
      })
    })
  }, [zones, placements, objects, hexRadius])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {mode === "manual" && (
        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur p-4 rounded-lg border border-border">
          
          {selectedObject && (
            <p className="text-xs text-primary mt-2 font-medium">
              Selected: {selectedObject.name} ({selectedObject.slots}{" "}
              {selectedObject.slots === 1 ? "sector" : "sectors"})
            </p>
          )}
        </div>
      )}
    </div>
  )
}
