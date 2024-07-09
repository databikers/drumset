export function getItemFromArrayByType(array: any[], type: string): any {
  const [item] = array.filter((item: any) => typeof item === type);
  return item;
}
