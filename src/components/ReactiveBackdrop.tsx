import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Theme } from '../types';

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    float distanceFromCenter = distance(vUv, vec2(0.5));
    float softness = smoothstep(0.52, 0.04, distanceFromCenter);
    float edgeFade = smoothstep(0.02, 0.18, vUv.x)
      * smoothstep(0.02, 0.18, 1.0 - vUv.x)
      * smoothstep(0.02, 0.18, vUv.y)
      * smoothstep(0.02, 0.18, 1.0 - vUv.y);
    gl_FragColor = vec4(uColor, softness * edgeFade * uIntensity);
  }
`;

interface ReactiveBackdropProps {
  theme: Theme;
}

/** A static central atmosphere rendered behind the cylinder. */
export function ReactiveBackdrop({ theme }: ReactiveBackdropProps): JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Keep the uniforms object identity stable across renders so R3F does not
  // recompile the shader program every time `theme` changes. The values are
  // mutated through the effect below.
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uIntensity: { value: 0 }
    }),
    []
  );

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uColor.value.set(
      theme === 'dark' ? '#c89655' : '#617894'
    );
    materialRef.current.uniforms.uIntensity.value = theme === 'dark' ? 0.14 : 0.07;
  }, [theme]);

  return (
    <group ref={groupRef} position={[0, 0, -48]} renderOrder={-10}>
      <mesh renderOrder={-10}>
        <planeGeometry args={[44, 32]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}
