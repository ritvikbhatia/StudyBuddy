import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

// Use React.forwardRef to allow passing refs to the Card component
export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  children,
  className = '',
  hover = false,
  onClick,
}, ref) => { // Accept ref as the second argument
  return (
    <motion.div
      ref={ref} // Pass the ref to the motion.div element
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      className={`bg-white rounded-xl shadow-lg border border-gray-100 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
});

// Add display name for better debugging in React DevTools
Card.displayName = 'Card';
