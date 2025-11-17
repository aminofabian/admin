'use client';

import { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

const DropdownMenuContext = createContext<{ closeMenu: () => void } | null>(null);

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  onClose?: () => void;
}

export function DropdownMenu({ children, trigger, align = 'right', className = '', onClose }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, right: 0, positionAbove: false });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Calculate position when menu opens
      const calculatePosition = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // Estimate menu height (approximate, will be adjusted after render)
          const estimatedMenuHeight = 100; // Approximate height for 2-3 items
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          
          // Position above if there's not enough space below but enough space above
          const positionAbove = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
          
          // Calculate top position
          let top: number;
          if (positionAbove) {
            // Position above the trigger
            top = rect.top - estimatedMenuHeight - 4;
            // Ensure it doesn't go above viewport
            top = Math.max(8, top);
          } else {
            // Position below the trigger
            top = rect.bottom + 4;
            // Ensure it doesn't go below viewport
            const maxTop = viewportHeight - estimatedMenuHeight - 8;
            top = Math.min(top, maxTop);
          }
          
          setMenuPosition({
            top,
            left: rect.left,
            right: rect.right,
            positionAbove,
          });
        }
      };
      
      // Initial calculation
      calculatePosition();
      
      // Recalculate after menu renders to get actual height
      const timeoutId = setTimeout(() => {
        if (menuRef.current && triggerRef.current) {
          const menuRect = menuRef.current.getBoundingClientRect();
          const triggerRect = triggerRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          const actualMenuHeight = menuRect.height;
          const spaceBelow = viewportHeight - triggerRect.bottom;
          const spaceAbove = triggerRect.top;
          
          // If menu extends below viewport, try to position it above
          if (menuRect.bottom > viewportHeight - 8 && spaceAbove > spaceBelow) {
            const newTop = triggerRect.top - actualMenuHeight - 4;
            setMenuPosition(prev => ({
              ...prev,
              top: Math.max(8, newTop),
              positionAbove: true,
            }));
          } else if (menuRect.top < 8) {
            // If menu extends above viewport, position it below
            const newTop = triggerRect.bottom + 4;
            setMenuPosition(prev => ({
              ...prev,
              top: Math.min(newTop, viewportHeight - actualMenuHeight - 8),
              positionAbove: false,
            }));
          }
        }
      }, 0);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        clearTimeout(timeoutId);
      };
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, align, closeMenu]);

  return (
    <DropdownMenuContext.Provider value={{ closeMenu }}>
      <div className={`relative ${className}`} ref={triggerRef}>
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>
        {isOpen && typeof window !== 'undefined' && createPortal(
          <div
            ref={menuRef}
            className="fixed min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{
              zIndex: 9999,
              top: `${menuPosition.top}px`,
              ...(align === 'right' 
                ? { right: `${window.innerWidth - menuPosition.right}px` }
                : { left: `${menuPosition.left}px` }
              ),
              // Ensure menu stays within viewport bounds
              maxHeight: menuPosition.positionAbove 
                ? `${menuPosition.top - 8}px`
                : `${window.innerHeight - menuPosition.top - 8}px`,
              overflowY: 'auto',
            }}
          >
            {children}
          </div>,
          document.body
        )}
      </div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function DropdownMenuItem({ children, onClick, className = '', disabled = false }: DropdownMenuItemProps) {
  const context = useContext(DropdownMenuContext);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
      context?.closeMenu();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${className}`}
    >
      {children}
    </button>
  );
}

