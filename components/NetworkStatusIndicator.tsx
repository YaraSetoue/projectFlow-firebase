import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const NetworkStatusIndicator = () => {
  const { isOnline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          {...{
            initial: { opacity: 0, y: 100 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: 100 },
            transition: { type: 'spring', stiffness: 300, damping: 30 },
          } as any}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-lg bg-red-600 text-white shadow-lg"
          role="alert"
        >
          <WifiOff size={20} />
          <p className="text-sm font-medium">Você está offline. As alterações serão sincronizadas quando você se reconectar.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusIndicator;