import { NextResponse } from "next/server";
import { AppError, toApiErrorBody, type ApiErrorBody } from "./errors";

export type ApiOk<T> = { ok: true; data: T };

export function jsonOk<T>(data: T, init?: ResponseInit) {
  const body: ApiOk<T> = { ok: true, data };
  return NextResponse.json(body, init);
}

export function jsonError(err: unknown, init?: ResponseInit) {
  const status =
    err instanceof AppError ? err.status : (init?.status ?? 500);

  const body: ApiErrorBody = toApiErrorBody(err);
  return NextResponse.json(body, { ...init, status });
}
