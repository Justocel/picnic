'use client';

import { Canvas, useLoader } from '@react-three/fiber';
import {
  PresentationControls,
  Float,
  ContactShadows,
  Environment,
} from '@react-three/drei';
import {
  TextureLoader,
  SRGBColorSpace,
  ClampToEdgeWrapping,
} from 'three';
import { Suspense, useEffect, useMemo, useState } from 'react';

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

const DEFAULT_PORTADA = '/Revistas/7.png';
const STATIC_TEXTURES = {
  contratapa: '/Revistas/contratapa.jpg',
  lomo: '/Revistas/lomo.jpg',
  paginasH: '/Revistas/paginas-h.jpg',
  paginasV: '/Revistas/paginas-v.jpg',
};

function MagazineMesh({ portadaPath }) {
  // Dimensiones tipo A4 escaladas (en metros). La base del mesh queda en y = -H/2.
  const W = 0.21;
  const H = 0.297;
  const D = 0.012;

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

  // Orden de caras de BoxGeometry:
  // 0:+X derecho  1:-X lomo  2:+Y arriba  3:-Y abajo  4:+Z portada  5:-Z contratapa
  return (
    <mesh>
      <boxGeometry args={[W, H, D]} />
      <meshStandardMaterial attach="material-0" map={pagH}      roughness={0.8}  metalness={0.02} />
      <meshStandardMaterial attach="material-1" map={lomoTex}   roughness={0.55} metalness={0.05} />
      <meshStandardMaterial attach="material-2" map={pagV}      roughness={0.8}  metalness={0.02} />
      <meshStandardMaterial attach="material-3" map={pagV}      roughness={0.8}  metalness={0.02} />
      <meshStandardMaterial attach="material-4" map={portada}   roughness={0.55} metalness={0.05} envMapIntensity={0.9} />
      <meshStandardMaterial attach="material-5" map={contraTex} roughness={0.6}  metalness={0.05} envMapIntensity={0.8} />
    </mesh>
  );
}

/**
 * Revista3D — interacción estilo Stripe Press.
 *
 * - PresentationControls: arrastrás y vuelve sola con resorte.
 * - Float: cabeceo idle muy sutil (~1.5cm), se desactiva con prefers-reduced-motion.
 * - ContactShadows: sombra de contacto debajo del libro.
 * - Environment("apartment"): iluminación tipo indoor cálido — el meshStandardMaterial
 *   responde con un specular sutil que es la mitad del efecto Stripe Press.
 */
export default function Revista3D({ portadaPath }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="revista-3d-canvas">
      <Canvas
        camera={{ position: [0, 0, 0.85], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[2, 3, 2]} intensity={0.45} />
        <directionalLight position={[-2, 1, -1]} intensity={0.2} />

        <Suspense fallback={null}>
          <Environment preset="apartment" background={false} environmentIntensity={0.55} />

          <PresentationControls
            global
            cursor
            snap
            speed={1.3}
            zoom={1}
            rotation={[0, -0.12, 0]}
            polar={[-0.25, 0.25]}
            azimuth={[-0.55, 0.55]}
            config={{ mass: 1, tension: 170, friction: 26 }}
          >
            {reducedMotion ? (
              <MagazineMesh key={portadaPath || 'default'} portadaPath={portadaPath} />
            ) : (
              <Float
                speed={1.0}
                rotationIntensity={0.3}
                floatIntensity={0.4}
                floatingRange={[-0.015, 0.015]}
              >
                <MagazineMesh key={portadaPath || 'default'} portadaPath={portadaPath} />
              </Float>
            )}
          </PresentationControls>

          <ContactShadows
            position={[0, -0.155, 0]}
            scale={1.2}
            blur={2.4}
            far={0.5}
            opacity={0.55}
            resolution={512}
            color="#000000"
            frames={1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
