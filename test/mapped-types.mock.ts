export function PartialType<T extends new (...args: any[]) => object>(
  classRef: T,
) {
  return class extends classRef {};
}
