type VehicleRef = {
  truckId?: string | null;
  truckPlate?: string | null;
};

export function isExternalTruck(ref: VehicleRef): boolean {
  return !ref.truckId;
}
