import type { TransportRouteCostItem, TransportRouteSegment } from '@/types';
import type { TransportRouteWriteLeg } from './transportRouteWrite';

export type LegRow = TransportRouteWriteLeg;

export type RouteFormValues = {
  code: string;

  name: string;

  isMultiTrip: boolean;
  trips: LegRow[];
  pickup: string;
  stuffing: string;
  dropoff: string;
  truckType: string;
  containerSize: string;
  freightAmount: number;

  basePay: number;
  allowance: number;
  segments: TransportRouteSegment[];
  costItems: TransportRouteCostItem[];
  markupPercent: number;
  isActive: boolean;
  notes: string;
};

export function blankLeg(): LegRow {
  return { departure: '', destination: '', laborCost: 0, distanceKm: 0 };
}

export function blankSegment(): TransportRouteSegment {
  return { from: '', to: '', distanceKm: 0 };
}

export function blankCostItem(): TransportRouteCostItem {
  return { name: '', unit: '', quantity: 1, amount: 0, note: '' };
}

export function blankRouteFormValues(): RouteFormValues {
  return {
    code: '',
    name: '',
    isMultiTrip: false,
    trips: [],
    pickup: '',
    stuffing: '',
    dropoff: '',
    truckType: '',
    containerSize: '',
    freightAmount: 0,
    basePay: 0,
    allowance: 0,

    segments: [blankSegment()],
    costItems: [blankCostItem()],
    markupPercent: 0,

    isActive: true,
    notes: '',
  };
}
