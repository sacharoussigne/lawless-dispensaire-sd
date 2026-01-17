export const breakpoints = {
  base: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const pxToBreakpoint = (px: number) => {
  return Object.entries(breakpoints)
    .sort(([, a], [, b]) => b - a)
    .find(([, size]) => px >= size)?.[0] as keyof typeof breakpoints;
};
