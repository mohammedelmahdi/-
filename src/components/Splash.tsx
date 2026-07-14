import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Boxes } from 'lucide-react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Increment progress bar to simulate loading
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 80);

    // Complete splash screen after 2.2 seconds
    const timeout = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <div id="splash-screen" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="relative flex flex-col items-center px-6 text-center max-w-md">
          
          {/* Glowing background aura */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 opacity-20 blur-2xl w-48 h-48 animate-pulse"></div>

          {/* Animated App Logo */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="relative z-10 flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-indigo-600 shadow-2xl shadow-indigo-500/20"
          >
            <Boxes className="w-12 h-12 text-white animate-pulse" />
          </motion.div>

          {/* Title & Branding */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-300 bg-clip-text text-transparent font-sans"
          >
            جيستوك
          </motion.h1>

          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 0.8 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-2 text-sm text-slate-300 font-medium uppercase tracking-widest"
          >
            إدارة المخزون والمبيعات
          </motion.p>

          {/* Progress bar container */}
          <div className="mt-8 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500"
            />
          </div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-2 text-xs text-slate-500 font-mono"
          >
            جاري تحميل النظام... {progress}%
          </motion.span>
        </div>
      </div>
    </AnimatePresence>
  );
}
