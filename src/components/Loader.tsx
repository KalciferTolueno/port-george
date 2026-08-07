import { motion, AnimatePresence } from 'framer-motion';

interface LoaderProps {
  visible: boolean;
}

/**
 * Minimal loader — name in elegant italics + thin progress bar.
 * The bar fills via a CSS keyframe animation while visible.
 */
export function Loader({ visible }: LoaderProps): JSX.Element {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          <div className="loader__inner">
            <span className="loader__name">George Array</span>
            <div className="loader__bar" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
