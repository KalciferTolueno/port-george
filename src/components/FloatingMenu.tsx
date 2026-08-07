import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Theme } from '../types';

interface FloatingMenuProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onNavigate: (view: 'gallery') => void;
}

export function FloatingMenu({ theme, onThemeChange, onNavigate }: FloatingMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const closeMenu = (): void => setOpen(false);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            className="menu-backdrop"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            className="floating-menu-panel"
            aria-label="Navigation menu"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="floating-menu__eyebrow">George Array</p>
            <nav className="floating-menu__nav" aria-label="Primary navigation">
              <a
                href="#gallery"
                onClick={(event) => {
                  event.preventDefault();
                  closeMenu();
                  onNavigate('gallery');
                }}
              >
                Gallery
              </a>
              <a href="#about" onClick={closeMenu}>About</a>
              <a href="#contact" onClick={closeMenu}>Contact</a>
            </nav>

            <div className="floating-menu__rule" />

            <button
              type="button"
              className="theme-toggle"
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              <span className="theme-toggle__mark" aria-hidden="true">
                {theme === 'dark' ? '○' : '●'}
              </span>
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className={`floating-menu-toggle${open ? ' is-open' : ''}`}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileTap={{ scale: 0.92 }}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M13 2h6l1 8 8 1v5l-8 1-1 13h-6l-1-13-8-1v-5l8-1 1-8Z" />
          <path d="M13 2h6v28h-6zM4 11h24v5H4z" />
        </svg>
      </motion.button>
    </>
  );
}
