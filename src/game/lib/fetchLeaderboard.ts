import { supabase } from './supabaseClient'

export async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('leaderboard_top')
      .select('wallet_address, score')
      .limit(20)
  
    if (error) {
      console.error('Leaderboard fetch error:', error)
      return []
    }
  
    return data || []
  }
  