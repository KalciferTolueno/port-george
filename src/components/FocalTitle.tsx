import { Html } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import type { Photo } from '../data/photos';

interface Props {
  photo: Photo | undefined;
}

/**
 * Title / metadata of the currently focal photo.
 * Rendered as an <Html> overlay anchored just under the focal card.
 */
export function FocalTitle({ photo }: Props): JSX.Element {
  return (
    <Html
      // Position the html a touch below the focal photo's centre.
      position={[0, -2.0, 0]}
      center
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        minWidth: 240,
        textAlign: 'center'
      }}
    >
      <AnimatePresence mode="popLayout">
        {photo && (
          <motion.div
            key={photo.src}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: '#1a1a1a',
              textAlign: 'center'
            }}
          >
            {photo.title && (
              <div
                style={{
                  fontSize: 22,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: 1.1
                }}
              >
                {photo.title}
              </div>
            )}
            {(photo.year || photo.location) && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: '#888',
                  fontStyle: 'normal'
                }}
              >
                {[photo.year, photo.location].filter(Boolean).join(' · ')}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Html>
  );
}
