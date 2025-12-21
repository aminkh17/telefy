"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
// Removed SimplexNoise dependency to avoid errors and implement a simpler shader-based noise approach
// or a custom noise function if needed. However, the shader below handles the morphing.
// We will use a custom shader material that creates the blob effect without external noise lib dependency if possible,
// or use a simple vertex displacement.

// Custom Shader Material for the Blob
const vertexShader = `
uniform float uTime;
uniform float uComplexity;
uniform float uSpeed;
varying vec2 vUv;
varying float vDisplacement;

// Simplex 3D Noise 
// by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  vUv = uv;
  vDisplacement = snoise(position * uComplexity + uTime * uSpeed);
  vec3 newPosition = position + normal * vDisplacement * 0.2;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
varying vec2 vUv;
varying float vDisplacement;

void main() {
  float distort = vDisplacement * 2.0 + 0.5;
  vec3 color = mix(uColor1, uColor2, distort);
  gl_FragColor = vec4(color, 1.0);
}
`;

export interface MorphingBlobProps {
  size?: number | string;
  theme?: "aurora" | "sunset" | "ocean" | "cyber";
  complexity?: number;
  speed?: number;
  className?: string;
  enableEffects?: boolean;
}

const themeColors = {
  aurora: { c1: "#ff00ff", c2: "#00ffff" },
  sunset: { c1: "#ff4e50", c2: "#f9d423" },
  ocean: { c1: "#2b5876", c2: "#4e4376" },
  cyber: { c1: "#2e004d", c2: "#9f00ff" },
};

export const MorphingBlob: React.FC<MorphingBlobProps> = ({
  size = 400,
  theme = "cyber",
  complexity = 0.5,
  speed = 0.2,
  className = "",
  enableEffects = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;

    const width = typeof size === 'number' ? size : mountRef.current.clientWidth;
    const height = typeof size === 'number' ? size : mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 1.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const colors = themeColors[theme] || themeColors.cyber;
    const color1 = new THREE.Color(colors.c1);
    const color2 = new THREE.Color(colors.c2);

    const geometry = new THREE.IcosahedronGeometry(0.6, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uComplexity: { value: complexity },
        uSpeed: { value: speed },
        uColor1: { value: color1 },
        uColor2: { value: color2 },
      },
      // wireframe: true // Debug mode
    });

    const blob = new THREE.Mesh(geometry, material);
    scene.add(blob);

    // Animation Loop
    let frameId: number;
    const animate = () => {
      material.uniforms.uTime.value += 0.01;
      blob.rotation.y += 0.002;
      blob.rotation.x += 0.001;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (mountRef.current) {
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(mountRef.current);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [theme, complexity, speed, size]);

  return <div ref={mountRef} className={className} style={{ width: size, height: size }} />;
};