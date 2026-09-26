-- Ensure prototype/demo products cannot survive a fresh migration replay.
-- Real catalog entries must be added from verified production sources only.

delete from public.products
where sku = any (array[
  -- Historical demo seed SKUs
  'PSN-50',
  'ITN-100',
  'STM-25',
  'NF-1M',
  'SPT-1M',
  'VAL-1000',
  'PUBG-300',
  'FF-1080',
  'OFFR-WEEK',

  -- Later placeholder catalog SKUs
  'SW-ANGHAMI_3M',
  'SW-BUNDLE_CARDS',
  'SW-BUNDLE_GAMER',
  'SW-BUNDLE_STREAM',
  'SW-FIFA_POINTS',
  'SW-FORTNITE_1000',
  'SW-GAMEPASS_1M',
  'SW-GOOGLE_100',
  'SW-ITUNES_50',
  'SW-LOL_1380',
  'SW-NETFLIX_1M',
  'SW-PSN_100',
  'SW-PUBG_660',
  'SW-ROBLOX_800',
  'SW-SHAHID_1M',
  'SW-SPOTIFY_3M',
  'SW-STEAM_20',
  'SW-VALORANT_2050',
  'SW-XBOX_50'
]::text[]);
