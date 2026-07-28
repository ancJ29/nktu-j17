export function yamlify(data: unknown, level = 0): string {
  if (data === null || data === undefined) {
    return String(data);
  }
  if (typeof data !== 'object') {
    return String(data);
  }

  const indent = level > 0 ? '  '.repeat(level) : '';

  if (isArray(data)) {
    return (
      '\n' +
      data
        .map((item: unknown) => {
          return `${indent}- ${yamlify(item, level + 1)}`;
        })
        .join('\n')
    );
  }

  return Object.entries(data)
    .map(([key, value]): string => {
      if (isArray(value)) {
        return `${indent}${key}:${yamlify(value, level + 1)}`;
      }
      if (isObject(value)) {
        return `${indent}${key}:\n${yamlify(value, level + 1)}`;
      }
      return `${indent}${key}: ${String(value)}`;
    })
    .join('\n');

  function isObject(data: unknown) {
    return typeof data === 'object' && data !== null && !isArray(data);
  }

  function isArray(data: unknown) {
    return Array.isArray(data);
  }
}

export function cleanObj<T extends Record<string, unknown>>(obj: T) {
  for (const key in obj) {
    if (obj[key] === null || obj[key] === undefined) {
      delete obj[key];
    }
  }
  return obj;
}
