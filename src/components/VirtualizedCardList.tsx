import React, { useState, useEffect, useRef } from 'react';
import type { UIEvent } from 'react';

interface VirtualizedCardListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
}

export function VirtualizedCardList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  emptyState,
}: VirtualizedCardListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-sync scroll position if items list updates
  useEffect(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, [items]);

  if (items.length === 0) {
    return <>{emptyState || null}</>;
  }

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = items.length * itemHeight;
  
  // Buffer size to prevent white flickering during fast scroll
  const bufferCount = 4;
  
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / itemHeight) - bufferCount
  );
  
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + bufferCount
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const item = items[i];
    visibleItems.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(item, i)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="no-scrollbar"
      style={{
        height: containerHeight,
        overflowY: 'auto',
        position: 'relative',
        width: '100%',
      }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}
