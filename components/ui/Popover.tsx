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
      // Defer position calculation to the next frame. This allows the browser
      // to render the popover and calculate its dimensions before we try to
      // measure it, fixing issues where it appears in the wrong place on first open.
      const frameId = requestAnimationFrame(() => {
        if (triggerRef.current && contentRef.current) {
          const triggerRect = triggerRef.current.getBoundingClientRect();
          const popoverWidth = contentRef.current.offsetWidth;
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

          setPositionStyles({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
          });
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