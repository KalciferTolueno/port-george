import { motion } from 'framer-motion';

interface BrandProps {
  isFocused: boolean;
}

export function Brand({ isFocused }: BrandProps): JSX.Element {
  return (
    <motion.header
      className="brand brand--center"
      initial={{ opacity: 1, top: '50%' }}
      animate={{ opacity: isFocused ? 0 : 1, top: isFocused ? '10%' : '50%' }}
      transition={{
        opacity: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
        top: { duration: 0.95, ease: [0.22, 1, 0.36, 1] }
      }}
    >
      <span className="brand__name">George Array</span>
    </motion.header>
  );
}
