export function parseProperties(properties: Record<string, unknown>): string {
  if (!properties) {
    return '';
  }

  return Object.entries(properties)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}
