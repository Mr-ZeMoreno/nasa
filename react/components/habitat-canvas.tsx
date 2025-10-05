"use client"

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useHabitat } from "@/store/use-habitat";
import { createHexMesh, createObjectMesh } from "@/lib/hex";
import type { HexCoord } from "@/lib/types";

export function HabitatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [floor, setFloor] = useState<any[][][]>([]); // la matriz p
  const [hoveredCell, setHoveredCell] = useState<HexCoord | null>(null);

  const { radius } = useHabitat();

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
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

  // ---------- WebSocket ----------
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/formas/ws/piso");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS connected");
      ws.send(JSON.stringify({ type: "get_floor" }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "floor") {
        console.log(msg.matrix)
        setFloor(msg.matrix); // actualizar estado
      }
    };

    ws.onclose = () => console.log("WS disconnected");

    return () => {
      ws.close();
    };
  }, []);

  // ---------- Render piso ----------
useEffect(() => {
  if (!sceneRef.current) return;
  const scene = sceneRef.current;

  // Limpiar grupo previo
  let floorGroup = scene.getObjectByName("floor") as THREE.Group;
  if (floorGroup) scene.remove(floorGroup);
  floorGroup = new THREE.Group();
  floorGroup.name = "floor";
  scene.add(floorGroup);

  async function renderFloor() {
    if (!floor || floor.length === 0) return;

    for (let x = 0; x < floor.length; x++) {
      for (let y = 0; y < floor[x].length; y++) {
        for (let z = 0; z < floor[x][y].length; z++) {
          const coords = floor[x][y][z]; // Array de coordenadas
          if (!coords) continue;

          const pos = { x: coords[0], y: coords[1], z: coords[2] };
          const hexMesh = await createHexMesh(pos);
          hexMesh.userData = { type: "hex" };
          floorGroup.add(hexMesh);
        }
      }
    }
  }

  renderFloor();
}, [floor]);



  return <div ref={containerRef} className="w-full h-full" />;
}

