import { motion, AnimatePresence } from 'framer-motion';

interface CounterProps {
  current: number;
  total: number;
}

/**
 * Tiny "01 / 26" counter bottom-right. Optional — matches the prompt's
 * "only a small elegant typography if needed".
 */
export function Counter({ current, total }: CounterProps): JSX.Element {
  const padded = (n: number): string => String(n).padStart(2, '0');
  return (
    <motion.div
      className="counter"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.4, duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={current}
          className="counter__current"
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -6, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'inline-block', marginRight: 6 }}
        >
          {padded(current + 1)}
        </motion.span>
      </AnimatePresence>
      <span style={{ opacity: 0.4 }}> / {padded(total)}</span>
    </motion.div>
  );
}
