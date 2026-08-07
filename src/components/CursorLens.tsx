import { useEffect, useRef } from 'react';

/** A desktop-only inversion lens that follows the pointer. */
export function CursorLens(): JSX.Element {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const move = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return;
      cursor.style.opacity = '1';
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
    };
    const leave = (): void => {
      cursor.style.opacity = '0';
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', leave);
    document.documentElement.addEventListener('mouseleave', leave);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', leave);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, []);

  return <div ref={cursorRef} className="cursor-lens" aria-hidden="true" />;
}
