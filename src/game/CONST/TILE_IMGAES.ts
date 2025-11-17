const LOCAL_IMAGES = [
  "warplet1.png",
  "warplet2.png",
  "warplet3.png",
  "warplet4.png",
  "warplet5.png",
  "warplet6.png",
  "warplet7.png",
  "warplet8.png",
  "warplet9.png",
  "warplet10.png",
  "warplet11.png",
  "warplet12.png",
  "warplet13.png",
  "warplet14.png",
  "warplet15.png",
  "warplet16.png",
  "warplet17.png",
  "warplet18.png",
  "warplet19.png",
  "warplet20.png",
  "warplet21.png",
];

function randomSupabaseUrl() {
  const id = Math.floor(Math.random() * 848) + 1;
  return `https://nawovbapysnhlgsitylr.supabase.co/storage/v1/object/public/assets/image-${id}.jpeg`;
}

async function checkSupabase() {
  try {
    const test = randomSupabaseUrl();
    const res = await fetch(test, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch (e) {
    return false;
  }
}

const supabaseAlive = await checkSupabase();

export const TILE_IMAGES = supabaseAlive
  ? Array.from({ length: 21 }, () => randomSupabaseUrl())
  : LOCAL_IMAGES.map((x) => `/assets/${x}`);
