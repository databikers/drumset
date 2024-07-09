export function validateParamsLength(funcName: string, params: any[], min: number, max: number) {
  const length = params.length;
  if (min === max) {
    if (length !== max) {
      throw new Error(`${funcName} requires ${max} arguments`);
    }
  } else {
    const minValue = Math.min(min, max);
    const maxValue = Math.max(min, max);
    if (length > max || length < min) {
      throw new Error(`${funcName} requires ${minValue}-${maxValue} arguments`);
    }
  }
}
