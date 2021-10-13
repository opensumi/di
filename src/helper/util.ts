export function uniq<T>(arr: T[]): T[] {
  const set = new Set<T>(arr);
  return Array.from(set);
}

export function flatten<T>(list: Array<T[] | T>) {
  const result: T[] = [];

  for (const item of list) {
    if (Array.isArray(item)) {
      result.push(...flatten(item));
    } else {
      result.push(item);
    }
  }

  return result;
}
