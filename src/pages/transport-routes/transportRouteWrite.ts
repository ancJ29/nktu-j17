import type { TransportRouteLeg, TransportRouteRow, TransportRouteExtra } from '@/types';

export type TransportRouteWriteInput = {
  isMultiTrip: boolean;

  route: { pickup: string; stuffing: string; dropoff: string };

  trips: TransportRouteLeg[];
  truckType: string;
  containerSize: string;
  freightAmount: number;

  laborCost: number;
  isActive: boolean;
  extra: TransportRouteExtra;
};

export type TransportRouteWrite = Pick<
  TransportRouteRow,
  | 'isActive'
  | 'isMultiTrip'
  | 'route'
  | 'trips'
  | 'truckType'
  | 'containerSize'
  | 'freightAmount'
  | 'laborCost'
  | 'extra'
>;

function normalizeLeg(leg: TransportRouteLeg): TransportRouteLeg {
  return {
    departure: leg.departure.trim(),
    destination: leg.destination.trim(),
    laborCost: leg.laborCost || 0,
  };
}

export function buildTransportRouteWrite(input: TransportRouteWriteInput): TransportRouteWrite {
  const truckType = input.truckType.trim();
  const containerSize = input.containerSize.trim();

  const common = {
    isActive: input.isActive,
    truckType,

    containerSize,
    freightAmount: input.freightAmount || 0,
    extra: input.extra,
  };

  if (input.isMultiTrip) {
    const trips = input.trips.map(normalizeLeg);
    const first = trips[0];
    const last = trips[trips.length - 1];
    return {
      ...common,
      isMultiTrip: true,
      trips,

      route: {
        pickup: first?.departure ?? '',
        stuffing: '',
        dropoff: last?.destination ?? '',
      },

      laborCost: 0,
    };
  }

  return {
    ...common,
    isMultiTrip: false,
    route: {
      pickup: input.route.pickup.trim(),
      stuffing: input.route.stuffing.trim(),
      dropoff: input.route.dropoff.trim(),
    },
    trips: [],
    laborCost: input.laborCost || 0,
  };
}
