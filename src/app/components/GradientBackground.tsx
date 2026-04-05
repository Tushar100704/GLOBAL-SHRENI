import { ReactNode } from 'react';

interface GradientBackgroundProps {
  children: ReactNode;
  className?: string;
}

export function GradientBackground({ children, className = '' }: GradientBackgroundProps) {
  return (
    <div className={`bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 ${className}`}>
      {children}
    </div>
  );
}
