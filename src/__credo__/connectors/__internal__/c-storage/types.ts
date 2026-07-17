

export type RecordEntity<T = unknown> = {
  id: string;
  serviceCode: string;
  key: string;
  description: string;
  isPrivate: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  data: T;
};

export type GetPublicRecordsRequest = {
  serviceCode: string;
  cursor?: string;
  limit?: number;
  noData?: boolean;
};
export type GetPublicRecordsResponse<T = unknown> = {
  records: (RecordEntity<T> | Omit<RecordEntity<T>, 'data'>)[];
  nextCursor?: string;
};

export type GetPrivateRecordsRequest = {
  serviceCode: string;
  accessKey?: string;
  cursor?: string;
  limit?: number;
  noData?: boolean;
};
export type GetPrivateRecordsResponse<T = unknown> = {
  records: (RecordEntity<T> | Omit<RecordEntity<T>, 'data'>)[];
  nextCursor?: string;
};

export type GetRecordByKeyRequest = {
  serviceCode: string;
  key: string;
  accessKey?: string;
  allowNotFound?: boolean;
};
export type GetRecordByKeyResponse<T = unknown> = {
  record: RecordEntity<T>;
};

export type PushRecordRequest = {
  serviceCode: string;
  key: string;
  isPrivate: boolean | undefined;
  data: unknown;
  description: string | undefined;
};
export type PushRecordResponse = { id: string };

export type GetRecordsByKeysRequest = {
  serviceCode: string;
  keys: string[];
  accessKey?: string;
};
export type GetRecordsByKeysResponse<T = unknown> = {
  records: RecordEntity<T>[];
};

export type RemoveRecordsByPrefixRequest = {
  serviceCode: string;
  prefix: string;
  dryRun?: boolean;
};
export type RemoveRecordsByPrefixResponse = {
  success: true;
  deletedCount: number;
};

export type RemoveRecordRequest = {
  serviceCode: string;
  key: string;
};
export type RemoveRecordResponse = void;

export type SeriesItem = {
  key: string | number;
  value: unknown;
};

export type PushToSeriesRequest = {
  serviceCode: string;
  key: string;
  items: SeriesItem[];
  accessKey?: string;
  isPrivate?: boolean;
  description?: string;
};
export type PushToSeriesResponse = {
  id: string;
  itemsCount: number;
};

export type GetSeriesRequest = {
  serviceCode: string;
  key: string;
  accessKey?: string;
};
export type GetSeriesResponse = {
  record: RecordEntity<{ items: SeriesItem[] }>;
};

export type RemoveSeriesRequest = {
  serviceCode: string;
  key: string;
  accessKey?: string;
};
export type RemoveSeriesResponse = void;

export type RemoveSeriesItemRequest = {
  serviceCode: string;
  key: string;
  itemKey: string | number;
  accessKey?: string;
};
export type RemoveSeriesItemResponse = {
  itemsCount: number;
};

export type ServiceEntity = {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ServiceSummary = {
  name: string;
  code: string;
};

export type GetAllServicesRequest = {
  fullData?: boolean;
};
export type GetAllServicesResponse = {
  services: (ServiceEntity | ServiceSummary)[];
};

export type RegisterServiceRequest = {
  name: string;
  code: string;
  description?: string;
  accessKey: string;
  memo?: Record<string, unknown>;
};
export type RegisterServiceResponse = { id: string };

export type GetServiceByKeyRequest = {
  serviceCode: string;
};
export type GetServiceByKeyResponse = ServiceEntity;

export type UpdateAccessKeyRequest = {
  serviceCode: string;
  accessKey: string;
};
export type UpdateAccessKeyResponse = void;

export type DisableServiceRequest = {
  serviceCode: string;
};
export type DisableServiceResponse = void;

export type PurgeServiceRequest = {
  serviceCode: string;
};
export type PurgeServiceResponse = {
  success: boolean;
  deletedRecordsCount: number;
};
