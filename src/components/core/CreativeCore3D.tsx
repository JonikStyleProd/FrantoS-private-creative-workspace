import React, { useEffect, useRef, useState, useId } from 'react';
import * as THREE from 'three';
import { CreativeDiscipline } from '../../types';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { Sparkles, RotateCcw, Check } from 'lucide-react';

interface CreativeCore3DProps {
  activeDiscipline: CreativeDiscipline | 'all';
  onSelectDiscipline: (discipline: CreativeDiscipline | 'all') => void;
  isDarkTheme?: boolean;
}

interface DisciplineObjectConfig {
  id: CreativeDiscipline;
  name: string;
  subtitle: string;
  materialType: string;
  colorHex: number;
  emissiveHex: number;
  initialPos: [number, number, number];
  initialRot: [number, number, number];
}

export const CreativeCore3D: React.FC<CreativeCore3DProps> = ({
  activeDiscipline,
  onSelectDiscipline,
  isDarkTheme = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredDiscipline, setHoveredDiscipline] = useState<CreativeDiscipline | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const tooltipId = useId();

  // Keep refs in sync for smooth 60fps loop without canvas teardown
  const activeDisciplineRef = useRef(activeDiscipline);
  activeDisciplineRef.current = activeDiscipline;

  const hoveredDisciplineRef = useRef(hoveredDiscipline);
  hoveredDisciplineRef.current = hoveredDiscipline;

  const onSelectDisciplineRef = useRef(onSelectDiscipline);
  onSelectDisciplineRef.current = onSelectDiscipline;

  const isDarkThemeRef = useRef(isDarkTheme);
  isDarkThemeRef.current = isDarkTheme;

  const isReducedMotionRef = useRef(isReducedMotion);
  isReducedMotionRef.current = isReducedMotion;

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const objectConfigs: DisciplineObjectConfig[] = [
    {
      id: 'motion',
      name: 'Kinetic Motion',
      subtitle: 'Flowing iridescent ribbon & temporal liquid dynamics',
      materialType: 'Liquid Silk & Iridescent Film',
      colorHex: 0xf43f5e,
      emissiveHex: 0x881337,
      initialPos: [-2.6, 1.2, 0.4],
      initialRot: [0.4, 0.8, 0.2],
    },
    {
      id: '3d',
      name: 'Spatial 3D',
      subtitle: 'Prismatic optical crystal & refractive light dispersion',
      materialType: 'Bismuth-Doped Optical Glass & Chrome',
      colorHex: 0x06b6d4,
      emissiveHex: 0x083344,
      initialPos: [0, 0.2, 0.9],
      initialRot: [0.2, 0.5, 0.1],
    },
    {
      id: 'brand',
      name: 'Brand & Identity',
      subtitle: 'Layered dimensional typography & folded foil paper',
      materialType: '700gsm Embossed Cotton & Brushed Brass',
      colorHex: 0xeab308,
      emissiveHex: 0x713f12,
      initialPos: [2.5, 1.3, -0.3],
      initialRot: [-0.3, -0.6, 0.4],
    },
    {
      id: 'ui',
      name: 'Spatial UI/UX',
      subtitle: 'Translucent frosted acrylic interface panels & bevel fillets',
      materialType: 'Frosted Optical Acrylic & Luminescent Fillet',
      colorHex: 0x8b5cf6,
      emissiveHex: 0x3b0764,
      initialPos: [-2.4, -1.3, -0.4],
      initialRot: [0.5, 0.3, -0.2],
    },
    {
      id: 'web',
      name: 'Creative Web',
      subtitle: 'Modular architectural grid & connected WebGL nodes',
      materialType: 'Dark Graphite Anodized Metal & Laser Wireframe',
      colorHex: 0x10b981,
      emissiveHex: 0x064e3b,
      initialPos: [2.3, -1.2, 0.5],
      initialRot: [-0.4, 0.6, -0.3],
    },
    {
      id: 'sound',
      name: 'Sound Architecture',
      subtitle: 'Oscillating acoustic resonance rings & sonic frequency waves',
      materialType: 'Resonant Acoustic Bronze & Waveform Field',
      colorHex: 0xf97316,
      emissiveHex: 0x7c2d12,
      initialPos: [0.1, -1.8, -0.6],
      initialRot: [0.8, -0.2, 0.5],
    },
  ];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    let resizeObserver: ResizeObserver | null = null;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene, Constellation Root Group & Camera
    const scene = new THREE.Scene();
    const constellationGroup = new THREE.Group();
    scene.add(constellationGroup);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    // Responsive camera position: pull back on mobile portrait to ensure all 6 objects fit
    const updateCameraDistance = (w: number, h: number) => {
      const aspect = w / h;
      let dist = 7.5;
      if (w < 480 || aspect < 0.75) {
        dist = 10.8;
      } else if (w < 768 || aspect < 1.1) {
        dist = 9.2;
      }
      camera.position.set(0, 0, dist);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    };
    updateCameraDistance(width, height);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDarkTheme ? 1.15 : 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Cinematic Lighting (Adaptive to dark vs light theme)
    const ambientLight = new THREE.AmbientLight(
      isDarkTheme ? 0x222638 : 0xfcf9f2,
      isDarkTheme ? 2.0 : 2.8
    );
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(
      isDarkTheme ? 0xffffff : 0xfffaed,
      isDarkTheme ? 2.6 : 2.2
    );
    keyLight.position.set(6, 9, 8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
      isDarkTheme ? 0x06b6d4 : 0xdce8f5,
      isDarkTheme ? 2.8 : 1.4
    );
    fillLight.position.set(-6, -4, -5);
    scene.add(fillLight);

    const accentLight = new THREE.PointLight(
      0xf43f5e,
      isDarkTheme ? 2.4 : 1.5,
      16
    );
    accentLight.position.set(2, 4, 3.5);
    scene.add(accentLight);

    // 4. Atmospheric Spatial Particles
    const particleCount = isDarkTheme ? 220 : 90;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 14;
      particlePositions[i + 1] = (Math.random() - 0.5) * 10;
      particlePositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: isDarkTheme ? 0x38bdf8 : 0x888e99,
      size: isDarkTheme ? 0.045 : 0.035,
      transparent: true,
      opacity: isDarkTheme ? 0.45 : 0.3,
      blending: isDarkTheme ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // 5. Helper function to create invisible spherical hit collider for 100% reliable raycasting
    const attachCollider = (group: THREE.Group, id: CreativeDiscipline, radius = 1.3) => {
      const colliderGeo = new THREE.SphereGeometry(radius, 12, 12);
      const colliderMat = new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        opacity: 0,
      });
      const collider = new THREE.Mesh(colliderGeo, colliderMat);
      collider.userData = { disciplineId: id, isCollider: true };
      group.add(collider);

      // Also recursively assign userData to all child meshes for deep raycasting safety
      group.traverse((child) => {
        child.userData = { ...child.userData, disciplineId: id };
      });
    };

    // 6. Construct Six Premium 3D Artefacts
    const disciplineMeshes: {
      id: CreativeDiscipline;
      group: THREE.Group;
      innerMesh: THREE.Object3D;
      config: DisciplineObjectConfig;
      dragOffset: THREE.Vector3;
      dragRotation: THREE.Euler;
    }[] = [];

    // Artefact 1: Motion (Fluid Kinetic Ribbon & Translucent Orbital Ring)
    {
      const group = new THREE.Group();
      const knotGeo = new THREE.TorusKnotGeometry(0.68, 0.17, 128, 32, 2, 3);
      const knotMat = new THREE.MeshPhysicalMaterial({
        color: 0xf43f5e,
        roughness: 0.12,
        metalness: 0.25,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        transmission: 0.35,
        ior: 1.5,
        thickness: 0.8,
        emissive: 0x881337,
        emissiveIntensity: isDarkTheme ? 0.35 : 0.15,
      });
      const knotMesh = new THREE.Mesh(knotGeo, knotMat);
      group.add(knotMesh);

      // Subtle orbiting accent halo
      const haloGeo = new THREE.TorusGeometry(1.05, 0.02, 16, 64);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfb7185,
        transparent: true,
        opacity: isDarkTheme ? 0.5 : 0.3,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 3;
      group.add(haloMesh);

      group.position.set(...objectConfigs[0].initialPos);
      group.rotation.set(...objectConfigs[0].initialRot);
      attachCollider(group, 'motion', 1.35);
      constellationGroup.add(group);
      disciplineMeshes.push({
        id: 'motion',
        group,
        innerMesh: knotMesh,
        config: objectConfigs[0],
        dragOffset: new THREE.Vector3(),
        dragRotation: new THREE.Euler(),
      });
    }

    // Artefact 2: 3D (Refractive Prismatic Crystal & Chrome Wire Lattice)
    {
      const group = new THREE.Group();
      const crystalGeo = new THREE.OctahedronGeometry(0.88, 1);
      const crystalMat = new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        roughness: 0.04,
        metalness: 0.08,
        transmission: 0.88,
        thickness: 1.4,
        ior: 1.72,
        clearcoat: 1.0,
        specularIntensity: 1.0,
        emissive: 0x083344,
        emissiveIntensity: isDarkTheme ? 0.3 : 0.1,
      });
      const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
      group.add(crystalMesh);

      const innerGeo = new THREE.OctahedronGeometry(0.42, 0);
      const innerMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x0284c7,
        emissiveIntensity: 0.5,
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      group.add(innerMesh);

      const wireGeo = new THREE.IcosahedronGeometry(1.08, 0);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: isDarkTheme ? 0.35 : 0.25,
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      group.add(wireMesh);

      group.position.set(...objectConfigs[1].initialPos);
      group.rotation.set(...objectConfigs[1].initialRot);
      attachCollider(group, '3d', 1.4);
      constellationGroup.add(group);
      disciplineMeshes.push({
        id: '3d',
        group,
        innerMesh: crystalMesh,
        config: objectConfigs[1],
        dragOffset: new THREE.Vector3(),
        dragRotation: new THREE.Euler(),
      });
    }

    // Artefact 3: Brand (Layered Dimensional Brushed Brass & Embossed Card)
    {
      const group = new THREE.Group();
      const plaqueGeo = new THREE.BoxGeometry(1.15, 1.45, 0.08);
      const plaqueMat = new THREE.MeshStandardMaterial({
        color: 0xeab308,
        roughness: 0.28,
        metalness: 0.85,
      });
      const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
      group.add(plaqueMesh);

      const foldGeo = new THREE.BoxGeometry(0.85, 0.85, 0.05);
      const foldMat = new THREE.MeshStandardMaterial({
        color: isDarkTheme ? 0xfef08a : 0xfef9c3,
        roughness: 0.18,
        metalness: 0.92,
      });
      const foldMesh = new THREE.Mesh(foldGeo, foldMat);
      foldMesh.position.set(0.18, -0.22, 0.07);
      foldMesh.rotation.z = 0.22;
      group.add(foldMesh);

      const badgeGeo = new THREE.TorusGeometry(0.28, 0.04, 16, 32);
      const badgeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.95,
        roughness: 0.1,
      });
      const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
      badgeMesh.position.set(0, 0.25, 0.06);
      group.add(badgeMesh);

      group.position.set(...objectConfigs[2].initialPos);
      group.rotation.set(...objectConfigs[2].initialRot);
      attachCollider(group, 'brand', 1.35);
      constellationGroup.add(group);
      disciplineMeshes.push({
        id: 'brand',
        group,
        innerMesh: plaqueMesh,
        config: objectConfigs[2],
        dragOffset: new THREE.Vector3(),
        dragRotation: new THREE.Euler(),
      });
    }

    // Artefact 4: UI/UX (Floating Frosted Acrylic Slabs & Micro Luminous Elements)
    {
      const group = new THREE.Group();
      const slabGeo = new THREE.BoxGeometry(1.35, 0.92, 0.06);
      const slabMat = new THREE.MeshPhysicalMaterial({
        color: 0x8b5cf6,
        roughness: 0.1,
        metalness: 0.05,
        transmission: 0.78,
        thickness: 0.85,
        ior: 1.52,
        clearcoat: 1.0,
        emissive: 0x3b0764,
        emissiveIntensity: isDarkTheme ? 0.25 : 0.08,
      });
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      group.add(slabMesh);

      const barGeo = new THREE.BoxGeometry(0.92, 0.22, 0.08);
      const barMat = new THREE.MeshStandardMaterial({
        color: 0xc4b5fd,
        roughness: 0.2,
        metalness: 0.35,
      });
      const barMesh = new THREE.Mesh(barGeo, barMat);
      barMesh.position.set(0, -0.22, 0.06);
      group.add(barMesh);

      const dotGeo = new THREE.SphereGeometry(0.06, 16, 16);
      const dotMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xd8b4fe,
        emissiveIntensity: 0.8,
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.set(-0.35, 0.22, 0.06);
      group.add(dotMesh);

      group.position.set(...objectConfigs[3].initialPos);
      group.rotation.set(...objectConfigs[3].initialRot);
      attachCollider(group, 'ui', 1.35);
      constellationGroup.add(group);
      disciplineMeshes.push({
        id: 'ui',
        group,
        innerMesh: slabMesh,
        config: objectConfigs[3],
        dragOffset: new THREE.Vector3(),
        dragRotation: new THREE.Euler(),
      });
    }

    // Artefact 5: Web (Modular Architectural Matrix & Glowing Edge Lines)
    {
      const group = new THREE.Group();
      const size = 0.36;
      const boxGeo = new THREE.BoxGeometry(size, size, size);
      const edgeGeo = new THREE.EdgesGeometry(boxGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x34d399,
        linewidth: 2,
      });

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          if ((x + y) % 2 === 0) {
            const mat = new THREE.MeshStandardMaterial({
              color: 0x10b981,
              roughness: 0.28,
              metalness: 0.65,
            });
            const cube = new THREE.Mesh(boxGeo, mat);
            cube.position.set(x * 0.46, y * 0.46, (x - y) * 0.15);
            const wire = new THREE.LineSegments(edgeGeo, edgeMat);
            cube.add(wire);
            group.add(cube);
          }
        }
      }

      group.position.set(...objectConfigs[4].initialPos);
      group.rotation.set(...objectConfigs[4].initialRot);
      attachCollider(group, 'web', 1.35);
      constellationGroup.add(group);
      disciplineMeshes.push({
        id: 'web',
        group,
        innerMesh: group,
        config: objectConfigs[4],
        dragOffset: new THREE.Vector3(),
        dragRotation: new THREE.Euler(),
      });
    }

    // Artefact 6: Sound (Acoustic Gyroscopic Bronze Rings & Pulsating Harmonic Core)
    {
      const group = new THREE.Group();
      const ringRadii = [0.38, 0.62, 0.86];
      ringRadii.forEach((radius, idx) => {
        const ringGeo = new THREE.TorusGeometry(radius, 0.05, 24, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xf97316,
          roughness: 0.22,
          metalness: 0.85,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2 + idx * 0.35;
        ringMesh.rotation.y = idx * 0.45;
        group.add(ringMesh);
      });

      const sphereGeo = new THREE.SphereGeometry(0.24, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xfdba74,
        roughness: 0.08,
        metalness: 0.95,
        emissive: 0xea580c,
        emissiveIntensity: isDarkTheme ? 0.35 : 0.15,
      });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphereMesh);

      group.position.set(...objectConfigs[5].initialPos);
      group.rotation.set(...objectConfigs[5].initialRot);
      attachCollider(group, 'sound', 1.35);
      constellationGroup.add(group);
      disciplineMeshes.push({
        id: 'sound',
        group,
        innerMesh: group,
        config: objectConfigs[5],
        dragOffset: new THREE.Vector3(),
        dragRotation: new THREE.Euler(),
      });
    }

    // 7. Interactive Raycasting & Pointer Separation (Hover vs Click vs Drag)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Pointer state tracking
    let isPointerDown = false;
    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownTime = 0;
    let isDragging = false;
    let targetDisciplineOnDown: CreativeDiscipline | null = null;
    const DRAG_THRESHOLD_PX = 6;

    const getRaycastDiscipline = (clientX: number, clientY: number): CreativeDiscipline | null => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        for (const hit of intersects) {
          let currentObj: THREE.Object3D | null = hit.object;
          while (currentObj) {
            if (currentObj.userData && currentObj.userData.disciplineId) {
              return currentObj.userData.disciplineId as CreativeDiscipline;
            }
            currentObj = currentObj.parent;
          }
        }
      }
      return null;
    };

    const onPointerDown = (event: PointerEvent) => {
      isPointerDown = true;
      isDragging = false;
      pointerDownPos = { x: event.clientX, y: event.clientY };
      pointerDownTime = performance.now();
      targetDisciplineOnDown = getRaycastDiscipline(event.clientX, event.clientY);

      try {
        container.setPointerCapture(event.pointerId);
      } catch {
        // Fallback for environments where pointerCapture is restricted
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - pointerDownPos.x;
      const deltaY = event.clientY - pointerDownPos.y;
      const dist = Math.hypot(deltaX, deltaY);

      if (isPointerDown) {
        if (!isDragging && dist > DRAG_THRESHOLD_PX) {
          isDragging = true;
        }

        if (isDragging) {
          // If dragging an object, apply rotational momentum to the targeted discipline group
          if (targetDisciplineOnDown) {
            const foundItem = disciplineMeshes.find((m) => m.id === targetDisciplineOnDown);
            if (foundItem) {
              foundItem.group.rotation.y += deltaX * 0.005;
              foundItem.group.rotation.x += deltaY * 0.005;
            }
          } else {
            // If dragging background, rotate the entire constellation subtly
            constellationGroup.rotation.y += deltaX * 0.002;
            constellationGroup.rotation.x += deltaY * 0.002;
          }
          pointerDownPos = { x: event.clientX, y: event.clientY };
        }
      } else {
        // Pure hover handling when pointer is not pressed
        const hovered = getRaycastDiscipline(event.clientX, event.clientY);
        setHoveredDiscipline(hovered);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {
        // Ignored safely
      }

      const elapsed = performance.now() - pointerDownTime;
      const deltaX = event.clientX - pointerDownPos.x;
      const deltaY = event.clientY - pointerDownPos.y;
      const dist = Math.hypot(deltaX, deltaY);

      // If moved within small threshold and quick duration -> Treat strictly as CLICK/TAP
      if (!isDragging && dist <= DRAG_THRESHOLD_PX && elapsed < 600) {
        const clickedId = targetDisciplineOnDown || getRaycastDiscipline(event.clientX, event.clientY);
        if (clickedId) {
          const currentActive = activeDisciplineRef.current;
          onSelectDisciplineRef.current(currentActive === clickedId ? 'all' : clickedId);
        }
      }

      isPointerDown = false;
      isDragging = false;
      targetDisciplineOnDown = null;
    };

    const onPointerCancel = (event: PointerEvent) => {
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {
        // Ignored safely
      }
      isPointerDown = false;
      isDragging = false;
      targetDisciplineOnDown = null;
    };

    const onPointerLeave = () => {
      if (!isPointerDown) {
        setHoveredDiscipline(null);
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerCancel);
    container.addEventListener('pointerleave', onPointerLeave);

    // 8. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const currentActive = activeDisciplineRef.current;
      const currentHover = hoveredDisciplineRef.current;
      const reducedMotion = isReducedMotionRef.current;

      // Particle subtle flow
      if (!reducedMotion) {
        particleSystem.rotation.y = elapsedTime * 0.025;
        particleSystem.rotation.x = Math.sin(elapsedTime * 0.02) * 0.04;
      }

      // Constellation spring back towards center rotation if released
      if (!isDragging) {
        constellationGroup.rotation.x += (0 - constellationGroup.rotation.x) * 0.04;
        constellationGroup.rotation.y += (0 - constellationGroup.rotation.y) * 0.04;
      }

      // Animate each discipline object with individual motion & spring responses
      disciplineMeshes.forEach((item, index) => {
        const isSelected = currentActive === item.id;
        const isHovered = currentHover === item.id;
        const hasSelection = currentActive !== 'all';
        const isMuted = hasSelection && !isSelected;

        // Base floating motion
        const floatOffset = reducedMotion
          ? 0
          : Math.sin(elapsedTime * 1.4 + index * 1.1) * 0.08;

        // Target positions based on selection state
        const targetX = item.config.initialPos[0];
        const targetY = item.config.initialPos[1] + floatOffset;
        let targetZ = item.config.initialPos[2];

        if (isSelected) {
          targetZ = item.config.initialPos[2] + 1.6; // Moves forward in depth
        } else if (isHovered) {
          targetZ = item.config.initialPos[2] + 0.6;
        } else if (isMuted) {
          targetZ = item.config.initialPos[2] - 0.8; // Calms down in background
        }

        // Smooth Lerp Position
        item.group.position.x += (targetX - item.group.position.x) * 0.08;
        item.group.position.y += (targetY - item.group.position.y) * 0.08;
        item.group.position.z += (targetZ - item.group.position.z) * 0.08;

        // Rotation choreography (disabled when reduced motion is requested or when user is actively dragging that item)
        if (!reducedMotion && !(isDragging && targetDisciplineOnDown === item.id)) {
          if (item.id === 'motion') {
            item.group.rotation.x += 0.008;
            item.group.rotation.y += 0.012;
          } else if (item.id === '3d') {
            item.group.rotation.y += 0.015;
            item.group.rotation.z += 0.005;
          } else if (item.id === 'brand') {
            item.group.rotation.y = item.config.initialRot[1] + Math.sin(elapsedTime * 1.2) * 0.15;
          } else if (item.id === 'ui') {
            item.group.rotation.x = item.config.initialRot[0] + Math.cos(elapsedTime * 1.1) * 0.1;
          } else if (item.id === 'web') {
            item.group.rotation.x += 0.006;
            item.group.rotation.y += 0.008;
          } else if (item.id === 'sound') {
            item.group.rotation.z += 0.018;
          }
        }

        // Visual scale & opacity damping for muted objects
        const targetScale = isSelected ? 1.2 : isHovered ? 1.1 : isMuted ? 0.75 : 1.0;
        item.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling via ResizeObserver for precise container alignment
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || 800;
      const newHeight = container.clientHeight || 500;
      updateCameraDistance(newWidth, newHeight);
      renderer.setSize(newWidth, newHeight);
    };

    resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerCancel);
      container.removeEventListener('pointerleave', onPointerLeave);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, [isDarkTheme]);

  const activeConfig = objectConfigs.find((c) => c.id === activeDiscipline);
  const hoveredConfig = objectConfigs.find((c) => c.id === hoveredDiscipline);

  return (
    <section 
      id="frantos-creative-core-section" 
      className="relative w-full max-w-7xl mx-auto my-6 px-4 md:px-8"
      aria-label="FrantoS Creative Core Interactive 3D Canvas"
    >
      {/* Editorial Header Block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs tracking-wider uppercase text-cyan-600 dark:text-cyan-400 font-semibold">
              Spatial Artifact 001 // Core Engine
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-[#111317] dark:text-[#F3F1EC]">
            FRANTOS CREATIVE CORE
          </h2>
          <p className="mt-1 text-sm md:text-base text-[#4A505C] dark:text-[#A0A6B2] max-w-xl">
            An interactive 3D constellation of six creative disciplines. Select any spatial artifact to focus 
            the studio workspace and filter the creative feed.
          </p>
        </div>

        {/* Selected Discipline Status Badge */}
        <div className="flex items-center gap-3">
          {activeDiscipline !== 'all' && (
            <button
              id="btn-reset-disciplines"
              onClick={() => onSelectDiscipline('all')}
              className="px-3.5 py-2 rounded-full text-xs font-mono tracking-wide bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/15 text-[#111317] dark:text-[#F3F1EC] transition-all flex items-center gap-2"
              aria-label="Reset to all disciplines"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to All Disciplines</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-md text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span className="text-zinc-700 dark:text-zinc-300">
              {activeDiscipline === 'all' ? '6 Active Disciplines' : `Focused: ${activeConfig?.name}`}
            </span>
          </div>
        </div>
      </div>

      {/* 3D Spatial Canvas Stage */}
      <div 
        id="creative-core-3d-stage"
        tabIndex={0}
        onKeyDown={(e) => {
          const disciplineIds: CreativeDiscipline[] = ['motion', '3d', 'brand', 'ui', 'web', 'sound'];
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const currIdx = hoveredDiscipline ? disciplineIds.indexOf(hoveredDiscipline) : (activeDiscipline !== 'all' ? disciplineIds.indexOf(activeDiscipline) : -1);
            const nextIdx = (currIdx + 1) % disciplineIds.length;
            setHoveredDiscipline(disciplineIds[nextIdx]);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const currIdx = hoveredDiscipline ? disciplineIds.indexOf(hoveredDiscipline) : (activeDiscipline !== 'all' ? disciplineIds.indexOf(activeDiscipline) : 0);
            const prevIdx = (currIdx - 1 + disciplineIds.length) % disciplineIds.length;
            setHoveredDiscipline(disciplineIds[prevIdx]);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (hoveredDiscipline) {
              onSelectDiscipline(activeDiscipline === hoveredDiscipline ? 'all' : hoveredDiscipline);
            }
          } else if (e.key === 'Escape') {
            onSelectDiscipline('all');
            setHoveredDiscipline(null);
          }
        }}
        className="relative w-full h-[360px] xs:h-[420px] sm:h-[480px] md:h-[580px] rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 bg-gradient-to-b from-[#FAF8F5] via-[#F4F1EA] to-[#EAE6DD] dark:from-[#090B0E]/90 dark:via-[#0B0F17]/95 dark:to-[#090B0E] shadow-xl dark:shadow-2xl transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        role="region"
        aria-label="3D Creative Core Canvas. Tap or drag artifacts to interact. Use Arrow keys to navigate, Space or Enter to select."
      >
        {/* Interactive Three.js Mount Container (Native browser cursor) */}
        <div 
          ref={mountRef} 
          className="w-full h-full cursor-pointer relative z-10 touch-none select-none"
          role="img"
          aria-label="Interactive 3D representation of six creative disciplines"
        />

        {/* Ambient Corner Technical Metadata */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none hidden md:block">
          <div className="p-3 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-md border border-black/5 dark:border-white/10 text-[11px] font-mono space-y-1">
            <div className="text-zinc-700 dark:text-zinc-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
              RENDER PIPELINE: WEBGL 2.0 / PBR
            </div>
            <div className="text-zinc-500 dark:text-zinc-500">
              PHYSICS: SPATIAL LERP DYNAMICS
            </div>
          </div>
        </div>

        {/* Hover / Active Floating Capsule Tooltip */}
        {(hoveredConfig || activeConfig) && (
          <div 
            id={tooltipId}
            className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 md:right-auto md:max-w-md z-30 pointer-events-none transition-all duration-300"
          >
            <div className="p-3 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#11141A]/95 backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-xl text-[#111317] dark:text-[#F3F1EC]">
              <div className="flex items-center justify-between gap-2 sm:gap-3 mb-1 sm:mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: (hoveredConfig || activeConfig)?.colorHex ? `#${(hoveredConfig || activeConfig)?.colorHex.toString(16).padStart(6, '0')}` : '#06B6D4' }} 
                  />
                  <h4 className="font-display font-bold text-sm sm:text-base tracking-tight truncate">
                    {(hoveredConfig || activeConfig)?.name}
                  </h4>
                </div>
                <span className="font-mono text-[9px] sm:text-[10px] uppercase px-1.5 sm:px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                  {(hoveredConfig || activeConfig)?.materialType.split('&')[0]}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#4A505C] dark:text-[#A0A6B2] leading-relaxed line-clamp-2 sm:line-clamp-none">
                {(hoveredConfig || activeConfig)?.subtitle}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Accessible Interactive Discipline Selector Navigation Pills */}
      <nav 
        aria-label="Filter exhibits by creative discipline" 
        className="mt-4 sm:mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5"
      >
        {CREATIVE_DISCIPLINES.map((disc) => {
          const isSelected = activeDiscipline === disc.id;
          return (
            <button
              key={disc.id}
              id={`discipline-pill-${disc.id}`}
              onClick={() => onSelectDiscipline(isSelected ? 'all' : (disc.id as CreativeDiscipline))}
              className={`group min-h-[52px] px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-black/10 dark:bg-white/15 border-black/20 dark:border-white/30 shadow-md'
                  : 'bg-white/80 dark:bg-white/5 border-black/10 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-center justify-between w-full mb-0.5 sm:mb-1">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: disc.color }} 
                />
                {isSelected && <Check className="w-3.5 h-3.5 text-[#111317] dark:text-white" />}
              </div>
              <span className="text-xs font-display font-semibold tracking-tight text-[#111317] dark:text-[#F3F1EC] truncate">
                {disc.label}
              </span>
              <span className="text-[10px] text-[#4A505C] dark:text-[#6B7280] truncate">
                {disc.desc.split(',')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </section>
  );
};
