export function validateScalingFactor(scalingFactor: number): void {
  if (typeof scalingFactor !== 'undefined' && (typeof scalingFactor !== 'number' || scalingFactor < 1)) {
    throw new Error(`Scaling Factor should be greater or equal 1, received ${scalingFactor}`);
  }
}
