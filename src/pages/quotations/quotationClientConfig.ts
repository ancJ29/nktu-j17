import { byClient } from '@/config/client';

const NKTU_DEFAULT_NOTE = '';

export const QUOTATION_DEFAULT_NOTE = byClient({ nktu: NKTU_DEFAULT_NOTE }, '');
