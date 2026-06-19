'use client';

import { Canvas, useLoader } from '@react-three/fiber';
import {
  PresentationControls,
  ContactShadows,
  Float,
} from '@react-three/drei';
import {
  TextureLoader,
  SRGBColorSpace,
  ClampToEdgeWrapping,
} from 'three';
import { Suspense, useEffect, useState } from 'react';

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
  // useLoader cachea por URL. Si portadaPath cambia (editor sube nueva portada),
  // se trae la textura nueva y re-renderiza. Las texturas estáticas (lomo,
  // contratapa, páginas) son placeholders compartidos entre todas las ediciones.
  const [portada, contraTex, lomoTex, pagH, pagV] = useLoader(
    TextureLoader,
    [
      portadaPath || DEFAULT_PORTADA,
      STATIC_TEXTURES.contratapa,
      STATIC_TEXTURES.lomo,
      STATIC_TEXTURES.paginasH,
      STATIC_TEXTURES.paginasV,
    ]
  );

  [portada, contraTex, lomoTex, pagH, pagV].forEach((t) => {
    t.colorSpace = SRGBColorSpace;
    t.wrapS = ClampToEdgeWrapping;
    t.wrapT = ClampToEdgeWrapping;
    t.anisotropy = 8;
  });

  // Dimensiones tipo A4 escaladas (en metros).
  const W = 0.21;
  const H = 0.297;
  const D = 0.012;

  // Orden de caras de BoxGeometry:
  // 0:+X derecho  1:-X lomo  2:+Y arriba  3:-Y abajo  4:+Z portada  5:-Z contratapa
  const maps = [pagH, lomoTex, pagV, pagV, portada, contraTex];

  return (
    <mesh>
      <boxGeometry args={[W, H, D]} />
      {maps.map((m, i) => (
        <meshBasicMaterial
          key={i}
          attach={`material-${i}`}
          map={m}
          toneMapped={false}
        />
      ))}
    </mesh>
  );
}

/**
 * Revista3D — interacción estilo Stripe Press.
 *
 * - PresentationControls: arrastrás para "espiarla" y al soltar vuelve sola
 *   con resorte. Reemplaza al OrbitControls + autoRotate (que era robótico).
 * - Float: cabeceo idle muy sutil, para que no se vea congelada.
 * - ContactShadows: sombra debajo de la revista para que se sienta apoyada,
 *   no flotando.
 *
 * Cámara y mesh sin cambios respecto a la versión anterior: solo cambia la
 * interacción y el ambiente. Si algo se ve raro, lo que importa primero es
 * la posición de la cámara (0, 0, 0.75) y el FOV (35) — no tocar.
 */
export default function Revista3D({ portadaPath }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="revista-3d-canvas">
      <Canvas camera={{ position: [0, 0, 0.75], fov: 35 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PresentationControls
            global
            cursor
            snap
            polar={[-Math.PI / 8, Math.PI / 8]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
            config={{ mass: 1, tension: 170, friction: 26 }}
          >
            <Float
              enabled={!reducedMotion}
              speed={1.4}
              rotationIntensity={0.15}
              floatIntensity={0.2}
            >
              {/* key fuerza re-mount cuando cambia la portada — evita problemas
                  de cache de Suspense entre re-renders con distintos arrays. */}
              <MagazineMesh
                key={portadaPath || 'default'}
                portadaPath={portadaPath}
              />
            </Float>
          </PresentationControls>
          <ContactShadows
            position={[0, -0.17, 0]}
            opacity={0.45}
            scale={0.5}
            blur={2.2}
            far={0.3}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
