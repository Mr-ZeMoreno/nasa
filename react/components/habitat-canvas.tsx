"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type WsStatus =
  | { type: "ws-open" }
  | { type: "ws-close"; code: number; reason: string }
  | { type: "ws-error"; message: string }
  | { type: "ws-parse-error"; message: string };

function emitStatus(detail: WsStatus) {
  try {
    window.dispatchEvent(new CustomEvent("habitat-ws-status", { detail }));
  } catch {
    // no-op
  }
}

export function HabitatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number | null>(null);

  // WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const wsUrlRef = useRef<string>("ws://localhost:8000/formas/ws/piso");

  const floorGroupRef = useRef<THREE.Group | null>(null);
  const [floor, setFloor] = useState<number[][]>([]);
  const radius = 3;

  // ---------- INIT Three.js ----------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, radius * 4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 5, 5);
    scene.add(ambient, directional);

    const floorGroup = new THREE.Group();
    floorGroup.name = "floorGroup";
    scene.add(floorGroup);
    floorGroupRef.current = floorGroup;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 2;
    controls.maxDistance = radius * 10;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = 0;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !containerRef.current) return;
      const w = containerRef.current.clientWidth || 800;
      const h = containerRef.current.clientHeight || 600;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      if (cameraRef.current) {
        const angle = 0.001;
        const x = cameraRef.current.position.x;
        const z = cameraRef.current.position.z;
        const radiusCam = Math.sqrt(x * x + z * z);
        const theta = Math.atan2(z, x) + angle;
        cameraRef.current.position.x = radiusCam * Math.cos(theta);
        cameraRef.current.position.z = radiusCam * Math.sin(theta);
        cameraRef.current.lookAt(0, 0, 0);
      }
      controls.update();
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // limpiar geometrías/materiales del piso
      if (floorGroupRef.current) {
        while (floorGroupRef.current.children.length) {
          const obj = floorGroupRef.current.children.pop()!;
          (obj as any).geometry?.dispose?.();
          const m = (obj as any).material;
          if (Array.isArray(m)) m.forEach((mm: any) => mm?.dispose?.());
          else m?.dispose?.();
        }
      }

      // quitar canvas del DOM
      if (rendererRef.current) {
        const canvas = rendererRef.current.domElement;
        canvas?.parentElement?.removeChild(canvas);
      }
      rendererRef.current?.dispose();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [radius]);

  // ---------- WebSocket (piso) ----------
  useEffect(() => {
    // Evita abrir 2 veces en StrictMode
    if (wsRef.current) return;

    const ws = new WebSocket(wsUrlRef.current);
    wsRef.current = ws;

    ws.onopen = () => {
      emitStatus({ type: "ws-open" });
      try {
        ws.send(JSON.stringify({ type: "get_floor" }));
      } catch {
        // no-op
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg?.type === "floor" && Array.isArray(msg?.matrix)) {
          setFloor(msg.matrix);
        }
      } catch (e) {
        const message = (e as Error)?.message ?? "parse error";
        emitStatus({ type: "ws-parse-error", message });
      }
    };

    ws.onclose = (ev: CloseEvent) => {
      emitStatus({ type: "ws-close", code: ev.code, reason: ev.reason });
    };

    ws.onerror = (ev: Event) => {
      const maybe = ev as unknown as { message?: string; error?: unknown; type?: string };
      const fromErrorObj =
        (maybe?.error as any)?.message ||
        (maybe?.error as any)?.toString?.() ||
        undefined;

      const message =
        maybe?.message ||
        fromErrorObj ||
        `type=${maybe?.type || "error"}`;

      emitStatus({ type: "ws-error", message });
    };

    // keep-alive
    const ping = setInterval(() => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      } catch {
        // no-op
      }
    }, 20000);

    return () => {
      clearInterval(ping);
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, "cleanup");
        }
      } catch {
        // no-op
      }
      wsRef.current = null;
    };
  }, []);

  // Utilidad: hex "flat-top"
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

    // limpiar grupo (geometrías/materiales)
    while (floorGroup.children.length) {
      const obj = floorGroup.children.pop()!;
      (obj as any).geometry?.dispose?.();
      const m = (obj as any).material;
      if (Array.isArray(m)) m.forEach((mm: any) => mm?.dispose?.());
      else m?.dispose?.();
    }

    if (!floor || floor.length === 0) return;

    const hexR = 1;
    const a0 = 0;
    const shape = buildHexShape(hexR, a0);
    const baseGeom = new THREE.ShapeGeometry(shape);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff });

    floor.forEach((center, idx) => {
      if (!Array.isArray(center) || center.length < 2) return;
      const [cx, cy] = center;

      const fillMat = new THREE.MeshStandardMaterial({
        color: 0x3a7bd5,
        roughness: 0.85,
        metalness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      // variación de color por índice
      fillMat.color.setHSL(((idx * 37) % 360) / 360, 0.6, 0.5);

      const mesh = new THREE.Mesh(baseGeom.clone(), fillMat);
      mesh.position.set(cx, cy, 0.001);
      floorGroup.add(mesh);

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
