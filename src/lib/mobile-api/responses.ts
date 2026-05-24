import { NextResponse } from "next/server";

export function mobileOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function mobileError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
