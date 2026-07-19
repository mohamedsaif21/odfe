import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Employee } from "@/types/database"
import type { EmployeeRole } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"
import type { Profile } from "@/types/database"

export type EmployeeWithProfile = Employee & {
  profiles: Pick<Profile, "full_name" | "email" | "avatar_url" | "is_active"> | null
}

export async function fetchEmployees(client?: DbClient): Promise<EmployeeWithProfile[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("employees")
    .select("*, profiles!inner(full_name, email, avatar_url, is_active)")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })
    .returns<EmployeeWithProfile[]>()

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createEmployee(
  input: { profile_id: string; role: EmployeeRole; pin?: string },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"employees"> = {
    cafe_id: cafeId,
    profile_id: input.profile_id,
    role: input.role,
    pin: input.pin ?? null,
  }

  const { data, error } = await supabase
    .from("employees")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateEmployeeRole(id: string, role: EmployeeRole, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"employees"> = { role }

  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deactivateEmployee(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data: emp } = await supabase
    .from("employees")
    .select("profile_id")
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .single()

  if (!emp) throw new Error("Employee not found")

  const updates: UpdateTables<"profiles"> = { is_active: false }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", emp.profile_id)

  if (error) throw new Error(error.message)
}

export async function activateEmployee(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data: emp } = await supabase
    .from("employees")
    .select("profile_id")
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .single()

  if (!emp) throw new Error("Employee not found")

  const updates: UpdateTables<"profiles"> = { is_active: true }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", emp.profile_id)

  if (error) throw new Error(error.message)
}

export async function verifyPin(employeeId: string, pin: string, client?: DbClient): Promise<boolean> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase
    .from("employees")
    .select("pin")
    .eq("id", employeeId)
    .single()

  if (error || !data) return false
  return data.pin === pin
}
