import type { Product, CreateProductInput, UpdateProductInput, ProductFilter } from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

export function validateCreateInput(input: CreateProductInput): void {
  const fields: Record<string, string> = {};

  if (!input.name.trim()) {
    fields['name'] = 'Name is required';
  }
  if (!input.code.trim()) {
    fields['code'] = 'Code is required';
  }
  if (!input.unit.trim()) {
    fields['unit'] = 'Unit is required';
  }
  if (input.price < 0) {
    fields['price'] = 'Price must not be negative';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid product input', fields);
  }
}

export function checkDuplicateCode(products: Product[], code: string, excludeId?: string): void {
  const duplicate = products.find((p) => p.code === code && p.id !== excludeId);
  if (duplicate) {
    throw new ValidationError('Duplicate product code', {
      code: `Product code "${code}" already exists`,
    });
  }
}

export function getProductSku(product: Product): string {
  const sku = (product.extra as { sku?: unknown } | undefined)?.sku;
  return typeof sku === 'string' ? sku.trim() : '';
}

export function getInputSku(input: { extra?: Record<string, unknown> }): string {
  const sku = (input.extra as { sku?: unknown } | undefined)?.sku;
  return typeof sku === 'string' ? sku.trim() : '';
}

export function checkDuplicateSku(products: Product[], sku: string, excludeId?: string): void {
  const target = sku.trim();
  if (!target) return;
  const duplicate = products.find((p) => p.id !== excludeId && getProductSku(p) === target);
  if (duplicate) {
    throw new ValidationError('Duplicate product SKU', {
      sku: `Product SKU "${target}" already exists`,
    });
  }
}

export function buildProduct(id: string, input: CreateProductInput, now: DateTimeInput): Product {
  return {
    id,
    name: input.name.trim(),
    code: input.code.trim(),
    description: input.description?.trim() ?? '',
    unit: input.unit.trim(),
    price: input.price,
    isActive: true,
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}

export function applyUpdate(
  product: Product,
  input: UpdateProductInput,
  now: DateTimeInput,
): Product {
  return {
    ...product,
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.code !== undefined ? { code: input.code.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    ...(input.unit !== undefined ? { unit: input.unit.trim() } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}

export function filterProducts(products: Product[], filter: ProductFilter): Product[] {
  let result = products;

  if (filter.isActive !== undefined) {
    result = result.filter((p) => p.isActive === filter.isActive);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term),
    );
  }

  return result;
}
