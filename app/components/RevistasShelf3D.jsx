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
 * mismo tratamiento por default. Hover sobre una: se adelanta en Z, gira para
 * mostrar la portada de frente, escala apenas. Las hermanas no se atenúan
 * (estilo Stripe Press: el destaque es por movimiento, no por dim).
 *
 * Sin re-renders entre estados: la posición/rotación se lerpea con useFrame.
 *
 * Props:
 *   revistas — array de { id, portada_path, ... } a renderizar.
 *   hoveredId — id de la revista bajo el cursor (null = ninguna).
 *   setHoveredId — setter externo.
 */

const W = 0.21;
const H = 0.297;
const D = 0.012;
const SPACING = 0.32; // distancia entre centros de libros vecinos

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
  isAnyHovered,
  onHover,
  onUnhover,
  reducedMotion,
}) {
  const ref = useRef();

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

  // Targets calculados según hover state
  // Rest pose: lomo girado 25° para que se vea la cara de la portada y un poco del lomo.
  // Hovered: se adelanta en Z, gira a frente (rotation.y = 0), escala 1.1.
  // isAnyHovered && !isHovered: se atenúa apenas en Z (retrocede) y mantiene rotación.
  const target = useMemo(() => {
    if (isHovered) {
      return {
        position: [basePosition[0], basePosition[1], basePosition[2] + 0.12],
        rotationY: 0,
        scale: 1.1,
      };
    }
    if (isAnyHovered) {
      return {
        position: [basePosition[0], basePosition[1], basePosition[2] - 0.04],
        rotationY: -0.35,
        scale: 0.95,
      };
    }
    return {
      position: basePosition,
      rotationY: -0.25,
      scale: 1,
    };
  }, [basePosition, isHovered, isAnyHovered]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    // damping de spring-style: cuanto más alto el primer arg, más rápido
    const damp = 1 - Math.pow(0.001, delta * 3);

    ref.current.position.x = MathUtils.lerp(ref.current.position.x, target.position[0], damp);
    ref.current.position.y = MathUtils.lerp(ref.current.position.y, target.position[1], damp);
    ref.current.position.z = MathUtils.lerp(ref.current.position.z, target.position[2], damp);

    ref.current.rotation.y = MathUtils.lerp(ref.current.rotation.y, target.rotationY, damp);

    const s = MathUtils.lerp(ref.current.scale.x, target.scale, damp);
    ref.current.scale.set(s, s, s);

    // Idle micro-rotation: solo si no hay hover en ningún libro y no se prefiere reducir movimiento.
    if (!isAnyHovered && !reducedMotion) {
      const t = state.clock.elapsedTime;
      ref.current.rotation.y += Math.sin(t * 0.4 + basePosition[0] * 10) * 0.0008;
      ref.current.position.y += Math.sin(t * 0.6 + basePosition[0] * 5) * 0.00008;
    }
  });

  return (
    <group
      ref={ref}
      position={basePosition}
      rotation={[0, -0.25, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onUnhover();
      }}
    >
      <mesh>
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

function Shelf({ revistas, hoveredId, setHoveredId, reducedMotion }) {
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
          isAnyHovered={hoveredId !== null}
          onHover={() => setHoveredId(r.id)}
          onUnhover={() => {
            setHoveredId((cur) => (cur === r.id ? null : cur));
          }}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}

export default function RevistasShelf3D({ revistas, hoveredId, setHoveredId }) {
  const reducedMotion = usePrefersReducedMotion();

  // Cámara: la Z se aleja según cuántos libros haya, para que entren todos
  // con el zoom del hover sin cortarse.
  const camZ = useMemo(() => {
    const totalWidth = (revistas.length - 1) * SPACING + W;
    // factor 1.2 para margen lateral; mínimo 0.85 (caso 1 revista).
    return Math.max(0.85, totalWidth * 1.2);
  }, [revistas.length]);

  // ContactShadows: escala según cantidad de libros
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
