import type { AnyRole } from "./database"

export interface RouteAccessMap {
  [routePrefix: string]: AnyRole[]
}

export interface MiddlewareRoleContext {
  role: AnyRole
  pathname: string
}
