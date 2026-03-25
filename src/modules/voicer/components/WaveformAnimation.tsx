import { motion } from 'framer-motion';

export function WaveformAnimation() {
  const bars = 12;

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-primary"
          animate={{
            height: [8, 32, 16, 40, 12, 28, 8],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.08,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
