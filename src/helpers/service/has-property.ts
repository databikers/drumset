export function hasProperty(target: any, property: string) {
  return Object.prototype.hasOwnProperty.apply(target, [property]);
}
