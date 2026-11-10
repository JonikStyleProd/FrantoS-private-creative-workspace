import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Download, Frame, Loader2, Package, PlusSquare, RectangleHorizontal, Smartphone } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ws } from '../ws/store';
import type { Project } from '../ws/types';
import { AssetThumb, toast } from '../ws/kit';
import { assetUrl } from '../ws/media';
import { Pane } from '../glass/kit';
import { renderBoard } from '../studio/compose';
import { downscale, stillToAsset } from '../studio/models';
import { isLite } from '../glass/perf';

/** Mockups: a picture or a board on a poster, a box, a business card or a phone — in a small 3D scene you can turn. */
const SCENES = [
  { id: 'poster', label: 'Poster on a wall', icon: Frame },
  { id: 'box', label: 'Packaging box', icon: Package },
  { id: 'card', label: 'Business cards', icon: RectangleHorizontal },
  { id: 'phone', label: 'Phone', icon: Smartphone },
] as const;
type SceneId = (typeof SCENES)[number]['id'];
type Source = { kind: 'asset' | 'board'; id: string };

const BGS = ['#e9e4da', '#d7dbe0', '#2a2d33', '#c9b8a3'];

export function MockupMode({ p }: { p: Project }) {
  const { t } = useI18n();
  const pics = useMemo(() => p.assets.filter((a) => a.kind === 'image' && (!a.format || a.format === 'screen' || a.format === 'svg')), [p.assets]);
  const boards = p.boards ?? [];
  const [scene, setScene] = useState<SceneId>('poster');
  // start from the finished work (the cover), not a board: it loads at once and reads as the project
  const [src, setSrc] = useState<Source | null>(() => {
    const cover = pics.find((a) => a.id === p.coverAssetId) ?? pics.find((a) => !a.isReference) ?? pics[0];
    return cover ? { kind: 'asset', id: cover.id } : boards[0] ? { kind: 'board', id: boards[0].id } : null;
  });
  const [bg, setBg] = useState(BGS[0]);
  const [busy, setBusy] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setTexture: (url: string) => void; setScene: (s: SceneId) => void; setBg: (c: string) => void; shot: () => Promise<Blob> } | null>(null);

  // the scene lives as long as the mode; textures and presets swap inside it
  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: !isLite(), preserveDrawingBuffer: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const sc = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    sc.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    sc.background = new THREE.Color(BGS[0]);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 1.2;
    controls.maxDistance = 9;
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.5, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 6;
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    sc.add(key, new THREE.AmbientLight(0xffffff, 0.35));

    const art = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
    let group = new THREE.Group();
    sc.add(group);
    let tex: THREE.Texture | null = null;
    let aspect = 1.414;
    let current: SceneId = 'poster';
    let bgColor = BGS[0];

    const paper = (c: number, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const build = (s: SceneId) => {
      sc.remove(group);
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      group = new THREE.Group();
      const col = new THREE.Color(bgColor);
      if (s === 'poster') {
        const h = 1.6;
        const w = h / aspect;
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), paper(col.getHex(), 0.95));
        wall.position.z = -0.03;
        wall.receiveShadow = true;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.03), paper(0x1a1a1a, 0.5));
        frame.castShadow = true;
        frame.position.z = 0;
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), art);
        pic.position.z = 0.0155;
        group.add(wall, frame, pic);
        group.position.y = 0.1;
        cam.position.set(1.1, 0.5, 3.6);
        controls.target.set(0, 0.1, 0);
      } else if (s === 'box') {
        const h = 1.1;
        const w = Math.min(1.2, h / aspect);
        const d = 0.45;
        const side = paper(new THREE.Color(bgColor).offsetHSL(0, 0, -0.25).getHex(), 0.7);
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, art, side]);
        box.castShadow = true;
        box.position.y = h / 2;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), paper(col.getHex(), 0.95));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        group.add(box, floor);
        cam.position.set(1.9, 1.3, 2.6);
        controls.target.set(0, 0.5, 0);
      } else if (s === 'card') {
        const w = 0.85;
        const h = 0.55;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), paper(col.getHex(), 0.95));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        group.add(floor);
        [
          { x: -0.25, z: 0.12, r: 0.22, y: 0.006, back: true },
          { x: 0.18, z: -0.05, r: -0.12, y: 0.014, back: false },
        ].forEach((c) => {
          const card = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, h), [paper(0xf7f5f0), paper(0xf7f5f0), c.back ? paper(new THREE.Color(bgColor).offsetHSL(0, 0, -0.35).getHex(), 0.6) : art, paper(0xf7f5f0), paper(0xf7f5f0), paper(0xf7f5f0)]);
          card.position.set(c.x, c.y, c.z);
          card.rotation.y = c.r;
          card.castShadow = true;
          card.receiveShadow = true;
          group.add(card);
        });
        cam.position.set(0.2, 1.6, 1.1);
        controls.target.set(0, 0, 0);
      } else {
        const h = 1.6;
        const w = 0.78;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.08), paper(0x111214, 0.35));
        body.castShadow = true;
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), art);
        screen.position.z = 0.0405;
        const phone = new THREE.Group();
        phone.add(body, screen);
        phone.rotation.set(-0.08, -0.32, 0.04);
        phone.position.y = 0.05;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), paper(col.getHex(), 0.95));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.95;
        floor.receiveShadow = true;
        group.add(phone, floor);
        cam.position.set(0.6, 0.3, 3.3);
        controls.target.set(0, 0, 0);
      }
      // a tall (phone) view steps back so the whole mockup stays in frame
      const asp = el.clientWidth / Math.max(1, el.clientHeight);
      if (asp < 1) cam.position.sub(controls.target).multiplyScalar(Math.pow(1 / asp, 0.75)).add(controls.target);
      sc.add(group);
      current = s;
    };

    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    build('poster');
    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(sc, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    api.current = {
      setTexture: (url) => {
        new THREE.TextureLoader().load(url, (tx) => {
          tx.colorSpace = THREE.SRGBColorSpace;
          tx.anisotropy = renderer.capabilities.getMaxAnisotropy();
          tex?.dispose();
          tex = tx;
          art.map = tx;
          art.needsUpdate = true;
          aspect = tx.image.height / tx.image.width;
          build(current);
        });
      },
      setScene: (s) => build(s),
      setBg: (c) => {
        bgColor = c;
        sc.background = new THREE.Color(c);
        build(current);
      },
      shot: () => {
        renderer.render(sc, cam);
        return new Promise((r) => renderer.domElement.toBlob((b) => r(b!), 'image/png'));
      },
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      tex?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => api.current?.setScene(scene), [scene]);
  useEffect(() => api.current?.setBg(bg), [bg]);
  useEffect(() => {
    if (!src) return;
    let live = true;
    (async () => {
      let url: string | undefined;
      if (src.kind === 'asset') {
        const a = p.assets.find((x) => x.id === src.id);
        url = a ? await assetUrl(a, 'full') : undefined;
      } else {
        const b = boards.find((x) => x.id === src.id);
        try {
          if (b) url = URL.createObjectURL(await downscale(await renderBoard(p, b), 2048, 'image/png'));
        } catch (err) {
          console.warn(err);
          if (live) toast(t('This board could not be drawn. Pick a picture instead.'), { tone: 'error' });
        }
      }
      if (live && url) api.current?.setTexture(url);
    })();
    return () => {
      live = false;
    };
  }, [src?.kind, src?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (to: 'download' | 'project') => {
    if (!api.current) return;
    setBusy(true);
    try {
      const blob = await api.current.shot();
      const label = t(SCENES.find((x) => x.id === scene)!.label);
      if (to === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${p.title.replace(/[^\p{L}\p{N}]+/gu, '-')}-mockup-${scene}.png`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } else {
        const bmp = await createImageBitmap(blob);
        const asset = await stillToAsset(await downscale(blob, 2400, 'image/webp'), bmp.width, bmp.height, `${p.title} · ${label}`);
        ws.addAsset(p.id, asset);
        const wid = ws.workFromAsset(p.id, asset.id);
        ws.setWorkType(p.id, wid, 'mockup');
        toast(t('Mockup added to the project'));
        go(`/p/${p.id}?s=make&i=${wid}`);
      }
    } catch {
      toast(t('Export failed.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0">
      <div ref={host} className="absolute inset-0" />
      <Pane className="lg-scroll absolute bottom-3 start-3 top-[76px] z-20 flex w-[min(300px,calc(100vw-24px))] flex-col gap-4 overflow-y-auto rounded-[24px] p-4 max-md:top-auto max-md:max-h-[42vh] sm:start-4 sm:top-[84px]">
        <div>
          <p className="lg-label mb-1.5">{t('Mockup')}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SCENES.map((s) => (
              <button key={s.id} type="button" onClick={() => setScene(s.id)} aria-pressed={scene === s.id} className={`flex min-h-[42px] items-center gap-1.5 rounded-[12px] px-2.5 text-start text-[12.5px] font-bold ${scene === s.id ? 'bg-white text-[#11151a]' : 'lg-soft hover:bg-white/15'}`}>
                <s.icon size={14} className="shrink-0" /> <span className="min-w-0">{t(s.label)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="lg-label mb-1.5">{t('Picture')}</p>
          {boards.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {boards.map((b) => (
                <button key={b.id} type="button" onClick={() => setSrc({ kind: 'board', id: b.id })} aria-pressed={src?.kind === 'board' && src.id === b.id} className={`max-w-full truncate rounded-full px-3 py-1.5 text-[12px] font-bold ${src?.kind === 'board' && src.id === b.id ? 'bg-white text-[#11151a]' : 'lg-soft'}`}>
                  {b.title}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-1.5">
            {pics.slice(0, 24).map((a) => (
              <button key={a.id} type="button" onClick={() => setSrc({ kind: 'asset', id: a.id })} aria-pressed={src?.kind === 'asset' && src.id === a.id} className={`overflow-hidden rounded-[10px] ${src?.kind === 'asset' && src.id === a.id ? 'ring-2 ring-white' : 'ring-1 ring-white/15'}`} aria-label={a.title}>
                <AssetThumb asset={a} className="aspect-square w-full" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="lg-label mb-1.5">{t('Surface')}</p>
          <div className="flex gap-1.5">
            {BGS.map((c) => (
              <button key={c} type="button" onClick={() => setBg(c)} aria-pressed={bg === c} aria-label={c} className={`h-8 w-8 rounded-full ${bg === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black/30' : 'ring-1 ring-white/30'}`} style={{ background: c }} />
            ))}
            <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full ring-1 ring-white/30" title={t('Any colour')} style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t('Any colour')} />
            </label>
          </div>
        </div>
        <p className="text-[12px] text-white/60">{t('Drag to turn the scene, scroll or pinch to come closer.')}</p>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => save('download')} className="lg-btn lg-btn-ghost">
            <Download size={15} /> PNG
          </button>
          <button type="button" disabled={busy} onClick={() => save('project')} className="lg-btn lg-btn-primary">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <PlusSquare size={15} />} {t('To project')}
          </button>
        </div>
      </Pane>
    </div>
  );
}
