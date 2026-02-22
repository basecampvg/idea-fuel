'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { createNeuronMaterial } from './neuron-shader';

const PARTICLE_COUNT = 25000;
const MODEL_PATH = '/models/brain.glb';
const MOUSE_RADIUS = 0.8;
const PUSH_STRENGTH = 0.15;
const SPRING_BACK = 0.06;

function sampleMeshSurface(mesh: THREE.Mesh, count: number): Float32Array {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const positions = new Float32Array(count * 3);
  const tempPosition = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    sampler.sample(tempPosition);
    positions[i * 3] = tempPosition.x;
    positions[i * 3 + 1] = tempPosition.y;
    positions[i * 3 + 2] = tempPosition.z;
  }

  return positions;
}

function findMeshes(scene: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes.push(child as THREE.Mesh);
    }
  });
  return meshes;
}

// Reusable objects to avoid allocations in useFrame
const _camDir = new THREE.Vector3();
const _plane = new THREE.Plane();
const _intersect = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

export function ParticleBrain() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const currentPositionsRef = useRef<Float32Array | null>(null);
  const mouseWorldRef = useRef(new THREE.Vector3(999, 999, 999));
  const { viewport, camera } = useThree();

  const gltf = useGLTF(MODEL_PATH);

  const { geometry, material } = useMemo(() => {
    const meshes = findMeshes(gltf.scene);
    if (meshes.length === 0) {
      throw new Error('No meshes found in brain GLB');
    }

    let sampleMesh: THREE.Mesh;
    if (meshes.length === 1) {
      sampleMesh = meshes[0];
    } else {
      const positions: number[] = [];
      const indices: number[] = [];
      let indexOffset = 0;

      for (const mesh of meshes) {
        const cloned = mesh.geometry.clone();
        mesh.updateWorldMatrix(true, false);
        cloned.applyMatrix4(mesh.matrixWorld);

        const posAttr = cloned.getAttribute('position');
        for (let i = 0; i < posAttr.count; i++) {
          positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        }
        const idx = cloned.getIndex();
        if (idx) {
          for (let i = 0; i < idx.count; i++) {
            indices.push(idx.getX(i) + indexOffset);
          }
        }
        indexOffset += posAttr.count;
        cloned.dispose();
      }

      const mergedGeometry = new THREE.BufferGeometry();
      mergedGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      );
      if (indices.length > 0) {
        mergedGeometry.setIndex(indices);
      }
      sampleMesh = new THREE.Mesh(mergedGeometry);
    }

    const particlePositions = sampleMeshSurface(sampleMesh, PARTICLE_COUNT);

    // Auto-center and normalize scale
    const bbox = new THREE.Box3();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      bbox.expandByPoint(
        new THREE.Vector3(
          particlePositions[i * 3],
          particlePositions[i * 3 + 1],
          particlePositions[i * 3 + 2]
        )
      );
    }
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.5 / maxDim;

    let yMin = Infinity;
    let yMax = -Infinity;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePositions[i * 3] = (particlePositions[i * 3] - center.x) * scale;
      particlePositions[i * 3 + 1] = (particlePositions[i * 3 + 1] - center.y) * scale;
      particlePositions[i * 3 + 2] = (particlePositions[i * 3 + 2] - center.z) * scale;

      const y = particlePositions[i * 3 + 1];
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }

    // Store originals, create mutable current positions
    const originals = new Float32Array(particlePositions);
    const currents = new Float32Array(particlePositions);
    originalPositionsRef.current = originals;
    currentPositionsRef.current = currents;

    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      seeds[i] = Math.random();
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(currents, 3));
    geom.setAttribute('aOriginalPos', new THREE.BufferAttribute(originals, 3));
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const dpr = Array.isArray(viewport.dpr) ? viewport.dpr[1] : viewport.dpr;
    const mat = createNeuronMaterial(dpr);
    mat.uniforms.uYMin.value = yMin;
    mat.uniforms.uYMax.value = yMax;
    mat.uniforms.uMouseRadius.value = MOUSE_RADIUS;

    materialRef.current = mat;

    return { geometry: geom, material: mat };
  }, [gltf.scene, viewport.dpr]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    const mat = materialRef.current;
    const originals = originalPositionsRef.current;
    const currents = currentPositionsRef.current;
    if (!mat || !pointsRef.current || !originals || !currents) return;

    mat.uniforms.uTime.value = state.clock.elapsedTime;

    // Use R3F's built-in pointer tracking (state.pointer is NDC coords)
    camera.getWorldDirection(_camDir);
    _plane.setFromNormalAndCoplanarPoint(_camDir, new THREE.Vector3(0, 0, 0));
    _raycaster.setFromCamera(state.pointer, camera);
    const hit = _raycaster.ray.intersectPlane(_plane, _intersect);
    if (hit) {
      mouseWorldRef.current.copy(_intersect);
    } else {
      mouseWorldRef.current.set(999, 999, 999);
    }

    mat.uniforms.uMouseWorld.value.copy(mouseWorldRef.current);

    // CPU-side: spring back + mouse push
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    let needsUpdate = false;
    const mwx = mouseWorldRef.current.x;
    const mwy = mouseWorldRef.current.y;
    const mwz = mouseWorldRef.current.z;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Spring back toward original position
      const dx = originals[i3] - currents[i3];
      const dy = originals[i3 + 1] - currents[i3 + 1];
      const dz = originals[i3 + 2] - currents[i3 + 2];

      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001 || Math.abs(dz) > 0.0001) {
        currents[i3] += dx * SPRING_BACK;
        currents[i3 + 1] += dy * SPRING_BACK;
        currents[i3 + 2] += dz * SPRING_BACK;
        needsUpdate = true;
      }

      // Mouse push
      const mx = currents[i3] - mwx;
      const my = currents[i3 + 1] - mwy;
      const mz = currents[i3 + 2] - mwz;
      const mouseDist = Math.sqrt(mx * mx + my * my + mz * mz);

      if (mouseDist < MOUSE_RADIUS && mouseDist > 0.001) {
        const force = 1 - mouseDist / MOUSE_RADIUS;
        const pushF = force * force * PUSH_STRENGTH;
        const invDist = 1 / mouseDist;
        currents[i3] += mx * invDist * pushF;
        currents[i3 + 1] += my * invDist * pushF;
        currents[i3 + 2] += mz * invDist * pushF;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}

useGLTF.preload(MODEL_PATH);
