import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows, Environment, Html, OrbitControls, Stage, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { del, entries, get, set } from 'idb-keyval';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  Camera,
  Columns3,
  Database,
  Eye,
  Grid,
  Grid3X3,
  LayoutDashboard,
  List,
  Loader2,
  Maximize2,
  Monitor,
  Moon,
  PackagePlus,
  RotateCcw,
  Search,
  Settings,
  Sliders,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import './styles.css';

const EMPTY_MODELS = [];
const SAMPLE_SEED_KEY = 'glb-models:samples-seeded';
const CATEGORIES = ['All', 'Product', 'Architecture', 'Character', 'Vehicle', 'Artifact', 'Uncategorized'];
const THEMES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'brand', label: 'Brand', icon: Monitor },
];

function makeId() {
  return `model-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function addMesh(scene, geometry, color, position, scale = [1, 1, 1]) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.12 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function makeSampleScene(kind) {
  const scene = new THREE.Scene();

  if (kind === 'showroom') {
    addMesh(scene, new THREE.CylinderGeometry(0.9, 0.9, 0.22, 48), '#304b5a', [0, -0.25, 0]);
    addMesh(scene, new THREE.BoxGeometry(1.2, 0.28, 1.2), '#28a06f', [0, 0.1, 0]);
    addMesh(scene, new THREE.SphereGeometry(0.42, 48, 32), '#f3b84b', [0, 0.66, 0]);
    addMesh(scene, new THREE.TorusGeometry(0.72, 0.045, 16, 96), '#206b7d', [0, 0.66, 0]).rotation.x = Math.PI / 2;
  } else {
    addMesh(scene, new THREE.BoxGeometry(1.65, 0.18, 0.72), '#206b7d', [0, 0.28, 0]);
    addMesh(scene, new THREE.BoxGeometry(0.9, 0.36, 0.62), '#f3b84b', [-0.1, 0.56, 0]);
    addMesh(scene, new THREE.CylinderGeometry(0.18, 0.18, 0.18, 32), '#18222f', [-0.55, 0.12, 0.38]).rotation.x = Math.PI / 2;
    addMesh(scene, new THREE.CylinderGeometry(0.18, 0.18, 0.18, 32), '#18222f', [0.55, 0.12, 0.38]).rotation.x = Math.PI / 2;
    addMesh(scene, new THREE.CylinderGeometry(0.18, 0.18, 0.18, 32), '#18222f', [-0.55, 0.12, -0.38]).rotation.x = Math.PI / 2;
    addMesh(scene, new THREE.CylinderGeometry(0.18, 0.18, 0.18, 32), '#18222f', [0.55, 0.12, -0.38]).rotation.x = Math.PI / 2;
  }

  scene.add(new THREE.AmbientLight('#ffffff', 1));
  return scene;
}

function exportSceneToGlb(scene) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        const buffer = result instanceof ArrayBuffer ? result : new TextEncoder().encode(JSON.stringify(result));
        resolve(new Blob([buffer], { type: 'model/gltf-binary' }));
      },
      reject,
      { binary: true },
    );
  });
}

async function createSampleModel(kind, metadata, createdAt) {
  const blob = await exportSceneToGlb(makeSampleScene(kind));
  const file = new File([blob], metadata.fileName, { type: 'model/gltf-binary' });
  return {
    id: `sample-${kind}`,
    name: metadata.name,
    description: metadata.description,
    category: metadata.category,
    fileName: metadata.fileName,
    size: file.size,
    blob: file,
    createdAt,
  };
}

async function seedSampleModels() {
  if (await get(SAMPLE_SEED_KEY)) return;

  const samples = await Promise.all([
    createSampleModel(
      'showroom',
      {
        name: 'Showroom Product Sample',
        description: 'A generated GLB sample with stacked product forms and a display ring.',
        category: 'Product',
        fileName: 'showroom-product-sample.glb',
      },
      Date.now() - 1000,
    ),
    createSampleModel(
      'vehicle',
      {
        name: 'Compact Vehicle Sample',
        description: 'A generated GLB sample vehicle for testing the public 3D viewer.',
        category: 'Vehicle',
        fileName: 'compact-vehicle-sample.glb',
      },
      Date.now(),
    ),
  ]);

  await Promise.all(samples.map((model) => set(`glb-model:${model.id}`, model)));
  await set(SAMPLE_SEED_KEY, true);
}

function useRoute() {
  const [route, setRoute] = useState(
    window.location.hash === '#/admin'
      ? 'admin'
      : window.location.hash === '#/upload'
        ? 'upload'
        : 'public'
  );

  useEffect(() => {
    function handleRoute() {
      const hash = window.location.hash;
      if (hash === '#/admin') {
        setRoute('admin');
      } else if (hash === '#/upload') {
        setRoute('upload');
      } else {
        setRoute('public');
      }
    }
    window.addEventListener('hashchange', handleRoute);
    return () => window.removeEventListener('hashchange', handleRoute);
  }, []);

  return route;
}

function useModels() {
  const [models, setModels] = useState(EMPTY_MODELS);
  const [loading, setLoading] = useState(true);

  async function loadModels() {
    setLoading(true);
    let rows = await entries();
    let loaded = rows
      .filter(([key]) => String(key).startsWith('glb-model:'))
      .map(([, value]) => value)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (loaded.length === 0) {
      await seedSampleModels();
      rows = await entries();
      loaded = rows
        .filter(([key]) => String(key).startsWith('glb-model:'))
        .map(([, value]) => value)
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    setModels(loaded);
    setLoading(false);
  }

  async function addModel(file, metadata) {
    const model = {
      id: makeId(),
      name: metadata.name || file.name.replace(/\.glb$/i, ''),
      description: metadata.description || '',
      category: metadata.category || 'Uncategorized',
      fileName: file.name,
      size: file.size,
      blob: file,
      createdAt: Date.now(),
    };
    await set(`glb-model:${model.id}`, model);
    await loadModels();
    return model;
  }

  async function removeModel(id) {
    await del(`glb-model:${id}`);
    await loadModels();
  }

  useEffect(() => {
    loadModels();
  }, []);

  return { models, loading, addModel, removeModel };
}

function useObjectUrl(blob) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!blob) {
      setUrl('');
      return undefined;
    }
    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [blob]);

  return url;
}

function ModelAsset({ url, rotation, wireframe }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.wireframe = wireframe;
          });
        } else if (child.material) {
          child.material.wireframe = wireframe;
        }
      }
    });
  }, [scene, wireframe]);

  return (
    <group rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}

function Viewer({ model, fullscreen, onToggleFullscreen }) {
  const url = useObjectUrl(model?.blob);
  const controlsRef = useRef();
  const [modelRotation, setModelRotation] = useState([0, 0, 0]);
  const [showSettings, setShowSettings] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [lightIntensity, setLightIntensity] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [bgColor, setBgColor] = useState('#edf2f5');

  useEffect(() => {
    setModelRotation([0, 0, 0]);
    controlsRef.current?.reset();
  }, [model?.id]);

  function rotateModel(axis, amount) {
    setModelRotation(([x, y, z]) => {
      if (axis === 'x') return [x + amount, y, z];
      if (axis === 'y') return [x, y + amount, z];
      return [x, y, z + amount];
    });
  }

  function resetView() {
    setModelRotation([0, 0, 0]);
    controlsRef.current?.reset();
  }

  function applyCameraPreset(preset) {
    const controls = controlsRef.current;
    if (!controls) return;
    
    controls.target.set(0, 0, 0);

    if (preset === 'front') {
      controls.object.position.set(0, 0, 5.5);
    } else if (preset === 'top') {
      controls.object.position.set(0, 5.5, 0.01);
    } else if (preset === 'side') {
      controls.object.position.set(5.5, 0, 0);
    }
    controls.update();
  }

  if (!model) {
    return (
      <div className="viewer-empty">
        <Box size={44} />
        <p>Select or upload a GLB model to inspect it.</p>
      </div>
    );
  }

  return (
    <div className={`viewer-shell ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="viewer-controls" aria-label="3D model rotation controls">
        <button type="button" title="Rotate left" aria-label="Rotate left" onClick={() => rotateModel('y', -Math.PI / 8)}>
          <ArrowLeft size={18} />
        </button>
        <button type="button" title="Rotate right" aria-label="Rotate right" onClick={() => rotateModel('y', Math.PI / 8)}>
          <ArrowRight size={18} />
        </button>
        <button type="button" title="Tilt up" aria-label="Tilt up" onClick={() => rotateModel('x', -Math.PI / 8)}>
          <ArrowUp size={18} />
        </button>
        <button type="button" title="Tilt down" aria-label="Tilt down" onClick={() => rotateModel('x', Math.PI / 8)}>
          <ArrowDown size={18} />
        </button>
        <button type="button" title="Reset view" aria-label="Reset view" onClick={resetView}>
          <RotateCcw size={18} />
        </button>
        <button 
          type="button" 
          title="Toggle 3D settings" 
          aria-label="Toggle 3D settings" 
          className={showSettings ? 'active' : ''} 
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings size={18} />
        </button>
        <button type="button" title="Fullscreen viewer" aria-label="Fullscreen viewer" onClick={onToggleFullscreen}>
          <Maximize2 size={18} />
        </button>
      </div>

      {showSettings && (
        <div className="viewer-settings-panel">
          <div className="settings-header">
            <h3>3D Inspector Settings</h3>
          </div>
          
          <div className="settings-section">
            <label className="settings-title">
              <Camera size={14} /> Camera Presets
            </label>
            <div className="settings-row button-grid">
              <button type="button" onClick={() => applyCameraPreset('front')}>Front</button>
              <button type="button" onClick={() => applyCameraPreset('top')}>Top</button>
              <button type="button" onClick={() => applyCameraPreset('side')}>Side</button>
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-title">
              <Sliders size={14} /> Model & Lighting
            </label>
            <div className="settings-row toggle-row">
              <span>Wireframe Mode</span>
              <input 
                type="checkbox" 
                checked={wireframe} 
                onChange={(e) => setWireframe(e.target.checked)} 
              />
            </div>
            <div className="settings-row toggle-row">
              <span>Show Floor Grid</span>
              <input 
                type="checkbox" 
                checked={showGrid} 
                onChange={(e) => setShowGrid(e.target.checked)} 
              />
            </div>
            <div className="settings-column">
              <div className="slider-header">
                <span>Light Intensity</span>
                <span>{lightIntensity.toFixed(1)}x</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="2.5" 
                step="0.1" 
                value={lightIntensity} 
                onChange={(e) => setLightIntensity(parseFloat(e.target.value))} 
              />
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-title">
              <Grid size={14} /> Background Preset
            </label>
            <div className="bg-preset-grid">
              {[
                { name: 'Light Studio', color: '#edf2f5' },
                { name: 'Dark Void', color: '#111821' },
                { name: 'Warm Amber', color: '#faf6ee' },
                { name: 'Tech Blue', color: '#e3ecf0' }
              ].map((preset) => (
                <button 
                  key={preset.color}
                  type="button" 
                  className={bgColor === preset.color ? 'active' : ''}
                  onClick={() => setBgColor(preset.color)}
                  title={preset.name}
                >
                  <span className="color-swatch" style={{ backgroundColor: preset.color }}></span>
                  <span className="preset-name">{preset.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [3.5, 2.2, 4.5], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={[bgColor]} />
        <ambientLight intensity={0.65 * lightIntensity} />
        <Suspense
          fallback={
            <Html center>
              <div className="canvas-loader">
                <Loader2 size={18} className="spin" />
                Loading
              </div>
            </Html>
          }
        >
          <Stage intensity={0.75 * lightIntensity} environment="city" adjustCamera={false}>
            <Bounds fit clip observe margin={1.15}>
              <ModelAsset url={url} rotation={modelRotation} wireframe={wireframe} />
            </Bounds>
          </Stage>
          <Environment preset="city" />
          <ContactShadows position={[0, -1.25, 0]} opacity={0.35} blur={2.5} />
          {showGrid && <gridHelper args={[12, 12, '#21896a', '#c9d5dd']} position={[0, -1.24, 0]} />}
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          enablePan={false}
          enableRotate
          enableZoom
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
          }}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_ROTATE,
          }}
          minDistance={1.5}
          maxDistance={12}
        />
      </Canvas>
    </div>
  );
}

function AppHeader({ route, theme, setTheme }) {
  return (
    <header className="app-header">
      <a className="brand-lockup" href="#/">
        <span>
          <Box size={22} />
        </span>
        <strong>GLB Model Vault</strong>
      </a>
      <div className="header-right">
        <nav className="top-nav" aria-label="Primary navigation">
          <a className={route === 'public' ? 'active' : ''} href="#/">
            <Eye size={17} />
            Public
          </a>
          <a className={route === 'upload' ? 'active' : ''} href="#/upload">
            <Upload size={17} />
            Upload
          </a>
          <a className={route === 'admin' ? 'active' : ''} href="#/admin">
            <Database size={17} />
            Admin
          </a>
        </nav>
        <div className="theme-switcher" aria-label="Theme switcher">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button className={theme === id ? 'active' : ''} key={id} type="button" title={label} onClick={() => setTheme(id)}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function ModelThumbnail({ model }) {
  const initials = model.category.slice(0, 2).toUpperCase();
  return (
    <span className="model-thumb">
      <span>{initials}</span>
      <Box size={30} />
    </span>
  );
}

function CatalogControls({ query, setQuery, category, setCategory, viewMode, setViewMode }) {
  return (
    <div className="catalog-controls">
      <label className="search-box">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models" />
      </label>
      <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
        {CATEGORIES.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <div className="segmented" aria-label="Catalog view">
        <button className={viewMode === 'grid' ? 'active' : ''} type="button" title="Grid view" onClick={() => setViewMode('grid')}>
          <Grid3X3 size={17} />
        </button>
        <button className={viewMode === 'list' ? 'active' : ''} type="button" title="List view" onClick={() => setViewMode('list')}>
          <List size={18} />
        </button>
      </div>
    </div>
  );
}

function PublicPage({ models, selectedModel, onSelect, loading }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [fullscreen, setFullscreen] = useState(false);

  const filteredModels = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return models.filter((model) => {
      const matchesText = !needle || `${model.name} ${model.category} ${model.description}`.toLowerCase().includes(needle);
      const matchesCategory = category === 'All' || model.category === category;
      return matchesText && matchesCategory;
    });
  }, [models, query, category]);

  return (
    <main className="public-page">
      <section className="catalog-search-hero">
        <CatalogControls
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </section>

      <section className="viewer-hero">
        <div className="viewer-copy">
          <span className="eyebrow">Public 3D Catalog</span>
          <h1>{selectedModel?.name || 'Select a GLB model'}</h1>
          <p>{selectedModel?.description || 'Browse stored 3D assets and inspect every side in the interactive GLB viewer.'}</p>
          {selectedModel ? (
            <div className="detail-strip">
              <span>{selectedModel.category}</span>
              <span>{formatBytes(selectedModel.size)}</span>
              <span>{selectedModel.fileName}</span>
            </div>
          ) : null}
        </div>
        <Viewer model={selectedModel} fullscreen={fullscreen} onToggleFullscreen={() => setFullscreen((value) => !value)} />
      </section>

      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Catalog</span>
            <h2>{filteredModels.length} model{filteredModels.length === 1 ? '' : 's'}</h2>
          </div>
        </div>

        <div className={`model-collection ${viewMode}`}>
          {loading ? (
            <div className="empty-card">
              <Loader2 size={26} className="spin" />
              <strong>Loading models</strong>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="empty-card">
              <Box size={30} />
              <strong>No models found</strong>
              <span>Try a different search or category filter.</span>
            </div>
          ) : (
            filteredModels.map((model) => (
              <button className={`model-card ${selectedModel?.id === model.id ? 'active' : ''}`} key={model.id} type="button" onClick={() => onSelect(model)}>
                <ModelThumbnail model={model} />
                <span className="model-card-copy">
                  <strong>{model.name}</strong>
                  <small>{model.category}</small>
                  <em>{formatBytes(model.size)}</em>
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function UploadPage({ onUpload, onSelect }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Product');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    const model = await onUpload(file, { name, category, description });
    setBusy(false);
    setName('');
    setCategory('Product');
    setDescription('');
    setFile(null);
    event.currentTarget.reset();
    onSelect(model);
    setSuccessMsg('Model uploaded successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  return (
    <main className="admin-page upload-page-layout">
      <section className="admin-intro">
        <span className="eyebrow">Upload Center</span>
        <h1>Add a new 3D model</h1>
        <p className="intro-desc">Upload `.glb` files directly into your browser's IndexedDB storage. Stored models will instantly appear in the public catalog.</p>
      </section>

      <section className="upload-container">
        <form className="admin-upload" onSubmit={handleSubmit}>
          <label className="drop-zone">
            <Upload size={28} />
            <span>{file ? file.name : 'Drag and drop or click to upload GLB file'}</span>
            <small>{file ? formatBytes(file.size) : 'Max size: 50MB (IndexedDB recommended limit)'}</small>
            <input type="file" accept=".glb,model/gltf-binary" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>

          <div className="input-group">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Display name (optional)" aria-label="Display name" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
              {CATEGORIES.filter((item) => item !== 'All').map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description (optional)" aria-label="Short description" />
          <button type="submit" disabled={!file || busy}>
            {busy ? <Loader2 size={18} className="spin" /> : <PackagePlus size={18} />}
            Upload to Vault
          </button>
          {successMsg && <div className="success-toast">{successMsg}</div>}
        </form>
      </section>
    </main>
  );
}

function AdminPage({ selectedModel, onSelect, models, onDelete, loading }) {
  return (
    <main className="admin-page">
      <section className="admin-intro">
        <span className="eyebrow">Database Manager</span>
        <h1>Manage stored GLB models</h1>
        <p className="intro-desc">View, select, and delete models stored locally in your browser's database vault.</p>
      </section>

      <section className="admin-grid-single">
        <div className="admin-models full-width">
          <div className="admin-models-head">
            <div>
              <span className="eyebrow">Database</span>
              <h2>{models.length} stored model{models.length === 1 ? '' : 's'}</h2>
            </div>
            <Database size={22} />
          </div>

          <div className="admin-list grid-layout-admin">
            {loading ? (
              <div className="state-line">
                <Loader2 size={18} className="spin" />
                Loading database
              </div>
            ) : models.length === 0 ? (
              <div className="empty-card">
                <Database size={30} />
                <strong>No models in database</strong>
                <span>Go to the Upload tab to add new models.</span>
              </div>
            ) : (
              models.map((model) => (
                <button className={`admin-row ${selectedModel?.id === model.id ? 'active' : ''}`} key={model.id} type="button" onClick={() => onSelect(model)}>
                  <ModelThumbnail model={model} />
                  <span>
                    <strong>{model.name}</strong>
                    <small>{model.category} - {formatBytes(model.size)}</small>
                  </span>
                  <Trash2
                    size={18}
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${model.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(model.id);
                    }}
                  />
                </button>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const route = useRoute();
  const { models, loading, addModel, removeModel } = useModels();
  const [selectedId, setSelectedId] = useState('');
  const [theme, setTheme] = useState('light');
  const selectedModel = models.find((model) => model.id === selectedId) || models[0] || null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function selectModel(model) {
    setSelectedId(model?.id || '');
  }

  async function deleteModel(id) {
    await removeModel(id);
    if (selectedId === id) setSelectedId('');
  }

  return (
    <div className="app-shell">
      <AppHeader route={route} theme={theme} setTheme={setTheme} />
      {route === 'admin' ? (
        <AdminPage loading={loading} models={models} selectedModel={selectedModel} onSelect={selectModel} onDelete={deleteModel} />
      ) : route === 'upload' ? (
        <UploadPage onUpload={addModel} onSelect={selectModel} />
      ) : (
        <PublicPage loading={loading} models={models} selectedModel={selectedModel} onSelect={selectModel} />
      )}
      <footer className="app-footer">
        <Columns3 size={16} />
        <span>React catalog, IndexedDB storage, GLB preview.</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
