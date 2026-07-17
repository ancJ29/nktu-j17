import { createManualJsonStorage } from './_sharedSeed';

const store = createManualJsonStorage('__fake_data_lookups_json__');

export const getManualLookupsJson = store.get;
export const setManualLookupsJson = store.set;
