import { Scaling } from '@options';

export const MIN_NODES_DEFAULT = 1;
export const MAX_NODES_DEFAULT = 1;
export const QUEUE_SIZE_SCALING_THRESHOLD_DEFAULT = 100;

export const defaultScaling: Scaling = {
  minNodes: MIN_NODES_DEFAULT,
  maxNodes: MAX_NODES_DEFAULT,
  queueSizeScalingThreshold: QUEUE_SIZE_SCALING_THRESHOLD_DEFAULT
}
