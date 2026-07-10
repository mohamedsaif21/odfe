import { NextResponse } from "next/server"

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
}

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data, error: null }, { status })
}

export function errorResponse(message: string, status = 400, details?: Record<string, unknown>): NextResponse<ApiError> {
  const body: ApiError & { details?: Record<string, unknown> } = { data: null, error: message }
  if (details) body.details = details
  return NextResponse.json(body, { status })
}
