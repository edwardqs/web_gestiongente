
import { supabase } from '../lib/supabase'

export async function getPolicies() {
  const { data, error } = await supabase
    .from('mobile_access_policies')
    .select('*')
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export async function createPolicy(policy) {
  const { data, error } = await supabase
    .from('mobile_access_policies')
    .insert([policy])
    .select()
    .single()
    
  return { data, error }
}

export async function deletePolicy(id) {
  const { error } = await supabase
    .from('mobile_access_policies')
    .delete()
    .eq('id', id)
    
  return { error }
}
