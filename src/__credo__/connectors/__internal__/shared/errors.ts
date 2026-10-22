export class CallApiError extends Error {
  readonly status: number;
  readonly payload: unknown;
  constructor(status: number, payload: unknown) {
    super(`HTTP error! status: ${status}`);
    this.name = 'CallApiError';
    this.status = status;
    this.payload = payload;
  }
}
