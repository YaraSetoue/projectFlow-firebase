import React, { ReactNode, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: ReactNode; // If trigger is provided, it handles open/close itself
  children: ReactNode;
  className?: string; // To style the content wrapper
}

const Popover: React.FC<PopoverProps> = ({ isOpen, onClose, trigger, children, className }) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [positionStyles, setPositionStyles] = useState<React.CSSProperties>({});

  // Use useLayoutEffect to calculate position after render but before paint
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        // A bit of a magic number, based on the w-48 class used in TaskActions (12rem = 192px)
        const popoverWidth = 192; 
        const viewportWidth = window.innerWidth;

        let left = triggerRect.left;
        let top = triggerRect.bottom + 4; // 4px margin below trigger

        // Adjust for right overflow
        if (left + popoverWidth > viewportWidth - 8) {
            left = triggerRect.right - popoverWidth;
        }

        // Adjust for left overflow
        if (left < 8) {
            left = 8;
        }

        setPositionStyles({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            minWidth: triggerRect.width,
        });
    }
  }, [isOpen]);

  const popoverVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.1, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.1, ease: 'easeIn' } }
  };

  const popoverContent = (
    <AnimatePresence>
        {isOpen && (
            <>
                {/* Click outside detector */}
                <div className="fixed inset-0 z-40" onClick={onClose}></div>
                <motion.div
                    {...{
                        initial: "hidden",
                        animate: "visible",
                        exit: "exit",
                        variants: popoverVariants,
                    } as any}
                    className={`z-50 ${className}`}
                    style={positionStyles}
                >
                    {children}
                </motion.div>
            </>
        )}
    </AnimatePresence>
  );

  return (
    // The trigger stays in its place in the DOM, wrapped in a div to hold the ref.
    <div ref={triggerRef}>
      {trigger}
      {isOpen && document.body ? createPortal(popoverContent, document.body) : null}
    </div>
  );
};

export default Popover;
