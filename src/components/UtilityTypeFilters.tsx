import React, { useRef, useState, useEffect } from 'react';
import { BillType } from '../types';
import { cn } from '../utils';
import { 
  Zap, 
  Droplets, 
  Sun, 
  Wifi, 
  Phone, 
  Building, 
  FileText, 
  Wind, 
  Trash2, 
  Bug, 
  Flame, 
  MoreHorizontal,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface UtilityTypeFiltersProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  billTypes: BillType[];
}

export const UtilityTypeFilters: React.FC<UtilityTypeFiltersProps> = ({ selectedType, onSelectType, billTypes }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Electricity': return Zap;
      case 'Water': return Droplets;
      case 'Solar Bill': return Sun;
      case 'Data (Internet)': return Wifi;
      case 'Landline': return Phone;
      case 'Property Tax (MCG)': return Building;
      case 'Pollution Control': return Wind;
      case 'Waste Management': return Trash2;
      case 'Pest Control': return Bug;
      case 'Fire Safety Audit': return Flame;
      case 'Electrical Safety Audit': return Zap;
      default: return Tag;
    }
  };

  const items = [
    { type: '', label: 'All Bills', icon: FileText },
    ...billTypes.map(bt => ({
      type: bt.name,
      label: bt.name,
      icon: getIcon(bt.name)
    })),
    { type: 'Other', label: 'Other', icon: MoreHorizontal }
  ];

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [billTypes]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative group">
      {/* Left Arrow */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-content-bg via-content-bg to-transparent pr-12">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-white border border-border-light shadow-sm hover:border-primary/50 hover:text-primary transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-l from-content-bg via-content-bg to-transparent pl-12">
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-white border border-border-light shadow-sm hover:border-primary/50 hover:text-primary transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-8 overflow-x-auto no-scrollbar border-b border-border-light px-2"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = selectedType === item.type;
          
          return (
            <button
              key={item.label}
              onClick={() => onSelectType(item.type)}
              className={cn(
                "relative flex items-center gap-2 py-4 text-[13px] font-bold whitespace-nowrap transition-all outline-none",
                isActive 
                  ? "text-primary" 
                  : "text-text-secondary hover:text-primary/80"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-text-secondary")} />
              {item.label}
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
