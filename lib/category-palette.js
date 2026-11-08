export const categoryPalette = [
  { background: '#f4f1ea', accent: '#8b6f47', border: '#e7dcc6' },
  { background: '#edf5ef', accent: '#3d6d4c', border: '#d6e8d9' },
  { background: '#eef4fb', accent: '#355f8a', border: '#d8e7f7' },
  { background: '#f7f0f7', accent: '#7a4d73', border: '#ead9ec' },
  { background: '#fff5ee', accent: '#b96b42', border: '#f2d9c9' },
  { background: '#f3f7f8', accent: '#496a72', border: '#d9e6e8' }
];

export function getCategoryPalette(categoryName, categories) {
  const index = Object.keys(categories).indexOf(categoryName);
  return categoryPalette[(index < 0 ? 0 : index) % categoryPalette.length];
}
