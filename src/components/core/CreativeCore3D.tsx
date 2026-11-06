import React, { useEffect, useRef, useState, useId } from 'react';
import * as THREE from 'three';
import { CreativeDiscipline, ProjectExhibit } from '../../types';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { Sparkles, RotateCcw, ArrowRight, ExternalLink, Box, Eye, Layers } from 'lucide-react';

import { useLanguage } from '../../i18n/LanguageContext';

interface CreativeCore3DProps {
  activeDiscipline: CreativeDiscipline | 'all';
  onSelectDiscipline: (discipline: CreativeDiscipline | 'all') => void;
  isDarkTheme?: boolean;
  exhibits?: ProjectExhibit[];
  onSelectExhibit?: (exhibit: ProjectExhibit) => void;
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
  exhibits = [],
  onSelectExhibit,
}) => {
  const { t, language } = useLanguage();
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredDiscipline, setHoveredDiscipline] = useState<CreativeDiscipline | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [mobileViewMode, setMobileViewMode] = useState<'3d' | 'list'>('3d');
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

  // Check reduced motion preference & WebGL support
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglSupported(Boolean(gl));
    } catch {
      setWebglSupported(false);
    }

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

  // Map each discipline to a flagship project
  const getDisciplineProject = (disciplineId: CreativeDiscipline): ProjectExhibit | undefined => {
    return exhibits.find((ex) => ex.discipline === disciplineId) || exhibits[0];
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !webglSupported) return;

    let animationFrameId: number;
    let resizeObserver: ResizeObserver | null = null;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Constellation Root Group
    const scene = new THREE.Scene();
    const constellationGroup = new THREE.Group();
    scene.add(constellationGroup);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
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
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
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
    } catch {
      setWebglSupported(false);
      return;
    }

    // 3. Lighting
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

    // 4. Subtle Particles
    const particleCount = isDarkTheme ? 180 : 80;
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
      opacity: isDarkTheme ? 0.4 : 0.25,
      blending: isDarkTheme ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    const attachCollider = (group: THREE.Group, id: CreativeDiscipline, radius = 1.35) => {
      const colliderGeo = new THREE.SphereGeometry(radius, 12, 12);
      const colliderMat = new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        opacity: 0,
      });
      const collider = new THREE.Mesh(colliderGeo, colliderMat);
      collider.userData = { disciplineId: id, isCollider: true };
      group.add(collider);

      group.traverse((child) => {
        child.userData = { ...child.userData, disciplineId: id };
      });
    };

    const disciplineMeshes: {
      id: CreativeDiscipline;
      group: THREE.Group;
      config: DisciplineObjectConfig;
    }[] = [];

    // Motion
    {
      const group = new THREE.Group();
      const knotGeo = new THREE.TorusKnotGeometry(0.68, 0.17, 128, 32, 2, 3);
      const knotMat = new THREE.MeshPhysicalMaterial({
        color: 0xf43f5e,
        roughness: 0.12,
        metalness: 0.25,
        clearcoat: 1.0,
        transmission: 0.35,
        ior: 1.5,
        emissive: 0x881337,
        emissiveIntensity: isDarkTheme ? 0.35 : 0.15,
      });
      group.add(new THREE.Mesh(knotGeo, knotMat));

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
      attachCollider(group, 'motion');
      constellationGroup.add(group);
      disciplineMeshes.push({ id: 'motion', group, config: objectConfigs[0] });
    }

    // 3D
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
        emissive: 0x083344,
        emissiveIntensity: isDarkTheme ? 0.3 : 0.1,
      });
      group.add(new THREE.Mesh(crystalGeo, crystalMat));

      const wireGeo = new THREE.IcosahedronGeometry(1.08, 0);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: isDarkTheme ? 0.35 : 0.25,
      });
      group.add(new THREE.Mesh(wireGeo, wireMat));

      group.position.set(...objectConfigs[1].initialPos);
      group.rotation.set(...objectConfigs[1].initialRot);
      attachCollider(group, '3d');
      constellationGroup.add(group);
      disciplineMeshes.push({ id: '3d', group, config: objectConfigs[1] });
    }

    // Brand
    {
      const group = new THREE.Group();
      const plaqueGeo = new THREE.BoxGeometry(1.15, 1.45, 0.08);
      const plaqueMat = new THREE.MeshStandardMaterial({
        color: 0xeab308,
        roughness: 0.28,
        metalness: 0.85,
      });
      group.add(new THREE.Mesh(plaqueGeo, plaqueMat));

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
      attachCollider(group, 'brand');
      constellationGroup.add(group);
      disciplineMeshes.push({ id: 'brand', group, config: objectConfigs[2] });
    }

    // UI/UX
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
      group.add(new THREE.Mesh(slabGeo, slabMat));

      group.position.set(...objectConfigs[3].initialPos);
      group.rotation.set(...objectConfigs[3].initialRot);
      attachCollider(group, 'ui');
      constellationGroup.add(group);
      disciplineMeshes.push({ id: 'ui', group, config: objectConfigs[3] });
    }

    // Web
    {
      const group = new THREE.Group();
      const size = 0.36;
      const boxGeo = new THREE.BoxGeometry(size, size, size);
      const edgeGeo = new THREE.EdgesGeometry(boxGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 });

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
            cube.add(new THREE.LineSegments(edgeGeo, edgeMat));
            group.add(cube);
          }
        }
      }

      group.position.set(...objectConfigs[4].initialPos);
      group.rotation.set(...objectConfigs[4].initialRot);
      attachCollider(group, 'web');
      constellationGroup.add(group);
      disciplineMeshes.push({ id: 'web', group, config: objectConfigs[4] });
    }

    // Sound
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
      group.add(new THREE.Mesh(sphereGeo, sphereMat));

      group.position.set(...objectConfigs[5].initialPos);
      group.rotation.set(...objectConfigs[5].initialRot);
      attachCollider(group, 'sound');
      constellationGroup.add(group);
      disciplineMeshes.push({ id: 'sound', group, config: objectConfigs[5] });
    }

    // Pointer & Raycasting
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

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
      } catch {}
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
          if (targetDisciplineOnDown) {
            const foundItem = disciplineMeshes.find((m) => m.id === targetDisciplineOnDown);
            if (foundItem) {
              foundItem.group.rotation.y += deltaX * 0.005;
              foundItem.group.rotation.x += deltaY * 0.005;
            }
          } else {
            constellationGroup.rotation.y += deltaX * 0.002;
            constellationGroup.rotation.x += deltaY * 0.002;
          }
          pointerDownPos = { x: event.clientX, y: event.clientY };
        }
      } else {
        const hovered = getRaycastDiscipline(event.clientX, event.clientY);
        setHoveredDiscipline(hovered);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {}

      const elapsed = performance.now() - pointerDownTime;
      const deltaX = event.clientX - pointerDownPos.x;
      const deltaY = event.clientY - pointerDownPos.y;
      const dist = Math.hypot(deltaX, deltaY);

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

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', () => setHoveredDiscipline(null));

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const currentActive = activeDisciplineRef.current;
      const currentHover = hoveredDisciplineRef.current;
      const reducedMotion = isReducedMotionRef.current;

      if (!reducedMotion) {
        particleSystem.rotation.y = elapsedTime * 0.02;
      }

      if (!isDragging) {
        constellationGroup.rotation.x += (0 - constellationGroup.rotation.x) * 0.04;
        constellationGroup.rotation.y += (0 - constellationGroup.rotation.y) * 0.04;
      }

      disciplineMeshes.forEach((item, index) => {
        const isSelected = currentActive === item.id;
        const isHovered = currentHover === item.id;
        const hasSelection = currentActive !== 'all';
        const isMuted = hasSelection && !isSelected;

        const floatOffset = reducedMotion
          ? 0
          : Math.sin(elapsedTime * 1.3 + index * 1.1) * 0.08;

        const targetX = item.config.initialPos[0];
        const targetY = item.config.initialPos[1] + floatOffset;
        let targetZ = item.config.initialPos[2];

        if (isSelected) {
          targetZ = item.config.initialPos[2] + 1.5;
        } else if (isHovered) {
          targetZ = item.config.initialPos[2] + 0.6;
        } else if (isMuted) {
          targetZ = item.config.initialPos[2] - 0.8;
        }

        item.group.position.x += (targetX - item.group.position.x) * 0.08;
        item.group.position.y += (targetY - item.group.position.y) * 0.08;
        item.group.position.z += (targetZ - item.group.position.z) * 0.08;

        if (!reducedMotion && !(isDragging && targetDisciplineOnDown === item.id)) {
          if (item.id === 'motion') {
            item.group.rotation.x += 0.008;
            item.group.rotation.y += 0.012;
          } else if (item.id === '3d') {
            item.group.rotation.y += 0.014;
          } else if (item.id === 'brand') {
            item.group.rotation.y = item.config.initialRot[1] + Math.sin(elapsedTime * 1.1) * 0.12;
          } else if (item.id === 'ui') {
            item.group.rotation.x = item.config.initialRot[0] + Math.cos(elapsedTime * 1.0) * 0.1;
          } else if (item.id === 'web') {
            item.group.rotation.x += 0.006;
            item.group.rotation.y += 0.008;
          } else if (item.id === 'sound') {
            item.group.rotation.z += 0.015;
          }
        }

        const targetScale = isSelected ? 1.2 : isHovered ? 1.08 : isMuted ? 0.75 : 1.0;
        item.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || 800;
      const newHeight = container.clientHeight || 500;
      updateCameraDistance(newWidth, newHeight);
      renderer.setSize(newWidth, newHeight);
    };

    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, [isDarkTheme, webglSupported]);

  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(() => exhibits[0]?.id || null);

  // Sync hero project with discipline selection
  const focusedDiscipline = (activeDiscipline !== 'all' ? activeDiscipline : hoveredDiscipline) || null;
  const activeConfig = objectConfigs.find((c) => c.id === focusedDiscipline);
  const disciplineLinkedProject = focusedDiscipline ? getDisciplineProject(focusedDiscipline) : undefined;

  // Resolve current active hero project
  const currentHeroProject: ProjectExhibit = 
    (selectedHeroId ? exhibits.find((ex) => ex.id === selectedHeroId) : null) || 
    disciplineLinkedProject || 
    exhibits[0] || {
      id: 'default-hero',
      title: 'Resonant Spatial Identity',
      description: 'Generative dimensional brand system and refractive lighting studies.',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=85',
      discipline: '3d',
      format: 'finished-case-study',
      author: {
        id: 'elena-rostova',
        name: 'Елена Ростова',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'Арт-директор & Spatial Architect',
      },
      year: '2026',
      likesCount: 142,
      savesCount: 88,
      tags: ['Spatial', 'Caustics', 'C4D'],
    };

  const handleSelectSatelliteProject = (project: ProjectExhibit) => {
    setSelectedHeroId(project.id);
    onSelectDiscipline(project.discipline);
  };

  return (
    <section 
      id="frantos-atelier-hero-stage" 
      className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-6 pb-8"
      aria-label="Atelier Hero Stage & Living Archive"
    >
      {/* =========================================================================
          1. ATELIER HERO STAGE — ACTIVE / LAST WORK IN LARGE VIEW
          ========================================================================= */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-black/8 dark:border-white/8 bg-[#0E1015] dark:bg-[#0E1015] text-[#F5F3EF] shadow-2xl transition-all">
        
        {/* Cinematic Backdrop Image */}
        <div className="relative w-full h-[280px] xs:h-[340px] sm:h-[420px] lg:h-[500px] overflow-hidden group">
          <img
            src={currentHeroProject.coverImage}
            alt={currentHeroProject.title}
            className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
          />

          {/* Gradients to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080B] via-[#07080B]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07080B]/90 via-[#07080B]/40 to-transparent sm:max-w-2xl" />

          {/* Top Stage Badges & Status */}
          <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 font-mono text-xs tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-ultramarine animate-ping" />
              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#F5F3EF] border border-white/10 font-bold">
                {t.overview.centerpieceBadge}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-zinc-300 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <span className="uppercase">{currentHeroProject.discipline}</span>
              <span>•</span>
              <span>{currentHeroProject.year || '2026'}</span>
            </div>
          </div>

          {/* Hero Content Overlay: Title, Author, Description & Primary Open Action */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 flex flex-col md:flex-row md:items-end justify-between gap-4 z-20">
            <div className="max-w-2xl min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-ultramarine font-semibold tracking-wider uppercase">
                <span>// {currentHeroProject.discipline.toUpperCase()}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">{currentHeroProject.author.name}</span>
                {currentHeroProject.wipProgress !== undefined && currentHeroProject.wipProgress < 100 && (
                  <span className="text-amber-400 font-bold">
                    ({language === 'ru' ? 'В процессе' : 'In production'}: {currentHeroProject.wipProgress}%)
                  </span>
                )}
              </div>

              <h1 className="font-display font-extrabold text-2xl xs:text-3xl sm:text-5xl lg:text-6xl text-[#F5F3EF] tracking-tight leading-[1.08] drop-shadow-md">
                {currentHeroProject.title}
              </h1>

              <p className="hidden sm:block text-xs sm:text-sm text-[#A3A099] line-clamp-2 max-w-xl leading-relaxed">
                {currentHeroProject.description}
              </p>
            </div>

            {/* Primary Action Button: «Продолжить работу» / «Continue Working» */}
            <div className="flex items-center gap-3 flex-shrink-0 pt-1">
              {onSelectExhibit && (
                <button
                  type="button"
                  onClick={() => onSelectExhibit(currentHeroProject)}
                  className="min-h-[48px] px-6 py-3 rounded-full bg-ultramarine hover:bg-blue-600 text-white font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-ultramarine/30 cursor-pointer active:scale-95 touch-target"
                >
                  <span>{t.overview.continueWorking}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. COMPACT SATELLITE SWITCHER STRIP («КАССЕТА ПРОЕКТОВ»)
            ========================================================================= */}
        <div className="border-t border-black/8 dark:border-white/8 bg-[#090B0E]/95 backdrop-blur-xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 mb-2 px-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A099] font-semibold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-ultramarine" />
              <span>{t.overview.orbitNav}</span>
            </span>

            {/* Mobile 3D Toggle */}
            <button
              type="button"
              onClick={() => setMobileViewMode((prev) => (prev === '3d' ? 'list' : '3d'))}
              className="sm:hidden text-[11px] font-mono text-ultramarine hover:underline cursor-pointer flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{mobileViewMode === '3d' ? (language === 'ru' ? 'Скрыть 3D Орбиту' : 'Hide 3D Orbit') : (language === 'ru' ? 'Показать 3D Орбиту' : 'Show 3D Orbit')}</span>
            </button>
          </div>

          {/* Touch-Friendly Horizontal Carousel of Project Satellites */}
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-1">
            {exhibits.map((item) => {
              const isActive = currentHeroProject.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSatelliteProject(item)}
                  className={`min-h-[44px] flex-shrink-0 flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border transition-all text-left cursor-pointer touch-target ${
                    isActive
                      ? 'border-ultramarine bg-ultramarine/15 text-white ring-1 ring-ultramarine shadow-sm'
                      : 'border-white/10 bg-white/5 hover:border-white/20 text-[#A3A099] hover:text-white'
                  }`}
                  aria-pressed={isActive}
                >
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10 flex-shrink-0"
                  />
                  <div className="min-w-0 max-w-[140px] sm:max-w-[160px]">
                    <div className="text-xs font-semibold truncate text-[#F5F3EF]">
                      {item.title}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider truncate">
                      {item.discipline}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. FIRM 3D ORBIT CONSTELLATION COMPASS
          Interacting with orbit nodes updates the hero project above!
          ========================================================================= */}
      <div className={`mt-6 ${mobileViewMode === 'list' ? 'hidden sm:block' : 'block'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A099] font-semibold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-ultramarine" />
              <span>{t.overview.orbitCompass}</span>
            </span>
            <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-0.5">
              {t.overview.orbitHint}
            </p>
          </div>

          {activeDiscipline !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectDiscipline('all')}
              className="text-xs font-mono text-ultramarine hover:underline flex items-center gap-1.5 cursor-pointer touch-target"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.catalog.allDisciplines}</span>
            </button>
          )}
        </div>

        {/* Canvas Stage */}
        <div 
          id="creative-core-3d-stage"
          tabIndex={0}
          className="relative w-full h-[260px] xs:h-[300px] sm:h-[380px] lg:h-[420px] rounded-3xl overflow-hidden border border-black/8 dark:border-white/8 bg-gradient-to-b from-[#0A0B0E] via-[#0E1015] to-[#07080B] shadow-inner"
          role="region"
          aria-label="3D Constellation Orbit. Touch or drag to navigate disciplines."
        >
          {webglSupported ? (
            <div 
              ref={mountRef} 
              className="w-full h-full cursor-grab active:cursor-grabbing relative z-10 touch-none select-none"
              role="img"
              aria-label="Interactive 3D Constellation Orbit"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400">
              <Box className="w-10 h-10 text-ultramarine mb-2" />
              <p className="text-xs font-mono">Streamlined non-WebGL constellation mode active</p>
            </div>
          )}

          {/* Active Node Callout Card inside Orbit */}
          {activeConfig && (
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-auto">
              <div className="px-3.5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 text-xs font-mono text-white flex items-center gap-3">
                <span 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `#${activeConfig.colorHex.toString(16).padStart(6, '0')}` }}
                />
                <div>
                  <div className="font-bold">{activeConfig.name}</div>
                  <div className="text-[10px] text-zinc-400">{activeConfig.subtitle}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
