"use client"

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useHabitat } from "@/store/use-habitat";
import { axialToPixel, hexVertices, hexToKey } from "@/lib/hex";
import type { HexCoord, Zone, HabitatObject } from "@/lib/types";
import { nanoid } from "nanoid";
import { validatePlacement } from "@/rules/validate";
import { toast } from "sonner";

export function HabitatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  // three refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number | null>(null);
  const initialized = useRef<boolean>(false);

  // interaction refs
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const [hoveredCell, setHoveredCell] = useState<HexCoord | null>(null);
  const [selectedObject, setSelectedObject] = useState<HabitatObject | null>(null);
  const [draggedPlacementId, setDraggedPlacementId] = useState<string | null>(null);

  const { zones, placements, objects, radius, mode, addPlacement/*, removePlacement, updatePlacement*/ } = useHabitat();

  // ---------- INIT ----------
  useEffect(() => {
    if (!containerRef.current || initialized.current) return
    initialized.current = true

    const container = containerRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8); // posición inicial; luego la ajustamos con radius en efecto aparte
    cameraRef.current = camera;

    // Renderer (un solo contexto)
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !containerRef.current) return
      const w = containerRef.current.clientWidth || 800
      const h = containerRef.current.clientHeight || 600
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener("resize", handleResize)

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) return
      controlsRef.current.update()
      rendererRef.current.render(sceneRef.current, cameraRef.current)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", handleResize);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // limpiar escena (geometrías, materiales, texturas)
      if (sceneRef.current) {
        disposeAllChildren(sceneRef.current);
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      if (rendererRef.current) {
        try {
          // @ts-ignore
          rendererRef.current.renderLists?.dispose?.();
        } catch {}
        rendererRef.current.dispose();
        // perder el contexto WebGL explícitamente
        try {
          // @ts-ignore
          rendererRef.current.forceContextLoss?.();
        } catch {}
        const canvas = rendererRef.current.domElement;
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        rendererRef.current = null;
      }

      cameraRef.current = null;
      sceneRef.current = null;
      initialized.current = false;
    };
  }, []);

  // ---------- Ajustar cámara/controles cuando cambia radius (sin recrear renderer) ----------
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const controls = controlsRef.current;

    // distancia recomendada según el tamaño del grid
    cam.position.set(0, 0, radius * 4);
    cam.updateProjectionMatrix();

    controls.minDistance = Math.max(1, radius * 2);
    controls.maxDistance = radius * 8;
    controls.update();
  }, [radius]);

  // ---------- Hover / Click ----------
  useEffect(() => {
    if (!containerRef.current || !sceneRef.current || !cameraRef.current) return

    const container = containerRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    const raycaster = raycasterRef.current
    const mouse = mouseRef.current

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const hexagons = scene.children.filter((child: THREE.Object3D) => child.userData.type === "hexagon");
      const intersects = raycaster.intersectObjects(hexagons, false);

      if (intersects.length > 0) {
        const cell = intersects[0].object.userData.cell as HexCoord;
        setHoveredCell(cell);
      } else {
        setHoveredCell(null);
      }
    };

    const handleClick = (_event: MouseEvent) => {
      if (mode !== "manual" || !selectedObject || !hoveredSector) return

      // celdas ocupadas
      const occupiedCells = new Set<string>();
      placements.forEach((p) => {
        p.cells.forEach((cell) => occupiedCells.add(hexToKey(cell)));
      });

      if (occupiedCells.has(hexToKey(hoveredCell))) {
        console.log("Cell already occupied");
        return;
      }

      // zona para esta celda
      const zone = zones.find((z) => z.cells.some((c) => c.q === hoveredCell.q && c.r === hoveredCell.r));
      if (!zone) {
        console.log("No zone found for cell");
        return;
      }

      // celdas contiguas para objetos multi-slot
      const cells = findContiguousCells(hoveredCell, selectedObject.slots, zone.cells, occupiedCells);
      if (cells.length < selectedObject.slots) {
        console.log("Not enough contiguous cells");
        return;
      }

          // validación
    const validation = validatePlacement(selectedObject, zone, cells, zones, placements, objects);
    const hardErrors = validation.results.filter((r) => r.severity === "hard" && !r.ok);
    const softErrors = validation.results.filter((r) => r.severity !== "hard" && !r.ok);

    if (hardErrors.length) {
      // Muestra el primer error "hard" con detalle
      const first = hardErrors[0];
      toast.error(first.message || "Colocación no permitida", {
        description: first.hint || "Revisa los requisitos de la zona u objeto.",
        duration: 6000,
      });
      return;
    }

// Opcional: avisar con warning si hay errores no críticos
if (softErrors.length) {
  const first = softErrors[0];
  toast.warning(first.message || "Advertencia de validación", {
    description: first.hint || "Puedes continuar, pero con observaciones.",
    duration: 6000,
  });
}

      // crear placement
      const placement = {
        id: nanoid(),
        objectId: selectedObject.id,
        zoneId: zone.id,
        cells,
      };

      addPlacement(placement);
      setSelectedObject(null);
    };

    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("click", handleClick)

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
    };
  }, [mode, selectedObject, hoveredCell, zones, placements, objects, addPlacement]);

  // ---------- Render grid (zonas) ----------
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // quitar y liberar anteriores hexágonos
    removeByUserType(scene, "hexagon");

    // render zonas
    zones.forEach((zone) => {
      zone.cells.forEach((cell) => {
        const isHovered = hoveredCell ? cell.q === hoveredCell.q && cell.r === hoveredCell.r : false;
        const hexMesh = createHexagonMesh(cell, zone, isHovered);
        scene.add(hexMesh);
      });
    });
  }, [zones, hoveredCell]);

  // ---------- Render placements ----------
  useEffect(() => {
    if (!sceneRef.current) return
    const scene = sceneRef.current

    // quitar y liberar anteriores objetos
    removeByUserType(scene, "object");

    placements.forEach((placement) => {
      const object = objects.find((o) => o.id === placement.objectId);
      if (!object) return;

      placement.cells.forEach((cell, index) => {
        const objectMesh = createObjectMesh(cell, object, index === 0);
        scene.add(objectMesh);
      });
    });
  }, [placements, objects]);

  // ---------- Selección de objeto desde ObjectList ----------
  useEffect(() => {
    const handleObjectSelect = (event: Event) => {
      const ce = event as CustomEvent<HabitatObject>;
      setSelectedObject(ce.detail);
    };

    window.addEventListener("select-object" as any, handleObjectSelect);
    return () => {
      window.removeEventListener("select-object" as any, handleObjectSelect);
    };
  }, []);

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
  );
}

/* ----------------------- Helpers de limpieza ----------------------- */
function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child: THREE.Object3D) => {
    const mesh = child as THREE.Mesh | THREE.LineSegments | THREE.Sprite;

    // geometría
    const geom = (mesh as any).geometry as THREE.BufferGeometry | undefined;
    if (geom) geom.dispose();

    // material puede ser array
    const mat = (mesh as any).material as THREE.Material | THREE.Material[] | undefined;
    if (mat) {
      if (Array.isArray(mat)) {
        mat.forEach((m) => disposeMaterial(m));
      } else {
        disposeMaterial(mat);
      }
    }
  });
}
function disposeMaterial(mat: THREE.Material) {
  // texturas comunes (map, emissiveMap, alphaMap, etc.)
  const anyMat = mat as any;
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
  ];
  keys.forEach((k) => {
    const t = anyMat[k] as THREE.Texture | undefined;
    if (t) t.dispose();
  });
  mat.dispose();
}
function removeByUserType(scene: THREE.Scene, type: string) {
  const toRemove = scene.children.filter((child) => child.userData?.type === type);
  toRemove.forEach((obj) => {
    disposeObject3D(obj);
    scene.remove(obj);
  });
}
function disposeAllChildren(scene: THREE.Scene) {
  // limpia TODO lo colgado de la escena
  const all = [...scene.children];
  all.forEach((obj) => {
    disposeObject3D(obj);
    scene.remove(obj);
  });
}

/* ----------------------- Render de celdas / objetos ----------------------- */

// Create hexagon mesh for a cell
function createHexagonMesh(cell: HexCoord, zone: Zone, isHovered: boolean): THREE.Mesh {
  const HEX_SIZE = 0.9;
  const pixel = axialToPixel(cell, 1);

  // Create hexagon shape
  const shape = new THREE.Shape();
  const vertices = hexVertices({ x: 0, y: 0 }, HEX_SIZE);

  shape.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    shape.lineTo(vertices[i].x, vertices[i].y);
  }
  shape.closePath();

  // Extrude geometry
  const extrudeSettings = {
    depth: 0.1,
    bevelEnabled: false,
  };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Material with zone color
  const color = new THREE.Color(zone.color);
  const material = new THREE.MeshPhongMaterial({
    color: color,
    transparent: true,
    opacity: isHovered ? 0.8 : 0.4,
    side: THREE.DoubleSide,
    emissive: isHovered ? new THREE.Color(0x00ffcc) : new THREE.Color(0x000000),
    emissiveIntensity: isHovered ? 0.4 : 0,
  })

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pixel.x, pixel.y, 0);
  mesh.userData = { type: "hexagon", cell, zone };

  // Edge outline
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: isHovered ? 0x00ffcc : 0x00ffcc,
    opacity: isHovered ? 0.8 : 0.3,
    transparent: true,
  });
  const line = new THREE.LineSegments(edges, lineMaterial);
  mesh.add(line);

  return mesh
}

// Create object mesh for placed objects
function createObjectMesh(cell: HexCoord, object: HabitatObject, showLabel: boolean): THREE.Mesh {
  const HEX_SIZE = 0.8;
  const pixel = axialToPixel(cell, 1);

  // small hex shape
  const shape = new THREE.Shape();
  const vertices = hexVertices({ x: 0, y: 0 }, HEX_SIZE);

  shape.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    shape.lineTo(vertices[i].x, vertices[i].y);
  }
  shape.closePath();

  const extrudeSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
  };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  const material = new THREE.MeshPhongMaterial({
    color: 0x00ffcc,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pixel.x, pixel.y, 0.15);
  mesh.userData = { type: "object", cell, objectName: object.name };

  if (showLabel) {
    const label = getObjectLabel(object.name);
    const sprite = createTextSprite(label);
    sprite.position.set(0, 0, 0.5); // encima del hex
    mesh.add(sprite);
  }

  return mesh
}

function createTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;

  // tamaño canvas
  canvas.width = 256;
  canvas.height = 128;

  // estilo
  context.font = "bold 48px Arial";
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  // sombra
  context.shadowColor = "rgba(0, 0, 0, 0.8)";
  context.shadowBlur = 8;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  // textura
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(1.5, 0.75, 1);

  return sprite;
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
  };

  return labelMap[name] || name.toUpperCase().substring(0, 6);
}

// Find contiguous cells starting from a seed cell
function findContiguousCells(
  startCell: HexCoord,
  count: number,
  availableCells: HexCoord[],
  occupiedCells: Set<string>,
): HexCoord[] {
  const result: HexCoord[] = [startCell];
  const visited = new Set<string>([hexToKey(startCell)]);
  const queue: HexCoord[] = [startCell];

  while (queue.length > 0 && result.length < count) {
    const current = queue.shift()!;

    const neighbors = [
      { q: current.q + 1, r: current.r },
      { q: current.q + 1, r: current.r - 1 },
      { q: current.q, r: current.r - 1 },
      { q: current.q - 1, r: current.r },
      { q: current.q - 1, r: current.r + 1 },
      { q: current.q, r: current.r + 1 },
    ];

    for (const neighbor of neighbors) {
      const key = hexToKey(neighbor);

      if (!visited.has(key) && !occupiedCells.has(key)) {
        const isAvailable = availableCells.some((cell) => cell.q === neighbor.q && cell.r === neighbor.r);

        if (isAvailable) {
          result.push(neighbor);
          visited.add(key);
          queue.push(neighbor);

          if (result.length >= count) break;
        }
      }
    }
  }

  return result;
}