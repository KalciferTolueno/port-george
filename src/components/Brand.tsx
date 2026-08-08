import { motion } from 'framer-motion';

interface BrandProps {
  isFocused: boolean;
}

export function Brand({ isFocused }: BrandProps): JSX.Element {
  return (
    <motion.header
      className="brand brand--center"
      initial={{ opacity: 1 }}
      animate={{ opacity: isFocused ? 0 : 1 }}
      transition={{
        opacity: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
      }}
    >
      <motion.div
        initial={{ y: '0vh' }}
        animate={{ y: isFocused ? '-40vh' : '0vh' }}
        transition={{
          y: { duration: 0.95, ease: [0.22, 1, 0.36, 1] }
        }}
      >
        <span className="brand__name">George Array</span>
      </motion.div>
    </motion.header>
  );
}
