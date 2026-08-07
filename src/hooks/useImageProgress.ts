import { useEffect, useState, useRef } from 'react';

export interface ImageProgress {
  loaded: number;
  total: number;
  allLoaded: boolean;
  active: boolean;
}

/**
 * Tracks how many of `urls` have finished loading (or errored).
 * Drop-in replacement for @react-three/drei's useProgress for cases
 * where textures are loaded manually rather than via useLoader.
 */
export function useImageProgress(urls: string[]): ImageProgress {
  const [loaded, setLoaded] = useState(0);
  const total = urls.length;
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    let count = 0;
    const tick = (): void => {
      if (!aliveRef.current) return;
      count += 1;
      setLoaded(count);
    };

    urls.forEach((url) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = tick;
      img.onerror = tick;
      img.src = url;
    });

    return () => {
      aliveRef.current = false;
    };
  }, [urls]);

  return {
    loaded,
    total,
    allLoaded: total > 0 && loaded >= total,
    active: total > 0 && loaded < total
  };
}
