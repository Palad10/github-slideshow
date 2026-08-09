# ReelForge — auto-edit job footage into FB/IG reels, then post it

Feed it a folder of raw phone clips from a job. It picks up to 6 clips, trims each
to its middle few seconds, stacks them into a vertical **1080x1920** reel with
crossfades, burns in a **hook title**, a **call-to-action**, and the **RU·BRIC
watermark**, lays music (and an optional **voiceover**) underneath, and writes a
ready-to-paste **caption**. Then one more command **publishes it to Instagram
Reels and your Facebook Page** through Meta's official API. Add `--ad` and it
drafts complete **ad copy** too.

Editing runs locally on ffmpeg — no editing-service subscriptions. One command
per reel, one command to post.

## One-time setup (Mac)

```bash
brew install ffmpeg        # the only dependency; Python is already on your Mac
```

Then copy the config and make it yours:

```bash
cd reel-editor
cp config.example.json reel_config.json
```

Edit `reel_config.json` — at minimum set `phone_display`, and point `logo_path`
at a PNG of the logo if you want it instead of the text watermark. Publishing
needs the Meta IDs too — see [Connecting Facebook & Instagram](#connecting-facebook--instagram).

## The Saturday routine

1. Download the week's clips from Drive `RUBRIC Marketing / 01 Footage` into a
   folder, e.g. `~/Downloads/footage`.
2. Preview: `python3 reelforge.py scan ~/Downloads/footage`
3. Build:

   ```bash
   python3 reelforge.py make ~/Downloads/footage --music assets/track1.mp3 --voiceover
   ```

   Output lands in `./reels/`: the `.mp4` plus `.caption.txt` (post copy +
   hashtags). Add `--ad` to also get `.ad.txt`.
4. **Watch it.** (This is the Sunday-approval step — nothing posts by itself.)
5. Post to both platforms:

   ```bash
   python3 reelforge.py publish reels/reel_20260809_waterheater_plano.mp4
   ```

### `make` options

| Option | What it does |
|---|---|
| `--voiceover` | Adds a spoken voiceover; script auto-written, music ducks under the voice |
| `--vo-text "..."` | Speak this exact script instead |
| `--ad` | Also writes Meta ad copy + a boost checklist next to the reel |
| `--title "Slab leak found + fixed"` | Override the hook text |
| `--music path/to/track.mp3` | Music bed; loops and fades out automatically |
| `--job slableak` | Only use clips whose filename starts with this |
| `--clips a.mov b.mov c.mov` | Pick exact clips, in exactly this order |
| `--target-seconds 30` | Aim for a different total length (default 27s) |
| `--out ~/Desktop/reels` | Output folder |

### `publish` options

| Option | What it does |
|---|---|
| `--to ig` / `--to fb` / `--to ig fb` | Choose platforms (default: whatever is configured) |
| `--caption "..."` / `--caption-file f.txt` | Override the caption (default: sibling `.caption.txt`) |

## Hooks, CTAs and captions

Without any API key, copy comes from the built-in brand-voice library (edit
`hooks_by_job` in the config). If `ANTHROPIC_API_KEY` is set, Claude writes the
best-performing hook, CTA overlay, caption, voiceover script, and ad copy for
each reel, tuned to the job type and city from the filename:

```bash
export ANTHROPIC_API_KEY=sk-ant-...     # put in ~/.zshrc to make it permanent
```

## Voiceover

`--voiceover` uses the Mac's built-in text-to-speech (`say`) — free and local.
Pick a voice with `say -v '?'` and set `"vo_voice"` in the config; the higher-
quality voices are downloadable under **System Settings → Accessibility →
Spoken Content → System Voice → Manage Voices** (get a "Premium" or "Enhanced"
US English voice — big difference). The music bed automatically ducks while the
voice is speaking.

## Clip naming convention (give this to the crew)

```
jobtype_city_number.mp4      e.g.  waterheater_plano_01.mov
                                   slableak_irving_02.mov
```

The first clip's filename picks the hook line and the city for captions,
hashtags, voiceover, and ad copy. Known job types: `waterheater`, `tankless`,
`slableak`, `repipe`, `drain`, `sewer`, `faucet`, `toilet`, `gasline`, `leak` —
add more in `hooks_by_job`. Number clips in the order they should appear.

## Connecting Facebook & Instagram

One-time, ~20 minutes. You need: the RU·BRIC Facebook **Page**, and the
Instagram account switched to a **Business/Creator** account and linked to that
Page (Instagram app → Settings → Business tools → Connect a Facebook Page).

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps
   → Create App**. Name it e.g. "RUBRIC ReelForge". On the **Use cases** screen
   check both **Manage messaging & content on Instagram** and **Manage
   everything on your Page**, connect (or skip) a business portfolio, and create
   the app. If the Instagram use case asks about login, choose **Facebook Login
   for Business**, not "Instagram login". (Older accounts may see an app *type*
   picker instead — choose **Business** there.)
2. In the app dashboard, open **Tools → Graph API Explorer**:
   - In "Permissions" add: `pages_show_list`, `pages_manage_posts`,
     `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`.
   - Click **Generate Access Token** and log in as the account that owns the Page.
3. Get your IDs (paste each into the Explorer's query box and hit submit):
   - `me/accounts` → find the Page → copy its `id` → config `meta_page_id`,
     and copy that Page entry's `access_token` (this is a **Page token** — it's
     the one the tool needs).
   - `{page-id}?fields=instagram_business_account` → copy the nested `id` →
     config `meta_ig_user_id`.
4. Make the token long-lived: **Tools → Access Token Debugger** → paste the
   Page token → **Extend Access Token**. Page tokens extended this way don't
   expire in normal use.
5. Put the extended token in your shell (preferred over the config file):

   ```bash
   export META_ACCESS_TOKEN=EAAB...      # add to ~/.zshrc
   ```

Notes:
- While the Meta app is in **Development mode** it can only post via accounts
  with a role on the app — that's you, and that's all this needs. No app review.
- The token is a key to your Page. Keep it out of Drive/screenshots;
  `reel_config.json` is gitignored for this reason.
- If publishing suddenly fails with an OAuth error, the token expired or a
  password change revoked it — redo steps 2–5 (2 minutes).

## Running it as an ad

`--ad` writes a `.ad.txt` next to the reel: primary text, headline, description,
CTA button, destination link, plus a 5-step boost checklist (audience by service
cities, $5–10/day starter budget, kill/scale rule). Publish the reel first, then
**Boost** it from the Page — that's deliberate: ad *spend* stays a human
decision; the tool never touches the ad account or a payment method.

## Music and copyright — read once

Music baked into the file must be **royalty-free** (Pixabay Music, YouTube Audio
Library, etc.) or IG/FB may mute or limit the reel. If you want a *trending*
sound for reach: build without `--music`, publish, and add the trending audio
inside the Instagram app. With a voiceover, royalty-free music baked in is the
right call — trending audio would fight the voice anyway.

## Config reference (`reel_config.json`)

Bracketed fields are the ones to swap when onboarding a new client:

| Field | Meaning |
|---|---|
| `brand_name` | [CLIENT BRAND NAME] — watermark text |
| `cta_text` | [CLIENT CTA] — closing overlay line |
| `phone_display` | [CLIENT PHONE] — shown under the CTA if set |
| `website` | [CLIENT WEBSITE] — ad copy destination |
| `logo_path` | [CLIENT LOGO PNG] — replaces the text watermark |
| `music_path` | Default music bed (CLI `--music` overrides) |
| `caption_hashtags` | [CLIENT HASHTAGS] — base hashtag line |
| `caption_city_default` | [CLIENT DEFAULT CITY] — when the filename has no city |
| `hooks_by_job` | [CLIENT HOOK LIBRARY] — jobtype → hook text |
| `meta_page_id` / `meta_ig_user_id` | [CLIENT META IDS] — publish targets |
| `meta_access_token` | Meta Page token (env `META_ACCESS_TOKEN` preferred) |
| `vo_voice` / `vo_rate_wpm` / `vo_volume` | Voiceover voice, speed, loudness |
| `target_seconds` / `max_clips` | Reel length target (27s) / clip cap (6) |
| `min_take_seconds` / `max_take_seconds` | Per-clip trim bounds (2.5–6s) |
| `natural_audio_volume` | 0 = music replaces jobsite noise; 0.2 = mix some in |
| `claude_model` | Model used for copywriting |
| `font_file` | Path to a .ttf — auto-detected if empty |

## Troubleshooting

- **"ffmpeg not found"** → `brew install ffmpeg`, then reopen Terminal.
- **"no usable font found"** → set `"font_file"` in the config, e.g.
  `"/System/Library/Fonts/Supplemental/Arial Bold.ttf"`.
- **"no Meta access token"** → do the [connection setup](#connecting-facebook--instagram).
- **IG rejects the video (status ERROR)** → reels must be ≤90s, 9:16; anything
  this tool builds qualifies, so re-run `make` and try again.
- **Voiceover sounds robotic** → download a Premium/Enhanced macOS voice (see
  [Voiceover](#voiceover)) and set `"vo_voice"` to it.
- **Sideways/landscape clips** → handled automatically (scale + center-crop),
  but tell the crew to shoot vertical — cropping throws away the sides.
