export type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(opts: { status?: number; code: string; message: string; details?: unknown }) {
    super(opts.message);
    this.name = "AppError";
    this.status = opts.status ?? 400;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export function toApiErrorBody(err: unknown): ApiErrorBody {
  if (err instanceof AppError) {
    return {
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
  }

  return {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error.",
    },
  };
}
