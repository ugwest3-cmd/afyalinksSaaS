'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-text/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      <div className={cn(
        "relative bg-white rounded-xl shadow-xl border border-border w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]",
        className
      )}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {description && (
              <p className="text-sm text-muted mt-1">{description}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-muted hover:text-text rounded-lg p-2 hover:bg-border/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
