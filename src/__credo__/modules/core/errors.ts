export class ModuleError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ModuleError';
  }
}

export class NotFoundError extends ModuleError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ModuleError {
  constructor(
    message: string,
    public readonly fields: Record<string, string>,
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class VersionConflictError extends ModuleError {
  constructor(
    entity: string,
    id: string,
    public readonly latest: unknown,
  ) {
    super(`${entity} ${id} was modified by another user`, 'VERSION_CONFLICT');
    this.name = 'VersionConflictError';
  }
}

export class ListVersionConflictError extends ModuleError {
  constructor(
    entity: string,
    public readonly currentHash: string,
  ) {
    super(`${entity} list was modified by another user`, 'LIST_VERSION_CONFLICT');
    this.name = 'ListVersionConflictError';
  }
}
