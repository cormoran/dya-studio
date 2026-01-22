import { motion } from 'framer-motion';
import dyaLogo from '../assets/dya.svg';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-cyber-dark to-cyber-darker"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 blur-3xl opacity-50"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.2, 1],
            opacity: [0, 0.5, 0.3]
          }}
          transition={{ 
            duration: 2,
            times: [0, 0.5, 1],
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          <div className="w-64 h-64 mx-auto bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-pink rounded-full" />
        </motion.div>

        {/* Logo */}
        <motion.img
          src={dyaLogo}
          alt="DYA Studio"
          className="relative w-64 h-64 cyber-glow"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 1
          }}
          onAnimationComplete={() => {
            setTimeout(onComplete, 1500);
          }}
        />

        {/* Text */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-pink bg-clip-text text-transparent">
            DYA STUDIO
          </h1>
          <p className="text-cyber-blue/60 mt-2 text-sm tracking-widest">
            KEYBOARD CONFIGURATION
          </p>
        </motion.div>

        {/* Loading dots */}
        <motion.div
          className="flex justify-center gap-2 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-cyber-blue rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
