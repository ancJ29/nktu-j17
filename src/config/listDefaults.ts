import { isNKTU } from './client';

export const LIST_PAGINATION_DEFAULT = !isNKTU;

export const LIST_LAZY_RENDER_CHUNK = 50;

export const LIST_LAZY_RENDER_THRESHOLD = 200;

export const LIST_DEFAULT_RANGE_PILL = !isNKTU;
