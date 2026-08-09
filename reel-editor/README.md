# ReelForge — auto-edit job footage into FB/IG reels

Feed it a folder of raw phone clips from a job. It picks up to 6 clips, trims each
to its middle few seconds, stacks them into a vertical **1080x1920** reel with
crossfades, burns in a **hook title**, a **call-to-action**, and the **RU·BRIC
watermark**, lays music underneath, and writes a ready-to-paste **caption file**.

Everything runs locally on ffmpeg — no subscriptions, no upload to a third-party
editor. One command per reel.

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
at a PNG of the logo if you want it instead of the text watermark.

## Making a reel (the Saturday routine)

1. Download the week's clips from Drive `RUBRIC Marketing / 01 Footage` into a
   folder, e.g. `~/Downloads/footage`.
2. Preview what it found:

   ```bash
   python3 reelforge.py scan ~/Downloads/footage
   ```

3. Build:

   ```bash
   python3 reelforge.py make ~/Downloads/footage --music assets/track1.mp3
   ```

   Output lands in `./reels/`: the `.mp4` plus a `.caption.txt` with the post
   copy and hashtags.
4. Upload the `.mp4` to `02 Drafts` in Drive (or straight to IG/FB), paste the
   caption, done.

### Useful options

| Option | What it does |
|---|---|
| `--title "Slab leak found + fixed"` | Override the hook text (otherwise auto-picked from the filename) |
| `--music path/to/track.mp3` | Music bed; loops and fades out automatically |
| `--job slableak` | Only use clips whose filename starts with this |
| `--clips a.mov b.mov c.mov` | Pick exact clips, in exactly this order |
| `--target-seconds 30` | Aim for a different total length (default 27s) |
| `--out ~/Desktop/reels` | Output folder |
| `--no-captions` | Skip the caption file |

## Clip naming convention (give this to the crew)

```
jobtype_city_number.mp4      e.g.  waterheater_plano_01.mov
                                   slableak_irving_02.mov
```

The tool reads the first clip's filename to pick the hook line and the city for
the caption/hashtags. Known job types: `waterheater`, `tankless`, `slableak`,
`repipe`, `drain`, `sewer`, `faucet`, `toilet`, `gasline`, `leak` — add more in
`hooks_by_job` in the config. Number the clips in the order you want them to
appear; the tool keeps filename order.

## Music and copyright — read once

Music baked into the file must be **royalty-free** (Pixabay Music, YouTube Audio
Library, etc.) or IG/FB may mute or limit the reel. If you want a *trending*
sound for reach: build the reel **without** `--music` (or with
`"music_volume": 0.3` so it sits low), upload, and add the trending audio inside
the Instagram app — that's the only way trending audio counts.

## AI captions (optional)

Out of the box, captions come from a built-in brand-voice template — no account
needed. If `ANTHROPIC_API_KEY` is set in your environment, captions are written
by Claude instead, tuned to the job type and city:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Config reference (`reel_config.json`)

Bracketed fields are the ones to swap when onboarding a new client:

| Field | Meaning |
|---|---|
| `brand_name` | [CLIENT BRAND NAME] — watermark text |
| `cta_text` | [CLIENT CTA] — closing overlay line |
| `phone_display` | [CLIENT PHONE] — shown under the CTA if set |
| `logo_path` | [CLIENT LOGO PNG] — replaces the text watermark |
| `music_path` | Default music bed (CLI `--music` overrides) |
| `caption_hashtags` | [CLIENT HASHTAGS] — base hashtag line |
| `caption_city_default` | [CLIENT DEFAULT CITY] — used when the filename has no city |
| `hooks_by_job` | [CLIENT HOOK LIBRARY] — jobtype → hook text |
| `target_seconds` / `max_clips` | Reel length target (27s) / clip cap (6) |
| `min_take_seconds` / `max_take_seconds` | Per-clip trim bounds (2.5–6s) |
| `natural_audio_volume` | 0 = music replaces jobsite noise; 0.2 = mix some in |
| `hook_seconds` / `cta_seconds` | How long the overlays stay up |
| `font_file` | Path to a .ttf — auto-detected if empty |

## Troubleshooting

- **"ffmpeg not found"** → `brew install ffmpeg`, then reopen Terminal.
- **"no usable font found"** → set `"font_file"` in the config, e.g.
  `"/System/Library/Fonts/Supplemental/Arial Bold.ttf"`.
- **Sideways/landscape clips** → handled automatically: every clip is scaled to
  fill the vertical frame and center-cropped. Tell the crew to shoot vertical
  anyway — center-crop throws away the sides of landscape shots.
- **Reel too long/short** → adjust `--target-seconds`, or feed fewer/more clips.
