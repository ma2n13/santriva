import React, { forwardRef, useState } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type ButtonVariant = 
  | 'emerald' 
  | 'amber' 
  | 'sky' 
  | 'rose' 
  | 'gray' 
  | 'dark' 
  | 'ghost' 
  | 'gradient-amber' 
  | 'gradient-emerald';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  emerald: 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs',
  amber: 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs',
  sky: 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs',
  rose: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
  gray: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
  dark: 'bg-gray-900 hover:bg-black text-white shadow-xs',
  ghost: 'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
  'gradient-emerald': 'bg-gradient-to-r from-emerald-500/20 to-teal-600/30 hover:from-emerald-500/30 hover:to-teal-600/40 text-emerald-300 border border-emerald-400/40 shadow-xs',
  'gradient-amber': 'bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-300 border border-amber-400/40 shadow-xs'
};

const SIZE_CLASSES: Record<ButtonSize, { btn: string; icon: string }> = {
  sm: { btn: 'p-1.5 min-h-[30px] rounded-lg text-xs', icon: 'w-3.5 h-3.5' },
  md: { btn: 'p-2.5 min-h-[38px] rounded-xl text-xs sm:text-sm', icon: 'w-4 h-4' },
  lg: { btn: 'p-3 min-h-[44px] rounded-2xl text-sm font-bold', icon: 'w-5 h-5' }
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  badge?: number | string | null;
  badgeColor?: string;
}

/**
 * Komponen Standar Tombol Aplikasi:
 * - Menampilkan ICON SAJA saat kondisi normal (hemat ruang & rapi).
 * - Menampilkan TEKS KETERANGAN saat kursor diarahkan (hover) atau saat diklik/fokus (touch/click).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  label,
  variant = 'emerald',
  size = 'md',
  badge,
  badgeColor = 'bg-red-500',
  className = '',
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  disabled,
  ...rest
}, ref) => {
  const [isHoveredOrFocused, setIsHoveredOrFocused] = useState(false);

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHoveredOrFocused(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHoveredOrFocused(false);
    onMouseLeave?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHoveredOrFocused(true);
    onClick?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    setIsHoveredOrFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    setIsHoveredOrFocused(false);
    onBlur?.(e);
  };

  const currentSize = SIZE_CLASSES[size];
  const variantClass = VARIANT_CLASSES[variant];

  return (
    <button
      ref={ref}
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`group relative inline-flex items-center justify-center font-bold transition-all duration-300 ease-out select-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group-hover:px-3.5 ${currentSize.btn} ${variantClass} ${
        isHoveredOrFocused ? 'px-3.5 shadow-md' : 'px-2.5'
      } ${className}`}
      {...rest}
    >
      <span className="shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        {icon}
      </span>

      {/* Label teks: tertutup saat normal, terbuka saat di-hover atau diklik */}
      <span 
        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out inline-block font-semibold ${
          isHoveredOrFocused ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
        }`}
      >
        {label}
      </span>

      {/* Badge Angka Notifikasi jika ada */}
      {badge !== undefined && badge !== null && (
        <span className={`absolute -top-1 -right-1 ${badgeColor} text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs ring-2 ring-white animate-pulse`}>
          {badge}
        </span>
      )}
    </button>
  );
});

IconButton.displayName = 'IconButton';

export interface IconButtonLinkProps extends Omit<LinkProps, 'children'> {
  icon: React.ReactNode;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  badge?: number | string | null;
  badgeColor?: string;
  className?: string;
}

/**
 * Komponen Standar Tombol Link (React Router Link) dengan format Icon-Only + Teks saat hover/klik
 */
export const IconButtonLink = forwardRef<HTMLAnchorElement, IconButtonLinkProps>(({
  icon,
  label,
  variant = 'amber',
  size = 'md',
  badge,
  badgeColor = 'bg-red-500',
  className = '',
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}, ref) => {
  const [isHoveredOrFocused, setIsHoveredOrFocused] = useState(false);

  const currentSize = SIZE_CLASSES[size];
  const variantClass = VARIANT_CLASSES[variant];

  return (
    <Link
      ref={ref}
      title={label}
      aria-label={label}
      onMouseEnter={(e) => { setIsHoveredOrFocused(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setIsHoveredOrFocused(false); onMouseLeave?.(e); }}
      onClick={(e) => { setIsHoveredOrFocused(true); onClick?.(e); }}
      onFocus={(e) => { setIsHoveredOrFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setIsHoveredOrFocused(false); onBlur?.(e); }}
      className={`group relative inline-flex items-center justify-center font-bold transition-all duration-300 ease-out select-none active:scale-95 group-hover:px-3.5 ${currentSize.btn} ${variantClass} ${
        isHoveredOrFocused ? 'px-3.5 shadow-md' : 'px-2.5'
      } ${className}`}
      {...rest}
    >
      <span className="shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        {icon}
      </span>

      <span 
        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out inline-block font-semibold ${
          isHoveredOrFocused ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
        }`}
      >
        {label}
      </span>

      {badge !== undefined && badge !== null && (
        <span className={`absolute -top-1 -right-1 ${badgeColor} text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs ring-2 ring-white animate-pulse`}>
          {badge}
        </span>
      )}
    </Link>
  );
});

IconButtonLink.displayName = 'IconButtonLink';
export default IconButton;
