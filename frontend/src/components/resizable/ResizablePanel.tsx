import React, { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

export interface ResizablePanelProps {
  children: ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  side: 'left' | 'right';
  className?: string;
  resizerClassName?: string;
  borderSide?: 'left' | 'right' | 'both' | 'none';
  onWidthChange?: (width: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  initialWidth = 320,
  minWidth = 200,
  maxWidth,
  side,
  className = '',
  resizerClassName = '',
  borderSide = 'right',
  onWidthChange,
  onDragStart,
  onDragEnd,
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs for drag functionality
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingWidthRef = useRef<number>(initialWidth);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(initialWidth);

  // Set default maxWidth if not provided, with responsive calculation
  const effectiveMaxWidth = maxWidth || window.innerWidth * 0.4;

  // Optimized resize function using requestAnimationFrame
  const updatePanelWidth = useCallback(() => {
    const now = performance.now();
    
    // Throttle to ~60fps for smooth performance
    if (now - lastUpdateTimeRef.current >= 16) {
      setWidth(pendingWidthRef.current);
      onWidthChange?.(pendingWidthRef.current);
      lastUpdateTimeRef.current = now;
    }
    
    animationFrameRef.current = null;
  }, [onWidthChange]);

  const scheduleUpdate = useCallback(() => {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(updatePanelWidth);
    }
  }, [updatePanelWidth]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Store initial values for smooth dragging
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    
    setIsDragging(true);
    onDragStart?.();
  }, [onDragStart, width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate delta from start position for smoother movement
    const deltaX = e.clientX - startXRef.current;
    const newWidth = side === 'left' 
      ? startWidthRef.current + deltaX
      : startWidthRef.current - deltaX;
    
    // Calculate effectiveMaxWidth inline to avoid dependency issues
    const currentMaxWidth = maxWidth || window.innerWidth * 0.4;
    
    if (newWidth >= minWidth && newWidth <= currentMaxWidth) {
      // Store the new width and schedule an update
      pendingWidthRef.current = newWidth;
      scheduleUpdate();
    }
  }, [isDragging, side, minWidth, maxWidth, scheduleUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onDragEnd?.();
    
    // Cancel any pending animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Ensure final state is applied
    setWidth(pendingWidthRef.current);
    onWidthChange?.(pendingWidthRef.current);
    
    // Update start width for next drag
    startWidthRef.current = pendingWidthRef.current;
  }, [onDragEnd, onWidthChange]);

  // Keyboard handler for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const direction = e.key === 'ArrowLeft' ? -10 : 10;
      const currentMaxWidth = maxWidth || window.innerWidth * 0.4;
      const newWidth = side === 'left' 
        ? Math.max(minWidth, Math.min(currentMaxWidth, width + direction))
        : Math.max(minWidth, Math.min(currentMaxWidth, width - direction));
      
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    }
  }, [side, minWidth, maxWidth, width, onWidthChange]);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      
      // Prevent text selection and scrolling during drag
      document.addEventListener('selectstart', (e) => e.preventDefault());
      document.addEventListener('dragstart', (e) => e.preventDefault());
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      
      // Re-enable text selection
      document.removeEventListener('selectstart', (e) => e.preventDefault());
      document.removeEventListener('dragstart', (e) => e.preventDefault());
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update pending width when initialWidth changes
  useEffect(() => {
    pendingWidthRef.current = initialWidth;
    setWidth(initialWidth);
  }, [initialWidth]);

  // Generate border classes based on borderSide prop
  const getBorderClasses = () => {
    switch (borderSide) {
      case 'left':
        return 'border-l border-gray-200';
      case 'right':
        return 'border-r border-gray-200';
      case 'both':
        return 'border-l border-r border-gray-200';
      case 'none':
      default:
        return '';
    }
  };

  return (
    <>
      <div 
        className={`bg-white flex-shrink-0 flex flex-col ${getBorderClasses()} ${className} ${isDragging ? 'select-none' : ''}`}
        style={{ 
          width: `${width}px`,
          transition: isDragging ? 'none' : 'width 0.2s ease-out'
        }}
      >
        {children}
      </div>
      
      {/* Resizer */}
      <div
        className={`w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex items-center justify-center group transition-all duration-200 ${resizerClassName} ${isDragging ? 'bg-blue-500 shadow-lg' : ''}`}
        onMouseDown={handleMouseDown}
        title={`Drag to resize ${side} panel`}
        role="separator"
        aria-label={`Resize ${side} panel`}
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={effectiveMaxWidth}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          pointerEvents: isDragging ? 'auto' : 'auto'
        }}
      >
        <GripVertical className={`h-6 w-4 transition-colors duration-200 ${isDragging ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`} />
      </div>
    </>
  );
};

export default ResizablePanel;
