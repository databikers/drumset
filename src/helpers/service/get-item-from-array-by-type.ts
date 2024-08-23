export function getItemFromArrayByType(array: any[], type: string, index: number = 0): any {
  const items = array.filter((item: any) => typeof item === type);
  return items[index];
}
