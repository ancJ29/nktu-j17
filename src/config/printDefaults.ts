import { ORANGE_SHEET, type SheetPalette } from '@/utils/printDocument';
import { byClient } from './client';

export const PURCHASE_ORDER_PALETTE = byClient<SheetPalette | undefined>(
  { nktu: ORANGE_SHEET },
  undefined,
);
