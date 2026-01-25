import { motion } from "framer-motion";
import { IconBluetooth, IconUsb } from "@tabler/icons-react";
import { useMemo } from "react";
import type { ConnectionMethod } from "./DeviceConnection";

interface SplashScreenProps {
  onConnect: (method: ConnectionMethod) => void;
  isConnecting: boolean;
  error: string | null;
}

// Slash line component for disabled state
function DisabledSlash({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={`w-[70px] h-[2px] ${color} rotate-45 rounded-full`} />
    </div>
  );
}

export function SplashScreen({
  onConnect,
  isConnecting,
  error,
}: SplashScreenProps) {
  // Check if Web Serial API and Web Bluetooth API are available
  const isSerialAvailable = useMemo(() => "serial" in navigator, []);
  const isBLEAvailable = useMemo(() => "bluetooth" in navigator, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg)]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-cyber opacity-30" />

      {/* Animated rings */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full border border-[var(--color-electric)]/20"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full border border-[var(--color-electric)]/10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full border border-[var(--color-electric)]/5"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
      />

      {/* Brand container */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        {/* Brand name with integrated glow effect */}
        <motion.div
          className="flex flex-col items-center gap-3 font-dya-logo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.h1
            className="text-7xl font-medium tracking-[0.15em] text-[var(--color-text)]"
            animate={{
              textShadow: [
                "0 0 30px rgba(0, 212, 255, 0.4), 0 0 60px rgba(0, 212, 255, 0.2)",
                "0 0 40px rgba(0, 212, 255, 0.6), 0 0 80px rgba(0, 212, 255, 0.3)",
                "0 0 30px rgba(0, 212, 255, 0.4), 0 0 60px rgba(0, 212, 255, 0.2)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            DYA
          </motion.h1>
          <p className="text-lg tracking-[0.3em] text-[var(--color-text-muted)] uppercase font-light">
            Studio
          </p>
        </motion.div>

        {/* Connection section */}
        <motion.div
          className="flex flex-col items-center gap-4 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {/* Connect label */}
          <p className="text-sm font-light tracking-wider text-[var(--color-text-secondary)] uppercase">
            Connect
          </p>

          {/* Connection buttons */}
          <div className="flex gap-6">
            <button
              onClick={() => onConnect("serial")}
              disabled={isConnecting || !isSerialAvailable}
              className="relative w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed border-[var(--color-electric)] bg-[var(--color-electric)]/10 hover:bg-[var(--color-electric)]/20 hover:border-[var(--color-electric)] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
              aria-label="Connect via USB"
              title={
                isSerialAvailable
                  ? "Connect via USB"
                  : "Web Serial not available in this browser"
              }
            >
              <IconUsb
                size={28}
                className="text-[var(--color-electric)] relative z-10"
                strokeWidth={1.5}
              />
              {(isConnecting || !isSerialAvailable) && (
                <DisabledSlash color="bg-[var(--color-electric)]" />
              )}
            </button>
            <button
              onClick={() => onConnect("ble")}
              disabled={isConnecting || !isBLEAvailable}
              className="relative w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed border-[var(--color-neon)] bg-[var(--color-neon)]/10 hover:bg-[var(--color-neon)]/20 hover:border-[var(--color-neon)] hover:shadow-[0_0_20px_rgba(0,255,204,0.3)]"
              aria-label="Connect via Bluetooth"
              title={
                isBLEAvailable
                  ? "Connect via Bluetooth"
                  : "Web Bluetooth not available in this browser"
              }
            >
              <IconBluetooth
                size={28}
                className="text-[var(--color-neon)] relative z-10"
                strokeWidth={1.5}
              />
              {(isConnecting || !isBLEAvailable) && (
                <DisabledSlash color="bg-[var(--color-neon)]" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Loading indicator */}
        {isConnecting && (
          <motion.div
            className="flex gap-1 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-electric)]"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-red-500">{error}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Tagline */}
      <motion.p
        className="absolute bottom-12 text-xs font-light tracking-wider text-[var(--color-text-muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Configure your keyboard
      </motion.p>
    </motion.div>
  );
}
