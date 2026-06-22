'use client';

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import {
  TextureLoader,
  SRGBColorSpace,
  ClampToEdgeWrapping,
  MathUtils,
} from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

/**
 * RevistasShelf3D — todas las revistas activas en UN solo Canvas, paralelas,
 * mismo tratamiento por default.
 *
 * Estados de cada libro:
 *   - idle      : todos iguales, rotation.y = 0, scale 1, en su posición X base.
 *   - hovered   : se adelanta sutilmente en Z (+0.05), scale 1.04.
 *   - selected  : viaja al centro X=0, Z = +0.15, scale 1.25. Permite drag-to-
 *                 rotate horizontal. Los hermanos se "alejan" en escala 0 +
 *                 opacity 0 (visualmente desaparecen) para concentrar la atención.
 *
 * Drag-to-rotate: solo sobre el libro hovered o selected. Distingue click de drag
 * por umbral de 5px de movimiento horizontal. Click → toggle select. Drag → rota
 * mientras se arrastra y al soltar vuelve a la pose de su estado (snap-back).
 *
 * Animaciones: useFrame + lerp con damping suave (~1.2s para cubrir el rango).
 */

const W = 0.21;
const H = 0.297;
const D = 0.012;
const SPACING = 0.32;

const STATIC_TEXTURES = {
  contratapa: '/Revistas/contratapa.jpg',
  lomo: '/Revistas/lomo.jpg',
  paginasH: '/Revistas/paginas-h.jpg',
  paginasV: '/Revistas/paginas-v.jpg',
};

const DEFAULT_PORTADA = '/Revistas/7.png';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function Book({
  portadaPath,
  basePosition,
  isHovered,
  isSelected,
  isAnySelected,
  onHoverEnter,
  onHoverLeave,
  onClick,
  reducedMotion,
}) {
  const ref = useRef();
  const meshRef = useRef();
  // Drag state — refs para no triggerear re-renders en cada movimiento.
  const dragState = useRef({
    down: false,
    startX: 0,
    moved: false,
    pointerId: null,
  });
  const extraRotY = useRef(0); // rotación extra del drag, se snap-backea al soltar

  const [portada, contraTex, lomoTex, pagH, pagV] = useLoader(TextureLoader, [
    portadaPath || DEFAULT_PORTADA,
    STATIC_TEXTURES.contratapa,
    STATIC_TEXTURES.lomo,
    STATIC_TEXTURES.paginasH,
    STATIC_TEXTURES.paginasV,
  ]);

  useMemo(() => {
    [portada, contraTex, lomoTex, pagH, pagV].forEach((t) => {
      t.colorSpace = SRGBColorSpace;
      t.wrapS = ClampToEdgeWrapping;
      t.wrapT = ClampToEdgeWrapping;
      t.anisotropy = 8;
    });
  }, [portada, contraTex, lomoTex, pagH, pagV]);

  // Target del estado actual.
  const target = useMemo(() => {
    if (isSelected) {
      return {
        position: [0, 0, 0.18],
        rotationY: 0,
        scale: 1.25,
        opacity: 1,
      };
    }
    if (isAnySelected) {
      // Hay otro libro seleccionado: este se "esfuma".
      return {
        position: basePosition,
        rotationY: 0,
        scale: 0.01,
        opacity: 0,
      };
    }
    if (isHovered) {
      return {
        position: [basePosition[0], basePosition[1], basePosition[2] + 0.05],
        rotationY: 0,
        scale: 1.04,
        opacity: 1,
      };
    }
    return {
      position: basePosition,
      rotationY: 0,
      scale: 1,
      opacity: 1,
    };
  }, [basePosition, isHovered, isSelected, isAnySelected]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    // Damping suave: ~1.2 segundos para cubrir 99% del rango. Si delta varía
    // (FPS bajo), el resultado se mantiene consistente.
    const damp = 1 - Math.pow(0.05, delta * 1.6);

    ref.current.position.x = MathUtils.lerp(ref.current.position.x, target.position[0], damp);
    ref.current.position.y = MathUtils.lerp(ref.current.position.y, target.position[1], damp);
    ref.current.position.z = MathUtils.lerp(ref.current.position.z, target.position[2], damp);

    // Rotación: base (target) + extra del drag.
    const targetRotY = target.rotationY + extraRotY.current;
    ref.current.rotation.y = MathUtils.lerp(ref.current.rotation.y, targetRotY, damp);

    const s = MathUtils.lerp(ref.current.scale.x, target.scale, damp);
    ref.current.scale.set(s, s, s);

    // Snap-back del drag cuando soltás.
    if (!dragState.current.down && Math.abs(extraRotY.current) > 0.0005) {
      extraRotY.current = MathUtils.lerp(extraRotY.current, 0, damp * 0.6);
    }

    // Opacity para "esfumar" cuando hay otro seleccionado.
    if (meshRef.current) {
      meshRef.current.children?.forEach((m) => {
        if (m.material) {
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => {
              mat.transparent = target.opacity < 1;
              mat.opacity = MathUtils.lerp(mat.opacity ?? 1, target.opacity, damp);
            });
          } else {
            m.material.transparent = target.opacity < 1;
            m.material.opacity = MathUtils.lerp(m.material.opacity ?? 1, target.opacity, damp);
          }
        }
      });
    }

    // Idle micro-rotation: solo cuando no hay ningún select y nadie hovered.
    if (!isAnySelected && !isHovered && !reducedMotion) {
      const t = state.clock.elapsedTime;
      ref.current.position.y += Math.sin(t * 0.5 + basePosition[0] * 8) * 0.00006;
    }
  });

  const handlePointerDown = (e) => {
    if (isAnySelected && !isSelected) return; // no interactuable si otro está seleccionado
    e.stopPropagation();
    dragState.current = {
      down: true,
      startX: e.clientX,
      moved: false,
      pointerId: e.pointerId,
    };
    e.target?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragState.current.down) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 5) dragState.current.moved = true;
    extraRotY.current = dx / 250;
  };

  const handlePointerUp = (e) => {
    if (!dragState.current.down) return;
    const wasClick = !dragState.current.moved;
    dragState.current.down = false;
    try {
      e.target?.releasePointerCapture?.(dragState.current.pointerId);
    } catch (_) {}
    if (wasClick) onClick();
  };

  return (
    <group
      ref={ref}
      position={basePosition}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!isAnySelected || isSelected) onHoverEnter();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHoverLeave();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <mesh ref={meshRef}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial attach="material-0" map={pagH}      roughness={0.8}  metalness={0.02} />
        <meshStandardMaterial attach="material-1" map={lomoTex}   roughness={0.55} metalness={0.05} />
        <meshStandardMaterial attach="material-2" map={pagV}      roughness={0.8}  metalness={0.02} />
        <meshStandardMaterial attach="material-3" map={pagV}      roughness={0.8}  metalness={0.02} />
        <meshStandardMaterial attach="material-4" map={portada}   roughness={0.55} metalness={0.05} envMapIntensity={0.9} />
        <meshStandardMaterial attach="material-5" map={contraTex} roughness={0.6}  metalness={0.05} envMapIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Shelf({ revistas, hoveredId, setHoveredId, selectedId, setSelectedId, reducedMotion }) {
  const count = revistas.length;
  const offset = ((count - 1) * SPACING) / 2;
  return (
    <>
      {revistas.map((r, i) => (
        <Book
          key={r.id}
          portadaPath={r.portada_path}
          basePosition={[i * SPACING - offset, 0, 0]}
          isHovered={hoveredId === r.id}
          isSelected={selectedId === r.id}
          isAnySelected={selectedId !== null}
          onHoverEnter={() => setHoveredId(r.id)}
          onHoverLeave={() =>
            setHoveredId((cur) => (cur === r.id ? null : cur))
          }
          onClick={() =>
            setSelectedId((cur) => (cur === r.id ? null : r.id))
          }
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}

export default function RevistasShelf3D({
  revistas,
  hoveredId,
  setHoveredId,
  selectedId,
  setSelectedId,
}) {
  const reducedMotion = usePrefersReducedMotion();

  const camZ = useMemo(() => {
    const totalWidth = (revistas.length - 1) * SPACING + W;
    return Math.max(0.85, totalWidth * 1.2);
  }, [revistas.length]);

  const shadowScale = useMemo(
    () => Math.max(1.2, revistas.length * 0.6),
    [revistas.length]
  );

  return (
    <div className="revistas-shelf-canvas">
      <Canvas
        camera={{ position: [0, 0, camZ], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[2, 3, 2]} intensity={0.45} />
        <directionalLight position={[-2, 1, -1]} intensity={0.2} />

        <Suspense fallback={null}>
          <Environment preset="apartment" background={false} environmentIntensity={0.55} />
          <Shelf
            revistas={revistas}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            reducedMotion={reducedMotion}
          />
        </Suspense>

        <ContactShadows
          position={[0, -0.155, 0]}
          scale={shadowScale}
          blur={2.4}
          far={0.5}
          opacity={0.55}
          resolution={512}
          color="#000000"
          frames={1}
        />
      </Canvas>
    </div>
  );
}
