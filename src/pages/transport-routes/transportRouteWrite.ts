import type {
  TransportRouteCostItem,
  TransportRouteExtra,
  TransportRouteLeg,
  TransportRouteRow,
  TransportRouteSegment,
} from '@/types';

export type TransportRouteWriteLeg = TransportRouteLeg & { distanceKm?: number };

export type TransportRouteWriteInput = {
  name: string;
  isMultiTrip: boolean;

  route: { pickup: string; stuffing: string; dropoff: string };

  trips: TransportRouteWriteLeg[];
  truckType: string;
  containerSize: string;
  freightAmount: number;

  basePay: number;

  allowance: number;

  segments: TransportRouteSegment[];

  costItems: TransportRouteCostItem[];
  markupPercent: number;
  isActive: boolean;
  extra: TransportRouteExtra;
};

export type TransportRouteWrite = Pick<
  TransportRouteRow,
  | 'isActive'
  | 'name'
  | 'isMultiTrip'
  | 'route'
  | 'trips'
  | 'truckType'
  | 'containerSize'
  | 'freightAmount'
  | 'basePay'
  | 'allowance'
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

function normalizeLeg(leg: TransportRouteWriteLeg): TransportRouteLeg {
  return {
    departure: leg.departure.trim(),
    destination: leg.destination.trim(),
    laborCost: leg.laborCost || 0,
  };
}

export function deriveSegmentsFromLegs(
  trips: readonly TransportRouteWriteLeg[],
): TransportRouteSegment[] {
  return trips.map((leg) => ({
    from: leg.departure.trim(),
    to: leg.destination.trim(),
    distanceKm: leg.distanceKm || 0,
  }));
}

export function buildTransportRouteWrite(input: TransportRouteWriteInput): TransportRouteWrite {
  const truckType = input.truckType.trim();
  const containerSize = input.containerSize.trim();

  const common = {
    isActive: input.isActive,

    name: input.name.trim(),
    truckType,

    containerSize,
    freightAmount: input.freightAmount || 0,

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

      segments: deriveSegmentsFromLegs(input.trips),

      route: {
        pickup: first?.departure ?? '',
        stuffing: '',
        dropoff: last?.destination ?? '',
      },

      basePay: 0,
      allowance: 0,
      laborCost: 0,
    };
  }

  return {
    ...common,
    isMultiTrip: false,

    segments: input.segments.map(normalizeSegment).filter((seg) => !isBlankSegment(seg)),
    route: {
      pickup: input.route.pickup.trim(),
      stuffing: input.route.stuffing.trim(),
      dropoff: input.route.dropoff.trim(),
    },
    trips: [],
    basePay: input.basePay || 0,
    allowance: input.allowance || 0,

    laborCost: (input.basePay || 0) + (input.allowance || 0),
  };
}
