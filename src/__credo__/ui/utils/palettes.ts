import type { MantineColorsTuple } from '@mantine/core';

const terracotta: MantineColorsTuple = [
  '#fef4f1',
  '#fce8e3',
  '#f8cfc4',
  '#f4b5a4',
  '#ef9d88',
  '#eb8d76',
  '#e9836c',
  '#d97757',
  '#c2644b',
  '#ab4f3d',
];

const sandstone: MantineColorsTuple = [
  '#f9f8f6',
  '#f1eee9',
  '#e3ddd1',
  '#d4ccb9',
  '#c6baa1',
  '#b7a989',
  '#ada07c',
  '#9a8c6a',
  '#897c5e',
  '#786d52',
];

const forest: MantineColorsTuple = [
  '#f2f6f3',
  '#e1eae4',
  '#c2d2c8',
  '#a1baab',
  '#81a28f',
  '#628a73',
  '#527c65',
  '#456955',
  '#395746',
  '#2d4437',
];

const autumn: MantineColorsTuple = [
  '#fdf9ed',
  '#f9f1d4',
  '#f1e2a5',
  '#e9d375',
  '#e1c446',
  '#d9b517',
  '#ccaa14',
  '#b59711',
  '#9e840f',
  '#87710d',
];

const olive: MantineColorsTuple = [
  '#f6f9f1',
  '#ecefe3',
  '#d6dfc2',
  '#bfcd9e',
  '#abbe7f',
  '#9fb56b',
  '#98b060',
  '#849b4f',
  '#748944',
  '#55662f',
];

const emerald: MantineColorsTuple = [
  '#ecfdf5',
  '#d1fae5',
  '#a7f3d0',
  '#6ee7b7',
  '#34d399',
  '#10b981',
  '#059669',
  '#047857',
  '#065f46',
  '#064e3b',
];

const steel: MantineColorsTuple = [
  '#eaf3fb', 
  '#d6e6f7', 
  '#bcd6f0', 
  '#9bc1e7', 
  '#79aadb', 
  '#5f91c6', 
  '#4a76a9', 
  '#3e618c', 
  '#324e71', 
  '#273c59', // 9 - ACCENT - Dark emphasis
];

const ocean: MantineColorsTuple = [
  '#e4faff', 
  '#d4f0f9', 
  '#acddef', 
  '#80cae5', 
  '#5dbadc', 
  '#46b0d7', 
  '#37abd6', 
  '#2596be', 
  '#1186ab', 
  '#007497', // 9 - ACCENT - Dark emphasis
];

const coin: MantineColorsTuple = [
  '#fff5e0',
  '#ffe9cc',
  '#fdd19c',
  '#fab868',
  '#f8a33c',
  '#f7931a',
  '#f78f0e',
  '#dc7b00',
  '#c56d00',
  '#ab5c00',
];

const success: MantineColorsTuple = [
  '#f0fdf4',
  '#dcfce7',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#166534',
  '#14532d',
];

const neutral: MantineColorsTuple = [
  '#fafafa', 
  '#f5f5f5', 
  '#e5e5e5', 
  '#d4d4d4', 
  '#9ca3af', 
  '#6b7280', 
  '#4b5563', 
  '#374151', 
  '#1f2937', 
  '#111827', // 9 - Headings (Tailwind gray-900)
];

const danger: MantineColorsTuple = [
  '#fef2f2',
  '#fee2e2',
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#ef4444',
  '#dc2626',
  '#b91c1c',
  '#991b1b',
  '#7f1d1d',
];

const gray: MantineColorsTuple = [
  '#f9fafb', 
  '#f3f4f6', 
  '#e5e7eb', 
  '#d1d5db', 
  '#9ca3af', 
  '#6b7280', 
  '#4b5563', 
  '#374151', 
  '#1f2937', 
  '#111827', // 9 - gray-900
];

const dark: MantineColorsTuple = [
  '#c9c9c9', 
  '#b8b8b8', 
  '#828282', 
  '#696969', 
  '#424242', 
  '#3b3b3b', 
  '#2e2e2e', 
  '#242424', 
  '#1a1a1a', 
  '#141414', // 9 - Darkest
];

function invertPalette(palette: MantineColorsTuple): MantineColorsTuple {
  return [...palette].reverse() as unknown as MantineColorsTuple;
}

const neutralInv = invertPalette(neutral);
const darkInv = invertPalette(dark);

export const colorPalettes: Record<string, MantineColorsTuple> = {
  terracotta,
  sandstone,
  forest,
  autumn,
  
  olive,
  emerald,
  steel,
  ocean,
  coin,
  success,
  neutral,
  neutralInv,
  danger,
  gray,
  dark,
  darkInv,
};

export const brandPalettes: Record<string, MantineColorsTuple> = {
  terracotta,
  sandstone,
  forest,
  autumn,
  
  olive,
  emerald,
  steel,
  ocean,
  coin,
};

export function getColorPalette(name: string): MantineColorsTuple {
  return colorPalettes[name] || olive;
}
