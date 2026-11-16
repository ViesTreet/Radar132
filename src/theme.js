// src/theme.js
export const NIVELES = {
  ligero:    { color: '#f1c40f', label: 'Ligero',    rango: '1-4' },
  medio:     { color: '#e67e22', label: 'Medio',     rango: '5-10' },
  peligroso: { color: '#e74c3c', label: 'Peligroso', rango: '11+' },
};

export const COLORS = {
  bg: '#12151c',
  card: '#1c212c',
  text: '#f2f4f8',
  muted: '#9aa3b5',
  primary: '#e74c3c',
  accent: '#2980b9',
};

export function hace(min) {
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
