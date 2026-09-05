export function startLoading() {
  window.dispatchEvent(new CustomEvent('app-loading', { detail: { active: true } }));
}

export function stopLoading() {
  window.dispatchEvent(new CustomEvent('app-loading', { detail: { active: false } }));
}
