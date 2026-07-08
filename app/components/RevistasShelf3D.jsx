'use client';

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
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
    startY: 0,
    moved: false,
    pointerId: null,
  });
  const extraRotY = useRef(0); // rotación horizontal extra del drag (yaw)
  const extraRotX = useRef(0); // rotación vertical extra del drag (pitch)

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
  // - Rest: rotation.y = -0.28 (girado, se ve dimensión 3D), scale 1.18.
  // - Hover: rotation.y = 0 (portada de frente), Z+ y más scale.
  // - Selected: centrado, scale moderado para no salirse del frustum al girar.
  // - Background (hay otra seleccionada): NO desaparece — se atenúa y achica
  //   manteniendo presencia como "estantería" detrás del libro en foco.
  const target = useMemo(() => {
    if (isSelected) {
      return {
        position: [0, 0, 0.05],
        rotationY: 0,
        rotationX: 0,
        scale: 1.12,
        opacity: 1,
      };
    }
    if (isAnySelected) {
      return {
        position: [basePosition[0], basePosition[1], basePosition[2] - 0.3],
        rotationY: -0.28,
        rotationX: 0,
        scale: 0.75,
        opacity: 0.32,
      };
    }
    if (isHovered) {
      return {
        position: [basePosition[0], basePosition[1], basePosition[2] + 0.08],
        rotationY: 0,
        rotationX: 0,
        scale: 1.22,
        opacity: 1,
      };
    }
    return {
      position: basePosition,
      rotationY: -0.28,
      rotationX: 0,
      scale: 1.15,
      opacity: 1,
    };
  }, [basePosition, isHovered, isSelected, isAnySelected]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    // Damping: un poco más rápido que la versión anterior pero todavía cinemático.
    const damp = 1 - Math.pow(0.05, delta * 2.2);

    ref.current.position.x = MathUtils.lerp(ref.current.position.x, target.position[0], damp);
    ref.current.position.y = MathUtils.lerp(ref.current.position.y, target.position[1], damp);
    ref.current.position.z = MathUtils.lerp(ref.current.position.z, target.position[2], damp);

    // Rotación: base (target) + extra del drag, en ambos ejes.
    const targetRotY = target.rotationY + extraRotY.current;
    const targetRotX = target.rotationX + extraRotX.current;
    ref.current.rotation.y = MathUtils.lerp(ref.current.rotation.y, targetRotY, damp);
    ref.current.rotation.x = MathUtils.lerp(ref.current.rotation.x, targetRotX, damp);

    const s = MathUtils.lerp(ref.current.scale.x, target.scale, damp);
    ref.current.scale.set(s, s, s);

    // Snap-back del drag cuando soltás (ambos ejes).
    if (!dragState.current.down) {
      if (Math.abs(extraRotY.current) > 0.0005) {
        extraRotY.current = MathUtils.lerp(extraRotY.current, 0, damp * 0.6);
      }
      if (Math.abs(extraRotX.current) > 0.0005) {
        extraRotX.current = MathUtils.lerp(extraRotX.current, 0, damp * 0.6);
      }
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
      startY: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    };
    e.target?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragState.current.down) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.hypot(dx, dy) > 5) dragState.current.moved = true;
    // En touch el dedo es menos preciso y el viewport más chico, así que
    // bajamos el divisor para que el mismo px de movimiento genere más
    // rotación visible. e.pointerType es 'touch' | 'mouse' | 'pen'.
    const isTouch = e.pointerType === 'touch';
    extraRotY.current = dx / (isTouch ? 140 : 250);
    extraRotX.current = dy / (isTouch ? 200 : 350);
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

  return (
    <div className="revistas-shelf-canvas">
      <Canvas
        camera={{ position: [0, 0, camZ], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        // Click sobre el canvas pero fuera de cualquier libro → deselecciona.
        onPointerMissed={() => setSelectedId(null)}
      >
        {/* Iluminación de 3 puntos para dar dimensión y tacto premium a los
            libros (antes era plana → se veían "pegados" al fondo):
            - Key cálido desde arriba-derecha: modela la portada y el canto.
            - Fill frío y suave: abre la sombra del lado izquierdo.
            - Rim/top blanco desde atrás: recorta el borde superior y separa
              el libro del fondo rojo. */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 4]} intensity={0.72} color="#fff4e6" />
        <directionalLight position={[-3, 0.5, 2]} intensity={0.24} color="#e6f0ff" />
        <directionalLight position={[0, 4, -2.5]} intensity={0.42} color="#ffffff" />

        <Suspense fallback={null}>
          <Environment preset="apartment" background={false} environmentIntensity={0.62} />
          <Shelf
            revistas={revistas}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            reducedMotion={reducedMotion}
          />
        </Suspense>

        {/* Sombras quitadas: el ContactShadows dejaba una línea fea debajo y
            chocaba con el libro al rotar. El platform CSS detrás del shelf
            (gradient radial en .revistas-shelf-wrapper::before) ya da la
            sensación de "superficie" sin esos artefactos. */}
      </Canvas>
    </div>
  );
}
