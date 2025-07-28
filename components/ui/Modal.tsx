import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClass?: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: -50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const Modal = ({ isOpen, onClose, title, children, widthClass = 'max-w-lg' }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...{
            initial:"hidden",
            animate:"visible",
            exit:"exit",
          } as any}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            {...{variants: backdropVariants} as any}
            className="fixed inset-0 bg-black/60"
            onClick={onClose}
          ></motion.div>

          {/* Modal Content */}
          <motion.div
            {...{variants: modalVariants} as any}
            className={`relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full mx-auto z-10 ${widthClass}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 id="modal-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;