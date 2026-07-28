import type { UnitConversion } from '@/types/product';

export function validateUnitConversions(
  units: string[],
  conversions: UnitConversion[],
): 'conflict' | 'disconnected' | null {
  if (units.length < 2) return null;

  const valid = conversions.filter((c) => c.unit && c.baseUnit && c.quantity > 0);
  if (valid.length === 0) return 'disconnected';

  const graph = new Map<string, Map<string, number>>();
  for (const u of units) graph.set(u, new Map());

  for (const { unit, baseUnit, quantity } of valid) {
    if (!graph.has(unit) || !graph.has(baseUnit)) continue;
    graph.get(unit)!.set(baseUnit, quantity);
    graph.get(baseUnit)!.set(unit, 1 / quantity);
  }

  const ratioFromRoot = new Map<string, number>();
  ratioFromRoot.set(units[0], 1);
  const queue = [units[0]];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentRatio = ratioFromRoot.get(current)!;
    const neighbors = graph.get(current);
    if (!neighbors) continue;

    for (const [neighbor, edgeRatio] of neighbors) {
      const expectedRatio = currentRatio * edgeRatio;

      if (ratioFromRoot.has(neighbor)) {
        const existing = ratioFromRoot.get(neighbor)!;
        const relDiff = Math.abs(expectedRatio - existing) / Math.max(Math.abs(existing), 1e-10);
        if (relDiff > 1e-6) return 'conflict';
      } else {
        ratioFromRoot.set(neighbor, expectedRatio);
        queue.push(neighbor);
      }
    }
  }

  if (!units.every((u) => ratioFromRoot.has(u))) return 'disconnected';

  return null;
}

function buildRateGraph(conversions: UnitConversion[]): Map<string, Map<string, number>> {
  const g = new Map<string, Map<string, number>>();
  const ensure = (u: string) => {
    if (!g.has(u)) g.set(u, new Map());
  };
  for (const c of conversions) {
    if (!c.unit || !c.baseUnit || !c.quantity || c.quantity <= 0) continue;
    ensure(c.unit);
    ensure(c.baseUnit);
    g.get(c.unit)!.set(c.baseUnit, c.quantity);
    g.get(c.baseUnit)!.set(c.unit, 1 / c.quantity); // inverse
  }
  return g;
}

function findRate(
  graph: Map<string, Map<string, number>>,
  from: string,
  to: string,
): number | null {
  if (from === to) return 1;
  if (!graph.has(from) || !graph.has(to)) return null;

  const visited = new Set<string>([from]);
  const queue: Array<[string, number]> = [[from, 1]];

  while (queue.length > 0) {
    const [current, cumulative] = queue.shift()!;
    const edges = graph.get(current);
    if (!edges) continue;

    for (const [neighbor, rate] of edges) {
      if (neighbor === to) return cumulative * rate;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, cumulative * rate]);
      }
    }
  }
  return null;
}

export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  conversions: UnitConversion[],
): number | null {
  if (fromUnit === toUnit) return value;
  const graph = buildRateGraph(conversions);
  const rate = findRate(graph, fromUnit, toUnit);
  return rate !== null ? value * rate : null;
}

export function getItemBaseUnit(item: { unit: string; extra?: { units?: string[] } }): string {
  return item.extra?.units?.[0] ?? item.unit;
}

export function getItemUnits(item: { unit: string; extra?: { units?: string[] } }): string[] {
  const units = item.extra?.units;
  return units && units.length > 0 ? units : [item.unit];
}

export function getConversionDisplay(
  onHand: number,
  baseUnit: string,
  conversions: UnitConversion[],
  allUnits: string[],
): string | null {
  if (allUnits.length <= 1 || conversions.length === 0) return null;

  const graph = buildRateGraph(conversions);

  let best: { unit: string; value: number } | null = null;

  for (const u of allUnits) {
    if (u === baseUnit) continue;
    const rate = findRate(graph, baseUnit, u);
    if (rate === null) continue;
    const converted = onHand * rate;
    if (converted === 0) continue;

    if (!best || Math.abs(converted) < Math.abs(best.value)) {
      best = { unit: u, value: converted };
    }
  }

  if (!best) return null;

  const formatted = Number.isInteger(best.value)
    ? best.value.toLocaleString()
    : best.value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return `${formatted} ${best.unit}`;
}
