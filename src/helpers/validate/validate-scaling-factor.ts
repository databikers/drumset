import { Scaling } from '@options';

export function validateScalingFactor(scaling: Scaling): void {
  if (typeof scaling !== 'object' || !scaling) {
    throw new Error(`The scaling property should be an Object`);
  }
  const { minNodes, maxNodes, queueSizeScalingThreshold } = scaling;
  for (const key in scaling) {
    const value: any = scaling[key as keyof Scaling];
    if (typeof value !== 'number' || value < 1) {
      throw new Error(`The scaling.${key} property should be a positive number`);
    }
  }
}
