import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';

import { Scene } from './components/Scene';
import { Brand } from './components/Brand';
import { Loader } from './components/Loader';
import { FloatingMenu } from './components/FloatingMenu';
import { CursorLens } from './components/CursorLens';
import { GallerySection } from './components/GallerySection';
import { photos } from './data/photos';
import { useImageProgress } from './hooks/useImageProgress';
import type { Theme } from './types';

const MIN_LOADER_MS = 700;

export default function App(): JSX.Element {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [view, setView] = useState<'home' | 'gallery'>('home');
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem('george-array-theme') === 'light') {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('george-array-theme', theme);
  }, [theme]);

  // Track photo loading ourselves — each PhotoNode loads its own texture
  // asynchronously, so we use a dedicated hook (not @react-three/drei's
  // useProgress, which only tracks useLoader calls).
  const photoUrls = useMemo(() => photos.map((p) => p.src), []);
  const { allLoaded } = useImageProgress(photoUrls);

  useEffect(() => {
    const id = setTimeout(() => setMinTimePassed(true), MIN_LOADER_MS);
    return () => clearTimeout(id);
  }, []);

  const loaderVisible = !allLoaded || !minTimePassed;
  const handleLoadingComplete = useCallback(() => setLoadingComplete(true), []);

  return (
    <div className="app" id="gallery">
      <motion.div
        className="main-layer"
        initial={false}
        animate={{
          opacity: view === 'home' ? 1 : 0.34,
          scale: 1
        }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: view === 'home' ? 'auto' : 'none' }}
      >
      <Canvas
        camera={{ position: [0, 0, 0], fov: 50 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
          stencil: false,
          depth: true
        }}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          background: theme === 'dark' ? '#0d0f15' : '#f5f3ee',
          cursor: 'crosshair'
        }}
        shadows={false}
        frameloop={view === 'home' ? 'always' : 'demand'}
        onPointerMissed={() => {
          // Clicking empty space closes the floating photo.
          window.dispatchEvent(new CustomEvent('portfolio:close-focal'));
        }}
      >
        <Suspense fallback={null}>
          <Scene
            onFocusChange={setFocusedIndex}
            theme={theme}
            introReady={!loaderVisible}
            paused={view === 'gallery'}
          />
        </Suspense>
      </Canvas>

      <div className="camera-vignette" aria-hidden="true" />
      <Brand isFocused={focusedIndex !== null} />
      <Loader visible={loaderVisible} onComplete={handleLoadingComplete} />
      </motion.div>

      <AnimatePresence mode="wait">
        {view === 'gallery' && <GallerySection onBack={() => setView('home')} />}
      </AnimatePresence>

      {loadingComplete && (
        <FloatingMenu
          theme={theme}
          onThemeChange={setTheme}
          onNavigate={setView}
        />
      )}
      <CursorLens />
    </div>
  );
}
