"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function HabitatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number | null>(null);

  const floorGroupRef = useRef<THREE.Group | null>(null); // NEW

  const [floor, setFloor] = useState<number[][]>([]); // <-- lista de centros [x,y,z]
  const radius = 1;

  // ---------- INIT Three.js ----------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Escena y cámara
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, radius * 4);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 5, 5);
    scene.add(ambient, directional);

    // Grupo del piso (para limpiar sin tocar luces/controles)
    const floorGroup = new THREE.Group(); // NEW
    floorGroup.name = "floorGroup";       // NEW
    scene.add(floorGroup);                // NEW
    floorGroupRef.current = floorGroup;   // NEW

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // suavizado
    controls.minDistance = 2;
    controls.maxDistance = radius * 10;
    controls.maxPolarAngle = Math.PI / 2; // evita que la cámara caiga por debajo del piso
    controls.minPolarAngle = 0;
    controlsRef.current = controls;

    // Resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // ---------- Animación ----------
    const animate = () => {
      // Giro automático
      if (cameraRef.current) {
        const angle = 0.001; // velocidad de giro
        const x = cameraRef.current.position.x;
        const z = cameraRef.current.position.z;
        const radiusCam = Math.sqrt(x * x + z * z);
        const theta = Math.atan2(z, x) + angle;

        cameraRef.current.position.x = radiusCam * Math.cos(theta);
        cameraRef.current.position.z = radiusCam * Math.sin(theta);
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Actualiza controles (para damping)
      controls.update();

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, [radius]);

  // ---------- WebSocket (piso) ----------
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/formas/ws/piso");

    ws.onopen = () => {
      console.log("WS connected");
      ws.send(JSON.stringify({ type: "get_floor" }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      // msg.matrix es lista de centros [[x,y,z], ...]
      if (msg.type === "floor" && Array.isArray(msg.matrix)) {
        setFloor(msg.matrix);
      }
    };

    ws.onclose = () => console.log("WS disconnected");

    return () => ws.close();
  }, []);

  // Utilidad: hex "flat-top" de radio dado
  function buildHexShape(r: number, a0 = 0): THREE.Shape {
    const s = new THREE.Shape();
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const a = a0 + (i * Math.PI) / 3;
      pts.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)));
    }
    s.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 6; i++) s.lineTo(pts[i].x, pts[i].y);
    s.closePath();
    return s;
  }

  // ---------- Renderizar piso ----------
  useEffect(() => {
    const scene = sceneRef.current;
    const floorGroup = floorGroupRef.current;
    if (!scene || !floorGroup) return;
    if (!floor || floor.length === 0) {
      // limpiar si viene vacío
      while (floorGroup.children.length) {
        const obj = floorGroup.children.pop()!;
        (obj as any).geometry?.dispose?.();
        const m = (obj as any).material;
        if (Array.isArray(m)) m.forEach((mm) => mm?.dispose?.());
        else m?.dispose?.();
      }
      return;
    }

    // Limpia meshes previos SOLO del grupo
    while (floorGroup.children.length) {
      const obj = floorGroup.children.pop()!;
      (obj as any).geometry?.dispose?.();
      const m = (obj as any).material;
      if (Array.isArray(m)) m.forEach((mm) => mm?.dispose?.());
      else m?.dispose?.();
    }

    // Radio del hex (tu matriz parece ser r=1 → distancias son 1.5 y 0.866... )
    const hexR = 1;
    const a0 = 0; // 0 => flat-top; usa Math.PI/6 si quieres "punta arriba"
    const shape = buildHexShape(hexR, a0);
    const baseGeom = new THREE.ShapeGeometry(shape);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff });

    floor.forEach((center, idx) => {
      if (!Array.isArray(center) || center.length < 2) return;
      const [cx, cy] = center; // z no la usamos (piso plano)

      // Relleno
      const fillMat = new THREE.MeshStandardMaterial({
        color: 0x3a7bd5,
        roughness: 0.85,
        metalness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      // opcional: variar color por índice
      fillMat.color.setHSL(((idx * 37) % 360) / 360, 0.6, 0.5);

      const mesh = new THREE.Mesh(baseGeom.clone(), fillMat);
      mesh.position.set(cx, cy, 0.001); // levanta un poco para evitar z-fighting
      floorGroup.add(mesh);

      // Contorno
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 6; i++) {
        const a = a0 + (i * Math.PI) / 3;
        pts.push(new THREE.Vector3(cx + hexR * Math.cos(a), cy + hexR * Math.sin(a), 0.002));
      }
      const edgeGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const loop = new THREE.Line(edgeGeom, edgeMat);
      floorGroup.add(loop);
    });
  }, [floor]);

  return <div ref={containerRef} className="w-full h-full" />;
}
