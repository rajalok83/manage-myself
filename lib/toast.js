export function showToast(message, tone = 'error') {
  window.dispatchEvent(new CustomEvent('app-toast', {
    detail: { message, tone }
  }));
}