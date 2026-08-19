import type {
  TransportRouteCostItem,
  TransportRouteExtra,
  TransportRouteLeg,
  TransportRouteRow,
  TransportRouteSegment,
} from '@/types';

export type TransportRouteWriteInput = {
  isMultiTrip: boolean;

  route: { pickup: string; stuffing: string; dropoff: string };

  trips: TransportRouteLeg[];
  truckType: string;
  containerSize: string;
  freightAmount: number;

  laborCost: number;

  segments: TransportRouteSegment[];

  costItems: TransportRouteCostItem[];
  markupPercent: number;
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
  | 'segments'
  | 'costItems'
  | 'markupPercent'
  | 'extra'
>;

function normalizeSegment(seg: TransportRouteSegment): TransportRouteSegment {
  return {
    from: seg.from.trim(),
    to: seg.to.trim(),
    distanceKm: seg.distanceKm || 0,
  };
}

function isBlankSegment(seg: TransportRouteSegment): boolean {
  return !seg.from && !seg.to && !seg.distanceKm;
}

function normalizeCostItem(item: TransportRouteCostItem): TransportRouteCostItem {
  const note = (item.note ?? '').trim();
  return {
    name: item.name.trim(),
    unit: item.unit.trim(),
    quantity: item.quantity || 0,
    amount: item.amount || 0,
    ...(note ? { note } : {}),
  };
}

function isBlankCostItem(item: TransportRouteCostItem): boolean {
  return !item.name && !item.amount && !item.quantity;
}

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

    segments: input.segments.map(normalizeSegment).filter((s) => !isBlankSegment(s)),
    costItems: input.costItems.map(normalizeCostItem).filter((i) => !isBlankCostItem(i)),
    markupPercent: input.markupPercent || 0,
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
