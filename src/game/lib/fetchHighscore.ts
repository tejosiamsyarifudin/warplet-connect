import { supabase } from "./supabaseClient";

export async function fetchHighscore(wallet: string) {
  if (!wallet) return 0;

  const { data, error } = await supabase
    .from("leaderboard_top")
    .select("score")
    .eq("wallet_address", wallet.toLowerCase())
    .order("score", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Highscore fetch error:", error);
    return 0;
  }

  if (!data || data.length === 0) return 0;

  return data[0].score;
}
