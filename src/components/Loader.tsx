import { useEffect, useState } from 'react';

interface LoaderProps {
  visible: boolean;
  onComplete?: () => void;
}

/** Initial cover that reveals the home scene from the centre outward. */
export function Loader({ visible, onComplete }: LoaderProps): JSX.Element | null {
  const [mounted, setMounted] = useState(visible);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setExiting(false);
      return;
    }

    if (!mounted) return;
    setExiting(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      onComplete?.();
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [visible, mounted, onComplete]);

  if (!mounted) return null;

  return (
    <div className={`loader${exiting ? ' loader--exiting' : ''}`} role="status">
      <div className="loader__inner">
        <span className="brand__name loader__name" data-text="George Array">George Array</span>
      </div>
    </div>
  );
}
