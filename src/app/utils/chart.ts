export const UI_CHART_TYPES = [
  { type: undefined, strokeWidth: 0 },
  { type: 'line', strokeWidth: 3 },
  { type: 'area', strokeWidth: 0 },
  { type: 'bar', strokeWidth: 0 },
] as const;

export const UI_CHART_PROPS = {
  line: { strokeWidth: 3 },
  area: { strokeWidth: 0 },
  bar: { strokeWidth: 0 },
} as const;

export const CHART_COLORS = {
  rx: { light: 'rgba(128,128,128,0.3)', dark: 'rgba(255,255,255,0.3)' },
  tx: { light: 'rgba(128,128,128,0.4)', dark: 'rgba(255,255,255,0.3)' },
  gradient: {
    light: ['rgba(0,0,0,1.0)', 'rgba(0,0,0,1.0)'],
    dark: ['rgba(128,128,128,0)', 'rgba(128,128,128,0)'],
  },
};
