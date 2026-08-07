import { motion } from 'framer-motion';
import { photos } from '../data/photos';

interface GallerySectionProps {
  onBack: () => void;
}

export function GallerySection({ onBack }: GallerySectionProps): JSX.Element {
  return (
    <motion.section
      className="gallery-view"
      aria-label="Photo gallery"
      initial={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
      animate={{ clipPath: 'circle(145% at 50% 50%)', opacity: 1 }}
      exit={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="gallery-view__backdrop" aria-hidden="true" />
      <header className="gallery-view__header">
        <button type="button" className="gallery-view__back" onClick={onBack}>
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </button>
        <div className="gallery-view__title">
          <h1>Gallery</h1>
        </div>
      </header>

      <div className="gallery-grid">
        {photos.map((photo, index) => (
          <motion.figure
            className="gallery-grid__item"
            key={`${photo.src}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.35 + index * 0.025,
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            <img src={photo.src} alt={photo.alt} loading="lazy" />
            <figcaption>
              <span>{photo.title ?? `Work ${String(index + 1).padStart(2, '0')}`}</span>
              <span>{photo.year}</span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </motion.section>
  );
}
