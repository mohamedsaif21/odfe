/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Employee, EmployeeRole } from "@/types/database"

export type EmployeeWithProfile = Employee & {
  profiles: {
    full_name: string
    email: string
    avatar_url: string | null
  } | null
}

export type EmployeeInsert = {
  profile_id: string
  role: EmployeeRole
  pin: string | null
}

export async function fetchEmployees(): Promise<EmployeeWithProfile[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("employees")
    .select("*, profiles(full_name, email, avatar_url)")
    .eq("cafe_id", cafeId)
    .order("created_at")
  if (error) throw new Error(error.message)
  return data as EmployeeWithProfile[]
}

export async function createEmployee(input: EmployeeInsert): Promise<Employee> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("employees")
    .insert([{ ...input, cafe_id: cafeId }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Employee
}

export async function updateEmployee(id: string, input: { role?: EmployeeRole; pin?: string | null }): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("employees")
    .update(input)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteEmployee(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("employees")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}