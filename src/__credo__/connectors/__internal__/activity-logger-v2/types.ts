export type ActivityEntity = {
  id: string;
  clientId: string;
  actorId: string;
  action: string;
  targetId: string | null;
  memo: Record<string, unknown>;
  createdAt: Date | string;
};

export type ActivityInput = {
  clientId: string;
  actorId: string;
  action: string;
  targetId?: string;
  memo?: Record<string, unknown>;

  timestamp?: string;
};

export type LogActivitiesRequest = {
  activities: ActivityInput[];
};
export type LogActivitiesResponse = {
  ids: string[];
};

export type GetByActorRequest = {
  actorId: string;
  clientId: string;

  cursor?: string;
  limit?: number;
};
export type GetByActorResponse = {
  activities: ActivityEntity[];
  nextCursor?: string;
};

export type GetByTargetRequest = {
  targetId: string;
  clientId: string;
  cursor?: string;
  limit?: number;
};
export type GetByTargetResponse = {
  activities: ActivityEntity[];
  nextCursor?: string;
};
