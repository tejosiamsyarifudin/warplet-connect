import { supabase } from './supabaseClient'

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('wallet_address, score')
    .order('score', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Leaderboard fetch error:', error)
    return []
  }

  return data || []
}
