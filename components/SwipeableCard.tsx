
import React, { useState, useRef } from 'react';
import { Trash2, X } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({ children, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const startX = useRef(0);
  const currentOffsetX = useRef(0);

  const REVEAL_WIDTH = 100; // Width of the delete area

  // Touch Action 'pan-y' ensures the browser handles vertical scrolling, 
  // but lets us handle horizontal gestures without browser interference.
  const style: React.CSSProperties = {
    touchAction: 'pan-y',
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only start dragging if we haven't clicked a button inside
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    startX.current = e.clientX;
    currentOffsetX.current = offsetX;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const diff = e.clientX - startX.current;
    // Calculate new offset based on previous position
    // We invert the direction logic visually: dragging left increases positive offset for the background reveal
    let newOffset = currentOffsetX.current - diff; 

    // We want dragging LEFT to reveal the RIGHT background. 
    // So if I drag left (diff is negative), newOffset becomes positive.
    
    // Clamp values
    if (newOffset < 0) newOffset = 0; // Can't drag right to reveal left
    if (newOffset > REVEAL_WIDTH + 50) newOffset = REVEAL_WIDTH + 50; // Resistance

    setOffsetX(newOffset);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);

    // Threshold to snap open
    if (offsetX > REVEAL_WIDTH / 2) {
      setOffsetX(REVEAL_WIDTH);
      setIsRevealed(true);
    } else {
      setOffsetX(0);
      setIsRevealed(false);
    }
  };

  const resetSwipe = () => {
      setOffsetX(0);
      setIsRevealed(false);
  };

  return (
    <div className="relative w-full mb-6 group select-none" style={style}>
      {/* Background Layer (Delete Action) */}
      <div className="absolute inset-y-0 right-0 left-auto w-full rounded-[2rem] flex items-center justify-end overflow-hidden">
        <div 
            className="bg-red-500 h-full flex items-center justify-center transition-all duration-300 ease-out shadow-inner rounded-r-[2rem]"
            style={{ width: `${Math.max(offsetX, 0)}px` }}
        >
             {/* Delete Button - Only clickable when revealed */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (isRevealed) onDelete();
                }}
                className={`
                    text-white flex flex-col items-center justify-center gap-1 min-w-[80px] h-full
                    transition-opacity duration-200
                    ${offsetX < 50 ? 'opacity-0' : 'opacity-100'}
                `}
            >
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm mb-1">
                    <Trash2 size={22} />
                </div>
                <span className="text-xs font-bold tracking-wide">מחק</span>
            </button>
        </div>
      </div>

      {/* Foreground Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative bg-transparent transition-transform will-change-transform cursor-grab active:cursor-grabbing"
        style={{ 
          transform: `translateX(-${offsetX}px)`, // Moving content left
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
      >
        {children}
        
        {/* Overlay when revealed to allow closing by clicking the body */}
        {isRevealed && (
            <div 
                onClick={(e) => { e.stopPropagation(); resetSwipe(); }}
                className="absolute inset-0 z-10 bg-white/0 cursor-pointer rounded-[2rem]"
            />
        )}
      </div>
    </div>
  );
};
