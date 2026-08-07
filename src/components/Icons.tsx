import React from 'react';

export const CustomIcons = {
  Lock: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor" opacity="0.15"/>
      <rect x="5" y="10" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M7.5 10V6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="12" cy="15.5" r="1.5" fill="currentColor"/>
    </svg>
  ),
  /** Bare check — used on the solved VaultTile, where the tile itself is the fill. */
  Check: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M5 12.5L10 17.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
      <path d="M7.5 12.5L10.5 15.5L17 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Tile1: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 3L4 6V11C4 16.5 7.5 21 12 23C16.5 21 20 16.5 20 11V6L12 3Z" fill="currentColor" opacity="0.2"/>
      <path d="M12 3L4 6V11C4 16.5 7.5 21 12 23C16.5 21 20 16.5 20 11V6L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 7V13M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Tile2: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="10.5" cy="10.5" r="7.5" fill="currentColor" opacity="0.2"/>
      <circle cx="10.5" cy="10.5" r="7.5" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 21L15.8 15.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10.5 7V10.5L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Tile3: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 18V12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <rect x="3" y="14" width="4" height="6" rx="2" fill="currentColor" opacity="0.2"/>
      <rect x="3" y="14" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="17" y="14" width="4" height="6" rx="2" fill="currentColor" opacity="0.2"/>
      <rect x="17" y="14" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Tile4: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="13" r="5" fill="currentColor" opacity="0.2"/>
      <path d="M7 13C7 10.2386 9.23858 8 12 8C14.7614 8 17 10.2386 17 13V18H7V13Z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="8" cy="6" r="2.5" fill="currentColor"/>
      <circle cx="16" cy="6" r="2.5" fill="currentColor"/>
    </svg>
  ),
  Tile5: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 2C16.5 2 22 5 22 12C22 13 18 13 18 13C18 13 18 9 12 9C9 9 6 12 6 15C6 17 9 19 12 19" fill="currentColor" opacity="0.2"/>
      <path d="M12 2C16.5 2 22 5 22 12C22 13 18 13 18 13C18 13 18 9 12 9C9 9 6 12 6 15C6 17 9 19 12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Tile6: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" fill="currentColor" opacity="0.2"/>
      <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Tile7: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M21 11.5C21 16.1944 16.9706 20 12 20C10.5905 20 9.25595 19.6468 8.08272 19.019L3 21L5.03473 16.0355C4.38221 14.7335 4 13.1706 4 11.5C4 6.80558 8.02944 3 12 3C15.9706 3 21 6.80558 21 11.5Z" fill="currentColor" opacity="0.2"/>
      <path d="M21 11.5C21 16.1944 16.9706 20 12 20C10.5905 20 9.25595 19.6468 8.08272 19.019L3 21L5.03473 16.0355C4.38221 14.7335 4 13.1706 4 11.5C4 6.80558 8.02944 3 12 3C15.9706 3 21 6.80558 21 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 12H8.01M12 12H12.01M16 12H16.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  Tile8: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="7" fill="currentColor" opacity="0.2"/>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 12C4 16 8 21 12 21C16 21 20 16 20 12C20 8 16 3 12 3C8 3 4 8 4 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Tile9: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M5 21L4 10L9 13L12 5L15 13L20 10L19 21H5Z" fill="currentColor" opacity="0.2"/>
      <path d="M5 21L4 10L9 13L12 5L15 13L20 10L19 21H5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="4" cy="7" r="2" fill="currentColor"/>
      <circle cx="20" cy="7" r="2" fill="currentColor"/>
      <circle cx="12" cy="2" r="2" fill="currentColor"/>
    </svg>
  ),
  Reward: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2L15 8L22 9L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9L9 8L12 2Z" fill="currentColor" opacity="0.2"/>
      <path d="M12 2L15 8L22 9L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};
