# Uploading the reaction GIFs

Sixteen files, one bucket, about ten minutes.

## Why these sixteen and not the eighty

The source list has eighty. Three reasons this ships with sixteen:

1. **Every file is downloaded by sixty phones on shared college wifi.** At an
   average 1.5MB, eighty GIFs is 120MB per device. Sixteen is around 25MB, and
   only the ones that fire are ever fetched.
2. **Rarity is the whole joke.** A reaction that appears every thirty seconds
   is wallpaper by the third vault. `reactions.tsx` enforces a 12-second floor
   between any two, so most players see four or five in a full run — which is
   the difference between a laugh and a nuisance.
3. **The source PDF has no URLs.** Every entry reads "— Link" with nothing
   behind it, so all eighty would need sourcing by hand regardless.

Adding more later is an `insert` into `memes` plus a file. Nothing in the code
caps the count.

## The list

Find each on Tenor or Giphy, download, and name it exactly as below. The paths
match the `storage_path` column seeded in `0004_seed.sql`.

### `speed/`
| File | What to search for | Fires on |
|---|---|---|
| `siu.gif` | Ronaldo SIUUU celebration | solved in under 8s |
| `mcqueen.gif` | Lightning McQueen "I am speed" | solved in under 8s |
| `flash.gif` | The Flash running | solved in under 8s |
| `spongebob.gif` | SpongeBob "3 hours later" card | took over a minute |
| `mrbean.gif` | Mr Bean checking his watch | took over a minute |
| `ralph.gif` | Ralph Wiggum "I'm in danger" | clock ran out |

### `win/`
| File | What to search for | Fires on |
|---|---|---|
| `yachty.gif` | Lil Yachty putting the laptop down | 3 in a row |
| `gatsby.gif` | DiCaprio Great Gatsby cheers | 5 in a row |
| `galaxy.gif` | Galaxy brain expanding | bonus vault won |
| `captain.gif` | "Look at me, I'm the captain now" | took the lead |
| `thanos.gif` | Thanos "I finally rest" | all nine vaults |

### `fail/`
| File | What to search for | Fires on |
|---|---|---|
| `blud.gif` | "Who invited my man blud" | 3 misses in a row |
| `thisisfine.gif` | "This is fine" dog in fire | 3 misses in a row |
| `kevinhart.gif` | Kevin Hart "ain't no way" stare | a single miss |
| `egregious.gif` | Stephen A. Smith "egregious" | dropped rank |

### `social/`
| File | What to search for | Fires on |
|---|---|---|
| `drakeclap.gif` | Drake clapping | first stranger met |
| `cinema.gif` | Scorsese "absolute cinema" | photo submitted |

## Uploading

**Dashboard → Storage → `memes`.** Create the four folders and drag the files
in. The bucket is public-read and has no client write policy, so this is the
only way in — which is the point: a player who could write here could put
anything on the projector.

## Checking it worked

```sql
select id, trigger, storage_path from public.memes order by trigger;
```

Then play a vault fast. If nothing appears, open the browser console — a 404 on
a `memes` URL means the filename does not match the `storage_path` column.

## Swapping one out

No redeploy needed. Upload the new file and point the row at it:

```sql
update public.memes set storage_path = 'win/newthing.gif' where id = 'yachty';
```

Or retire it entirely: `update public.memes set active = false where id = '…';`

## A note on rights

These are memes on a projector at a college society induction — an internal,
non-commercial, one-off event. That is the context this was built for. Anything
public-facing or commercial is a different question and not one this file
answers.
