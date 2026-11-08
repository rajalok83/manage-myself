export function updateIfChanged(setter, nextValue) {
  setter((currentValue) => (
    JSON.stringify(currentValue) === JSON.stringify(nextValue) ? currentValue : nextValue
  ));
}
