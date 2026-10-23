// Иконки таб-бара. Штрих кобальтом, без заливки.
import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IconPlan = () => (
  <svg {...base}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M8 3v4M16 3v4M3.5 10h17M8 14h3M8 17h6" />
  </svg>
);
export const IconCart = () => (
  <svg {...base}>
    <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
    <path d="M9 8.5h6M9 12h6M9 15.5h3" />
  </svg>
);
export const IconPot = () => (
  <svg {...base}>
    <path d="M4 10h16v5.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5z" />
    <path d="M2 10h20M10 7h4M9 3.5c0 1 1 1 1 2M14 3.5c0 1 1 1 1 2" />
  </svg>
);
export const IconBook = () => (
  <svg {...base}>
    <path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5V20" />
  </svg>
);
export const IconMe = () => (
  <svg {...base}>
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </svg>
);
export const IconChevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg {...base} width={22} height={22}>
    <path d={dir === 'left' ? 'M14.5 5l-7 7 7 7' : 'M9.5 5l7 7-7 7'} />
  </svg>
);
export const IconPlus = () => (
  <svg {...base} width={20} height={20}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconSearch = () => (
  <svg {...base} width={20} height={20}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);
