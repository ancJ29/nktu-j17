
import { cMngtConnector } from '@credo/connectors/connector';
import { useTruckAssetStore, TRUCK_ASSET_RECORD_TARGET } from '@/stores/useTruckAssetStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { EmployeeExtra, TruckAssetExtra, TruckAssetRow } from '@/types';

export type DriverLinkSnapshot = {
  id: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
  licenseClass?: string;
};

async function writeEmployeeExtra(
  id: string,
  version: string,
  extra: EmployeeExtra,
): Promise<void> {
  await useEmployeeStore.getState().updateSafely({ id, version, patch: { extra } });
}

async function writeTruckExtra(id: string, version: string, extra: TruckAssetExtra): Promise<void> {
  await useTruckAssetStore.getState().updateSafely({ id, version, patch: { extra } });
}

async function fetchTruck(id: string): Promise<TruckAssetRow> {
  const res = await cMngtConnector.getSingleRecordById(TRUCK_ASSET_RECORD_TARGET, { id });
  return res.item as TruckAssetRow;
}

async function assignTruckToDriver(
  driverId: string,
  truckId: string,
  truckCode: string,
): Promise<string | undefined> {
  const { employee } = await cMngtConnector.getEmployeeById<EmployeeExtra>({ id: driverId });
  const e = employee.extra ?? {};
  const prior = e.truckAssetId;
  
  if (prior !== truckId || e.truckAssetCode !== truckCode) {
    await writeEmployeeExtra(driverId, employee.version, {
      ...e,
      truckAssetId: truckId,
      truckAssetCode: truckCode,
    });
  }
  return prior;
}

async function clearDriverTruck(driverId: string, truckId: string): Promise<void> {
  const { employee } = await cMngtConnector.getEmployeeById<EmployeeExtra>({ id: driverId });
  const e = employee.extra ?? {};
  if (e.truckAssetId !== truckId) return; 
  await writeEmployeeExtra(driverId, employee.version, {
    ...e,
    truckAssetId: undefined,
    truckAssetCode: undefined,
  });
}

async function assignDriverToTruck(
  truckId: string,
  driver: DriverLinkSnapshot,
): Promise<string | undefined> {
  const truck = await fetchTruck(truckId);
  const e = truck.extra ?? {};
  const prior = e.driverId;
  await writeTruckExtra(truckId, truck.version, {
    ...e,
    driverId: driver.id,
    driverName: driver.name,
    driverPhone: driver.phone || undefined,
    licenseNumber: driver.licenseNumber || undefined,
    licenseClass: driver.licenseClass || undefined,
  });
  return prior;
}

async function clearTruckDriver(truckId: string, driverId: string): Promise<void> {
  const truck = await fetchTruck(truckId);
  const e = truck.extra ?? {};
  if (e.driverId !== driverId) return; 
  await writeTruckExtra(truckId, truck.version, {
    ...e,
    driverId: undefined,
    driverName: undefined,
    driverPhone: undefined,
    licenseNumber: undefined,
    licenseClass: undefined,
  });
}

export async function syncDriverLinkFromTruck(params: {
  truckId: string;
  
  truckCode: string;
  prevDriverId?: string;
  newDriverId?: string;
}): Promise<void> {
  const { truckId, truckCode, prevDriverId, newDriverId } = params;
  if (newDriverId) {
    const displacedTruck = await assignTruckToDriver(newDriverId, truckId, truckCode);
    
    if (displacedTruck && displacedTruck !== truckId) {
      await clearTruckDriver(displacedTruck, newDriverId);
    }
  }
  
  if (prevDriverId && prevDriverId !== newDriverId) {
    await clearDriverTruck(prevDriverId, truckId);
  }
}

export async function syncTruckLinkFromDriver(params: {
  driverId: string;
  
  driver: DriverLinkSnapshot;
  prevTruckId?: string;
  newTruckId?: string;
}): Promise<void> {
  const { driverId, driver, prevTruckId, newTruckId } = params;
  if (newTruckId) {
    const displacedDriver = await assignDriverToTruck(newTruckId, driver);
    
    if (displacedDriver && displacedDriver !== driverId) {
      await clearDriverTruck(displacedDriver, newTruckId);
    }
  }
  
  if (prevTruckId && prevTruckId !== newTruckId) {
    await clearTruckDriver(prevTruckId, driverId);
  }
}
