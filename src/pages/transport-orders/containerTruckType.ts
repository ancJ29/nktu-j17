export function truckTypeCarriesContainer(
  truckType: string | undefined,
  nonContainerTruckTypes: readonly string[],
): boolean {
  if (!truckType) return true;
  return !nonContainerTruckTypes.includes(truckType);
}
