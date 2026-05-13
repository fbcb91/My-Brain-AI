import { supabase } from './supabase';

export interface Heir {
  id: string;
  name: string;
  email: string | null;
  relationship: string | null;
  createdAt: number;
}

interface HeirRow {
  id: string;
  name: string;
  email: string | null;
  relationship: string | null;
  created_at: string;
}

function rowToHeir(row: HeirRow): Heir {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    relationship: row.relationship,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function listHeirs(): Promise<Heir[]> {
  const { data, error } = await supabase
    .from('heirs')
    .select('id, name, email, relationship, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as HeirRow[]).map(rowToHeir);
}

export interface HeirInput {
  name: string;
  email?: string | null;
  relationship?: string | null;
}

export async function createHeir(input: HeirInput): Promise<Heir> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const id = newId();
  const row = {
    id,
    user_id: user.id,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    relationship: input.relationship?.trim() || null,
  };
  const { data, error } = await supabase
    .from('heirs')
    .insert(row)
    .select('id, name, email, relationship, created_at')
    .single();
  if (error) throw error;
  return rowToHeir(data as HeirRow);
}

export async function updateHeir(id: string, input: HeirInput): Promise<Heir> {
  const { data, error } = await supabase
    .from('heirs')
    .update({
      name: input.name.trim(),
      email: input.email?.trim() || null,
      relationship: input.relationship?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, email, relationship, created_at')
    .single();
  if (error) throw error;
  return rowToHeir(data as HeirRow);
}

export async function deleteHeir(id: string): Promise<void> {
  const { error } = await supabase.from('heirs').delete().eq('id', id);
  if (error) throw error;
}

export async function countHeirs(): Promise<number> {
  const { count, error } = await supabase
    .from('heirs')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}
