import React, { ReactNode, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: ReactNode;
  children: ReactNode;
  className?: string; // To style the popover wrapper, e.g., for width
  position?: 'left' | 'right' | 'center';
}

const Popover: React.FC<PopoverProps> = ({ isOpen, onClose, trigger, children, className, position = 'left' }) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [positionStyles, setPositionStyles] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => {
        if (triggerRef.current && contentRef.current) {
          const triggerRect = triggerRef.current.getBoundingClientRect();
          const popoverContent = contentRef.current;
          
          let popoverWidth: number;
          // A simple regex to check for Tailwind-like width classes (e.g., w-48, w-full, w-1/2)
          const useTriggerWidth = !className || !/w-/.test(className);
          let styleWidth: string | undefined = undefined;

          if (useTriggerWidth) {
              popoverWidth = triggerRect.width;
              styleWidth = `${triggerRect.width}px`;
          } else {
              popoverWidth = popoverContent.offsetWidth;
          }
          
          const viewportWidth = window.innerWidth;

          let left: number;
          const top = triggerRect.bottom + 4; // 4px margin below trigger

          if (position === 'right') {
            left = triggerRect.right - popoverWidth;
          } else if (position === 'center') {
            left = triggerRect.left + (triggerRect.width / 2) - (popoverWidth / 2);
          } else { // 'left' is default
            left = triggerRect.left;
          }
          
          // Adjust for viewport overflow
          if (left + popoverWidth > viewportWidth - 8) {
            left = viewportWidth - popoverWidth - 8;
          }
          if (left < 8) {
            left = 8;
          }

          const newStyles: React.CSSProperties = {
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
          };
          if (styleWidth) {
              newStyles.width = styleWidth;
          }

          setPositionStyles(newStyles);
        }
      });

      return () => cancelAnimationFrame(frameId);
    }
  }, [isOpen, position, className]);

  const popoverVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.1, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.1, ease: 'easeIn' } }
  };

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose}></div>
          <motion.div
            ref={contentRef}
            {...{
                initial: "hidden",
                animate: "visible",
                exit: "exit",
                variants: popoverVariants,
            } as any}
            className={`z-50 ${className || ''}`}
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
