#!/usr/bin/env python3
"""
ReelForge — auto-edit raw jobsite footage into 9:16 reels for Facebook & Instagram.

Feed it a folder of phone clips from a job; it trims each clip, stacks them into a
vertical 1080x1920 reel with crossfades, burns in a hook title, a call-to-action,
and a brand watermark, lays music (and optional voiceover) under it, and writes a
ready-to-paste caption. It can then publish the finished reel straight to
Instagram Reels and your Facebook Page via Meta's Graph API, and draft ad copy.

Editing runs 100% locally on ffmpeg. Claude-written copy and Meta publishing are
optional and only used when their keys/IDs are configured.

Usage:
  python3 reelforge.py scan    FOOTAGE_DIR
  python3 reelforge.py make    FOOTAGE_DIR [--voiceover] [--ad] [options]
  python3 reelforge.py publish REEL.mp4 [--to ig fb]

Examples:
  python3 reelforge.py make ~/Downloads/footage --music assets/track1.mp3 --voiceover --ad
  python3 reelforge.py publish reels/reel_20260809_waterheater_plano.mp4

Requires: Python 3.9+, ffmpeg + ffprobe on PATH (Mac: `brew install ffmpeg`).
Config:  reel_config.json next to this script (see config.example.json).
"""

import argparse
import datetime
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm", ".mts", ".3gp"}
GRAPH = "https://graph.facebook.com/v21.0"

# ---------------------------------------------------------------------------
# Defaults — every field can be overridden in reel_config.json.
# Bracketed values are the productizable knobs: swap per client.
# ---------------------------------------------------------------------------
DEFAULTS = {
    "brand_name": "RU\u00b7BRIC PLUMBING",          # [CLIENT BRAND NAME]
    "cta_text": "Call or DM us \u2014 done right the first time.",  # [CLIENT CTA]
    "phone_display": "",                             # [CLIENT PHONE] shown under CTA if set
    "website": "rubricplumbing.com",                 # [CLIENT WEBSITE] used in ad copy
    "logo_path": "",                                 # [CLIENT LOGO PNG] optional, overrides text watermark
    "target_seconds": 27,       # total reel length to aim for (IG sweet spot 20-30s)
    "max_clips": 6,             # cap on clips per reel
    "min_take_seconds": 2.5,    # never cut a clip shorter than this
    "max_take_seconds": 6.0,    # never use more than this from one clip
    "skip_head_seconds": 0.4,   # skip the shaky first moments of each clip
    "fade_seconds": 0.35,       # crossfade length between clips
    "hook_seconds": 3.2,        # how long the opening title stays up
    "cta_seconds": 3.5,         # how long the closing CTA stays up
    "music_volume": 0.9,
    "natural_audio_volume": 0.0,  # 0 = music replaces jobsite noise; 0.2 = mix a little in
    "vo_voice": "Samantha",     # macOS `say` voice; run `say -v ?` to list
    "vo_volume": 1.0,
    "vo_rate_wpm": 175,
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "crf": 20,
    "font_file": "",            # auto-detected if empty
    "hook_fontsize": 62,
    "cta_fontsize": 54,
    "watermark_fontsize": 34,
    "caption_hashtags": "#plumber #plumbing #dfw #planotx #irvingtx #homerepair",  # [CLIENT HASHTAGS]
    "caption_city_default": "DFW",                   # [CLIENT DEFAULT CITY]
    "claude_model": "claude-sonnet-5",
    # Meta publishing — fill these to enable `publish` (see README):
    "meta_ig_user_id": "",      # [CLIENT IG BUSINESS USER ID]
    "meta_page_id": "",         # [CLIENT FB PAGE ID]
    "meta_access_token": "",    # or set env META_ACCESS_TOKEN (preferred)
    # Filename convention: jobtype_city_number.mp4  e.g. waterheater_plano_01.mov
    "hooks_by_job": {                                # [CLIENT HOOK LIBRARY]
        "waterheater": "Water heater swap \u2014 done right",
        "tankless": "Tankless upgrade day",
        "slableak": "Slab leak: found it, fixed it",
        "repipe": "Whole-home repipe, start to finish",
        "drain": "Drain cleared \u2014 watch this",
        "sewer": "Sewer line rescue",
        "faucet": "Faucet swap in minutes",
        "toilet": "Toilet install, clean and level",
        "gasline": "Gas line done to code",
        "leak": "Hidden leak, gone",
    },
}

FONT_CANDIDATES = [
    # macOS
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Verdana Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial Bold.ttf",
    # Linux
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    # Windows
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
]


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def run(cmd, quiet=True):
    """Run a command, dying with the tool's stderr tail on failure."""
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        tail = "\n".join(res.stderr.strip().splitlines()[-12:])
        die(f"command failed:\n  {' '.join(shlex.quote(c) for c in cmd)}\n{tail}")
    return res


def check_tools():
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            die(f"'{tool}' not found. On a Mac, install it with:  brew install ffmpeg")


def load_config(path=None):
    cfg = dict(DEFAULTS)
    candidates = [path] if path else [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "reel_config.json"),
        "reel_config.json",
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    user = json.load(f)
            except json.JSONDecodeError as e:
                die(f"could not parse config {p}: {e}")
            cfg.update(user)
            cfg["_config_path"] = p
            break
    return cfg


def find_font(cfg):
    if cfg.get("font_file"):
        if os.path.isfile(cfg["font_file"]):
            return cfg["font_file"]
        die(f"font_file in config not found: {cfg['font_file']}")
    for p in FONT_CANDIDATES:
        if os.path.isfile(p):
            return p
    die("no usable font found — set \"font_file\" in reel_config.json to a .ttf path")


def probe(path):
    res = run([
        "ffprobe", "-v", "error", "-print_format", "json",
        "-show_streams", "-show_format", path,
    ])
    info = json.loads(res.stdout)
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), None)
    if v is None:
        return None
    duration = float(info.get("format", {}).get("duration") or v.get("duration") or 0)
    return {
        "path": path,
        "duration": duration,
        "width": int(v.get("width", 0)),
        "height": int(v.get("height", 0)),
        "has_audio": a is not None,
    }


def list_footage(folder, job_filter=None):
    if not os.path.isdir(folder):
        die(f"footage folder not found: {folder}")
    names = sorted(os.listdir(folder))
    clips = []
    for name in names:
        ext = os.path.splitext(name)[1].lower()
        if ext not in VIDEO_EXTS:
            continue
        if job_filter and not name.lower().startswith(job_filter.lower()):
            continue
        meta = probe(os.path.join(folder, name))
        if meta and meta["duration"] >= 1.0:
            clips.append(meta)
    return clips


def parse_filename_meta(path):
    """waterheater_plano_01.mov -> job='waterheater', city='plano'."""
    stem = os.path.splitext(os.path.basename(path))[0].lower()
    tokens = [t for t in re.split(r"[_\-\s]+", stem) if t and not t.isdigit()]
    job = tokens[0] if tokens else ""
    city = tokens[1] if len(tokens) > 1 else ""
    return job, city


def plan_takes(clips, cfg):
    """Decide how many seconds to use from each clip."""
    n = len(clips)
    fade = cfg["fade_seconds"]
    ideal = (cfg["target_seconds"] + (n - 1) * fade) / n
    take = max(cfg["min_take_seconds"], min(cfg["max_take_seconds"], ideal))
    takes = []
    for c in clips:
        usable = max(0.0, c["duration"] - cfg["skip_head_seconds"] - 0.1)
        takes.append(round(min(take, max(1.0, usable)), 2))
    return takes


def normalize_clip(clip, take, dst, cfg):
    """Trim to the middle `take` seconds and re-encode to uniform 9:16 video."""
    w, h, fps = cfg["width"], cfg["height"], cfg["fps"]
    usable_start = cfg["skip_head_seconds"]
    # take the middle of the clip — the action usually isn't at the very start
    start = max(usable_start, (clip["duration"] - take) / 2.0)
    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},setsar=1,fps={fps},format=yuv420p"
    )
    cmd = ["ffmpeg", "-y", "-ss", f"{start:.3f}", "-i", clip["path"]]
    if not clip["has_audio"]:
        cmd += ["-f", "lavfi", "-t", f"{take:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        maps = ["-map", "0:v:0", "-map", "1:a:0"]
    else:
        maps = ["-map", "0:v:0", "-map", "0:a:0"]
    cmd += [
        "-t", f"{take:.3f}", *maps, "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k",
        dst,
    ]
    run(cmd)


def wrap_text(text, max_chars=20):
    words = text.split()
    lines, cur = [], ""
    for word in words:
        if cur and len(cur) + 1 + len(word) > max_chars:
            lines.append(cur)
            cur = word
        else:
            cur = f"{cur} {word}".strip()
    if cur:
        lines.append(cur)
    return "\n".join(lines)


def ff_path(p):
    """Escape a path for use inside a filtergraph option value."""
    return p.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def drawtext(textfile, font, fontsize, y, enable=None, alpha=None, boxalpha=0.45):
    opts = [
        f"textfile='{ff_path(textfile)}'",
        f"fontfile='{ff_path(font)}'",
        f"fontsize={fontsize}",
        "fontcolor=white",
        "x=(w-text_w)/2",
        f"y={y}",
        "box=1",
        f"boxcolor=black@{boxalpha}",
        "boxborderw=18",
        "line_spacing=10",
        "text_align=center",
    ]
    if alpha is not None:
        opts.append(f"alpha={alpha}")
    if enable:
        opts.append(f"enable='{enable}'")
    return "drawtext=" + ":".join(opts)


# ---------------------------------------------------------------------------
# Voiceover
# ---------------------------------------------------------------------------

def synth_voiceover(text, dst_wav, cfg, tmpdir):
    """Text-to-speech: macOS `say` (best) or espeak-ng (fallback), then 48k stereo."""
    raw = os.path.join(tmpdir, "vo_raw")
    if shutil.which("say"):
        raw += ".aiff"
        run(["say", "-v", cfg["vo_voice"], "-r", str(cfg["vo_rate_wpm"]),
             "-o", raw, text])
    elif shutil.which("espeak-ng"):
        raw += ".wav"
        run(["espeak-ng", "-v", "en-us", "-s", str(cfg["vo_rate_wpm"]),
             "-w", raw, text])
    else:
        die("no text-to-speech engine found — need macOS `say` or `espeak-ng`")
    run(["ffmpeg", "-y", "-i", raw, "-ar", "48000", "-ac", "2", dst_wav])
    meta = probe(dst_wav) or {"duration": 0}
    return meta["duration"]


# ---------------------------------------------------------------------------
# Reel assembly
# ---------------------------------------------------------------------------

def build_reel(parts, takes, out_path, cfg, font, hook_text, cta_text,
               music_path, vo_path, tmpdir):
    n = len(parts)
    fade = cfg["fade_seconds"] if n > 1 else 0.0
    total = sum(takes) - (n - 1) * fade

    cmd = ["ffmpeg", "-y"]
    for p in parts:
        cmd += ["-i", p]
    next_idx = n
    music_idx = logo_idx = vo_idx = None
    if music_path:
        music_idx = next_idx
        cmd += ["-stream_loop", "-1", "-i", music_path]
        next_idx += 1
    if cfg.get("logo_path") and os.path.isfile(cfg["logo_path"]):
        logo_idx = next_idx
        cmd += ["-i", cfg["logo_path"]]
        next_idx += 1
    if vo_path:
        vo_idx = next_idx
        cmd += ["-i", vo_path]
        next_idx += 1

    fc = []

    # --- video: crossfade chain ---
    if n == 1:
        fc.append("[0:v]null[vx]")
    else:
        prev = "[0:v]"
        offset = 0.0
        for i in range(1, n):
            offset += takes[i - 1] - fade
            label = "[vx]" if i == n - 1 else f"[vx{i}]"
            fc.append(
                f"{prev}[{i}:v]xfade=transition=fade:duration={fade}:offset={offset:.3f}{label}"
            )
            prev = label

    # --- text overlays ---
    hook_file = os.path.join(tmpdir, "hook.txt")
    with open(hook_file, "w", encoding="utf-8") as f:
        f.write(wrap_text(hook_text, 20))
    cta_file = os.path.join(tmpdir, "cta.txt")
    cta = wrap_text(cta_text, 26)
    if cfg.get("phone_display"):
        cta += "\n" + cfg["phone_display"]
    with open(cta_file, "w", encoding="utf-8") as f:
        f.write(cta)
    brand_file = os.path.join(tmpdir, "brand.txt")
    with open(brand_file, "w", encoding="utf-8") as f:
        f.write(cfg["brand_name"])

    hook_end = min(cfg["hook_seconds"], total)
    cta_start = max(0.0, total - cfg["cta_seconds"])
    chain = [
        drawtext(hook_file, font, cfg["hook_fontsize"], 320,
                 enable=f"between(t,0,{hook_end:.2f})"),
        drawtext(cta_file, font, cfg["cta_fontsize"], 1330,
                 enable=f"gte(t,{cta_start:.2f})"),
    ]
    if logo_idx is None:
        chain.append(drawtext(brand_file, font, cfg["watermark_fontsize"], 70,
                              alpha=0.75, boxalpha=0.25))
    fc.append("[vx]" + ",".join(chain) + "[vtext]")

    if logo_idx is not None:
        fc.append(f"[{logo_idx}:v]scale=240:-1,format=rgba,colorchannelmixer=aa=0.85[logo]")
        fc.append("[vtext][logo]overlay=W-w-40:60[vout]")
        vlabel = "[vout]"
    else:
        vlabel = "[vtext]"

    # --- audio ---
    # Base bed = music if given, else the clips' natural audio. A voiceover is
    # laid on top with the bed ducked underneath it (sidechain compression).
    nat_vol = cfg["natural_audio_volume"]
    need_natural = (not music_path) or nat_vol > 0
    if need_natural:
        if n == 1:
            fc.append("[0:a]anull[anat]")
        else:
            prev = "[0:a]"
            for i in range(1, n):
                label = "[anat]" if i == n - 1 else f"[anat{i}]"
                fc.append(f"{prev}[{i}:a]acrossfade=d={fade}{label}")
                prev = label

    fade_out_start = max(0.0, total - 1.5)
    if music_path:
        fc.append(
            f"[{music_idx}:a]atrim=0:{total:.3f},volume={cfg['music_volume']},"
            f"afade=t=in:d=0.5,afade=t=out:st={fade_out_start:.3f}:d=1.5[abed]"
        )
        if nat_vol > 0:
            fc.append(f"[anat]volume={nat_vol}[anatq]")
            fc.append("[abed][anatq]amix=inputs=2:duration=first:normalize=0[abedm]")
            bed = "[abedm]"
        else:
            bed = "[abed]"
    else:
        fc.append(f"[anat]afade=t=out:st={fade_out_start:.3f}:d=1.5[abed]")
        bed = "[abed]"

    if vo_idx is not None:
        fc.append(
            f"[{vo_idx}:a]volume={cfg['vo_volume']},adelay=600|600,"
            f"asplit=2[vo_sc][vo_mix]"
        )
        fc.append("[vo_sc]apad[vo_scp]")
        fc.append(
            f"{bed}[vo_scp]sidechaincompress=threshold=0.03:ratio=10:"
            f"attack=40:release=500[abedd]"
        )
        fc.append("[abedd][vo_mix]amix=inputs=2:duration=first:normalize=0[aout]")
    else:
        fc.append(f"{bed}anull[aout]")

    cmd += [
        "-filter_complex", ";".join(fc),
        "-map", vlabel, "-map", "[aout]",
        "-t", f"{total:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", str(cfg["crf"]),
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart",
        out_path,
    ]
    run(cmd)
    return total


# ---------------------------------------------------------------------------
# Copywriting (hook / CTA / caption / voiceover script / ad copy)
# ---------------------------------------------------------------------------

def copy_templates(job, city, cfg):
    city_name = (city or cfg["caption_city_default"]).title()
    hook = cfg["hooks_by_job"].get(job) or "Watch this job, start to finish"
    caption = "\n".join([
        f"{hook} \U0001f527",
        "",
        f"Another one done right the first time in {city_name}.",
        "Licensed Texas Master Plumber \u2014 premium work, no shortcuts.",
        "",
        "\U0001f4f2 Call or DM to book.",
        "",
        cfg["caption_hashtags"] + (f" #{city.lower()}" if city else ""),
    ])
    vo = (f"{hook}. Watch how we handle it: clean, to code, and done right "
          f"the first time. {cfg['brand_name'].replace(chr(183), '')}, your licensed "
          f"master plumber in {city_name}. Call or message us to book.")
    return {
        "hook": hook,
        "cta": cfg["cta_text"],
        "caption": caption,
        "vo_script": vo,
        "ad_primary": (
            f"{hook}. Premium residential plumbing in {city_name} \u2014 licensed "
            "Texas Master Plumber, upfront pricing, spotless work, 5.0\u2605 on Google. "
            "Done right the first time, or we make it right."
        ),
        "ad_headline": f"Plumbing Done Right \u2014 {city_name}",
        "ad_description": "Book today — no surprises.",
        "ad_cta_button": "Get Quote",
    }


def copy_claude(job, city, cfg, want_ad, want_vo):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    city_name = (city or cfg["caption_city_default"]).title()
    fields = {
        "hook": "opening on-screen title, max 6 words, thumb-stopping, no clickbait",
        "cta": "closing on-screen line, max 8 words",
        "caption": "IG/FB caption: 3-5 short lines + CTA line + one line of 6-10 "
                   "hashtags including the city",
    }
    if want_vo:
        fields["vo_script"] = ("voiceover narration, 30-45 words, conversational, "
                               "ends with a call to action")
    if want_ad:
        fields["ad_primary"] = "Meta ad primary text, 2-3 sentences, no hashtags"
        fields["ad_headline"] = "Meta ad headline, max 40 characters"
        fields["ad_description"] = "Meta ad description, max 30 characters"
        fields["ad_cta_button"] = "one of: Get Quote, Call Now, Learn More, Book Now"
    spec = "\n".join(f'- "{k}": {v}' for k, v in fields.items())
    prompt = (
        f"You write social copy for {cfg['brand_name']}, a premium residential "
        "plumbing company (brand voice: craftsman, confident, 'done right the first "
        "time', never discount-y, max 2 emoji total, no hype words like INSANE). "
        f"The reel shows a {job or 'plumbing'} job in {city_name}, Texas. "
        "Write the single best version of each field \u2014 pick what would perform "
        f"best on Instagram Reels for homeowners:\n{spec}\n"
        "Return ONLY a JSON object with exactly those keys and string values."
    )
    body = json.dumps({
        "model": cfg["claude_model"],
        "max_tokens": 800,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read())
        text = "".join(b.get("text", "") for b in data.get("content", [])).strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        out = json.loads(match.group(0)) if match else None
        if out and all(isinstance(v, str) and v for v in out.values()):
            return out
    except Exception as e:
        print(f"  (Claude copy skipped: {e})")
    return None


def generate_copy(job, city, cfg, want_ad=False, want_vo=False):
    base = copy_templates(job, city, cfg)
    smart = copy_claude(job, city, cfg, want_ad, want_vo)
    if smart:
        base.update({k: v for k, v in smart.items() if k in base})
        base["_source"] = "claude"
    else:
        base["_source"] = "template"
    return base


def write_ad_file(path, copy, cfg, reel_name):
    body = f"""META AD COPY — {reel_name}
{'=' * 60}

PRIMARY TEXT
{copy['ad_primary']}

HEADLINE (max 40 chars)
{copy['ad_headline']}

DESCRIPTION (max 30 chars)
{copy['ad_description']}

CTA BUTTON
{copy['ad_cta_button']}

DESTINATION
https://{cfg['website']}

HOW TO RUN IT (2 minutes, from the published reel)
1. Publish the reel first (reelforge publish), or upload it in Meta Ads Manager.
2. Easiest: open the reel on your Facebook Page -> Boost.
   Full control: Ads Manager -> +Create -> Engagement or Leads.
3. Audience: people in your service cities, 28-65+, homeowners.
   Start with [Plano, Frisco, Allen, McKinney] OR [Irving, Grapevine, Southlake].
4. Budget: start at $5-10/day for 5-7 days; kill it if cost per lead
   is worse than a review-request week, double down if better.
5. Paste the copy above into the matching fields.
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(body)


# ---------------------------------------------------------------------------
# Meta (Facebook / Instagram) publishing
# ---------------------------------------------------------------------------

def meta_token(cfg):
    return os.environ.get("META_ACCESS_TOKEN") or cfg.get("meta_access_token") or ""


def graph_request(url, token, params=None, method="GET"):
    params = dict(params or {})
    params["access_token"] = token
    data = urllib.parse.urlencode(params).encode()
    if method == "GET":
        req = urllib.request.Request(url + "?" + data.decode())
    else:
        req = urllib.request.Request(url, data=data, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read()).get("error", {})
            die(f"Meta API error: {err.get('message', e)} (code {err.get('code')})")
        except (ValueError, AttributeError):
            die(f"Meta API error: {e}")


def rupload(url, token, video_path):
    size = os.path.getsize(video_path)
    with open(video_path, "rb") as f:
        blob = f.read()
    req = urllib.request.Request(url, data=blob, method="POST", headers={
        "Authorization": f"OAuth {token}",
        "offset": "0",
        "file_size": str(size),
        "Content-Type": "application/octet-stream",
    })
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        die(f"Meta upload failed: {e.read().decode(errors='replace')[:300]}")


def publish_instagram(video_path, caption, cfg, token):
    ig = cfg.get("meta_ig_user_id") or die("meta_ig_user_id not set in reel_config.json")
    print("  IG: creating media container ...")
    c = graph_request(f"{GRAPH}/{ig}/media", token, {
        "media_type": "REELS", "upload_type": "resumable", "caption": caption,
    }, method="POST")
    container, upload_uri = c["id"], c["uri"]
    print("  IG: uploading video ...")
    rupload(upload_uri, token, video_path)
    print("  IG: processing ", end="", flush=True)
    for _ in range(60):
        status = graph_request(f"{GRAPH}/{container}", token,
                               {"fields": "status_code"})["status_code"]
        if status == "FINISHED":
            break
        if status == "ERROR":
            die("Instagram rejected the video (status ERROR). Check length/codec.")
        print(".", end="", flush=True)
        time.sleep(5)
    else:
        die("timed out waiting for Instagram to process the upload")
    print()
    pub = graph_request(f"{GRAPH}/{ig}/media_publish", token,
                        {"creation_id": container}, method="POST")
    print(f"  IG: published (media id {pub.get('id')})")


def publish_facebook(video_path, caption, cfg, token):
    page = cfg.get("meta_page_id") or die("meta_page_id not set in reel_config.json")
    print("  FB: starting reel upload ...")
    s = graph_request(f"{GRAPH}/{page}/video_reels", token,
                      {"upload_phase": "start"}, method="POST")
    video_id, upload_url = s["video_id"], s["upload_url"]
    print("  FB: uploading video ...")
    rupload(upload_url, token, video_path)
    print("  FB: finishing ...")
    graph_request(f"{GRAPH}/{page}/video_reels", token, {
        "upload_phase": "finish", "video_id": video_id,
        "video_state": "PUBLISHED", "description": caption,
    }, method="POST")
    print(f"  FB: published (video id {video_id})")


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_scan(args):
    check_tools()
    clips = list_footage(args.footage, args.job)
    if not clips:
        die(f"no video files found in {args.footage}")
    print(f"{len(clips)} clip(s) in {args.footage}:\n")
    print(f"  {'file':40} {'length':>8} {'size':>12} {'audio':>6}")
    for c in clips:
        name = os.path.basename(c["path"])[:40]
        print(f"  {name:40} {c['duration']:7.1f}s {c['width']}x{c['height']:>6} "
              f"{'yes' if c['has_audio'] else 'no':>6}")
    cfg = load_config(args.config)
    takes = plan_takes(clips[: args.max_clips or cfg["max_clips"]], cfg)
    print(f"\nA reel from the first {len(takes)} clips would run "
          f"~{sum(takes) - (len(takes)-1)*cfg['fade_seconds']:.0f}s.")


def cmd_make(args):
    check_tools()
    cfg = load_config(args.config)
    for key in ("target_seconds", "max_clips"):
        val = getattr(args, key, None)
        if val:
            cfg[key] = val
    font = find_font(cfg)

    if args.clips:
        clips = []
        for p in args.clips:
            meta = probe(p)
            if not meta:
                die(f"cannot read video: {p}")
            clips.append(meta)
    else:
        clips = list_footage(args.footage, args.job)
    if not clips:
        die(f"no video files found in {args.footage}")
    clips = clips[: cfg["max_clips"]]

    job, city = parse_filename_meta(clips[0]["path"])
    want_vo = bool(args.voiceover or args.vo_text)
    copy = generate_copy(job, city, cfg, want_ad=args.ad, want_vo=want_vo)
    hook_text = args.title or copy["hook"]
    cta_text = copy["cta"]

    music = args.music or cfg.get("music_path") or ""
    if music and not os.path.isfile(music):
        die(f"music file not found: {music}")

    out_dir = args.out or "reels"
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.date.today().strftime("%Y%m%d")
    base = f"reel_{stamp}" + (f"_{job}" if job else "") + (f"_{city}" if city else "")
    out_path = os.path.join(out_dir, base + ".mp4")
    i = 2
    while os.path.exists(out_path):
        out_path = os.path.join(out_dir, f"{base}_v{i}.mp4")
        i += 1

    takes = plan_takes(clips, cfg)
    print(f"Building reel from {len(clips)} clips "
          f"(~{sum(takes) - (len(takes)-1)*cfg['fade_seconds']:.0f}s total)")
    print(f"  copy:  {copy['_source']}")
    print(f"  hook:  {hook_text}")
    print(f"  music: {os.path.basename(music) if music else '(clip audio)'}")

    tmpdir = tempfile.mkdtemp(prefix="reelforge_")
    try:
        vo_path = None
        if want_vo:
            vo_text = args.vo_text or copy["vo_script"]
            print(f"  voice: {vo_text[:70]}{'...' if len(vo_text) > 70 else ''}")
            vo_path = os.path.join(tmpdir, "vo.wav")
            vo_len = synth_voiceover(vo_text, vo_path, cfg, tmpdir)
            reel_len = sum(takes) - (len(takes) - 1) * cfg["fade_seconds"]
            if vo_len + 1.2 > reel_len:
                print(f"  note: voiceover ({vo_len:.1f}s) is long for a "
                      f"{reel_len:.1f}s reel — it will be cut at the end. "
                      "Use --vo-text for a shorter script or add clips.")

        parts = []
        for idx, (clip, take) in enumerate(zip(clips, takes), 1):
            print(f"  [{idx}/{len(clips)}] {os.path.basename(clip['path'])} -> {take}s")
            part = os.path.join(tmpdir, f"part{idx:02d}.mp4")
            normalize_clip(clip, take, part, cfg)
            parts.append(part)

        print("  stitching + titles + audio ...")
        total = build_reel(parts, takes, out_path, cfg, font, hook_text, cta_text,
                           music, vo_path, tmpdir)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    stem = os.path.splitext(out_path)[0]
    if not args.no_captions:
        with open(stem + ".caption.txt", "w", encoding="utf-8") as f:
            f.write(copy["caption"] + "\n")
    if args.ad:
        write_ad_file(stem + ".ad.txt", copy, cfg, os.path.basename(out_path))

    size_mb = os.path.getsize(out_path) / 1e6
    print(f"\nDone: {out_path}  ({total:.1f}s, {size_mb:.1f} MB)")
    if not args.no_captions:
        print(f"Caption: {stem}.caption.txt")
    if args.ad:
        print(f"Ad copy: {stem}.ad.txt")
    print(f"Review it, then publish with:\n"
          f"  python3 {os.path.basename(__file__)} publish {out_path}")


def cmd_publish(args):
    cfg = load_config(args.config)
    token = meta_token(cfg)
    if not token:
        die("no Meta access token — set META_ACCESS_TOKEN or meta_access_token "
            "in reel_config.json (see README: 'Connecting Facebook & Instagram')")
    if not os.path.isfile(args.reel):
        die(f"reel not found: {args.reel}")

    caption = args.caption or ""
    if not caption:
        cap_file = args.caption_file or os.path.splitext(args.reel)[0] + ".caption.txt"
        if os.path.isfile(cap_file):
            with open(cap_file, "r", encoding="utf-8") as f:
                caption = f.read().strip()
        else:
            print("  (no caption file found — publishing without a caption)")

    targets = args.to or []
    if not targets:
        if cfg.get("meta_ig_user_id"):
            targets.append("ig")
        if cfg.get("meta_page_id"):
            targets.append("fb")
    if not targets:
        die("no publish targets — set meta_ig_user_id and/or meta_page_id in config")

    meta = probe(args.reel)
    print(f"Publishing {os.path.basename(args.reel)} "
          f"({meta['duration']:.1f}s) to: {', '.join(t.upper() for t in targets)}")
    if "ig" in targets:
        publish_instagram(args.reel, caption, cfg, token)
    if "fb" in targets:
        publish_facebook(args.reel, caption, cfg, token)
    print("\nAll done. Give it ~1 minute to appear on the profile(s).")


def main():
    ap = argparse.ArgumentParser(prog="reelforge", description=__doc__.strip().splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    ps = sub.add_parser("scan", help="list footage and preview the edit plan")
    ps.add_argument("footage", help="folder of raw clips")
    ps.add_argument("--job", help="only clips whose filename starts with this")
    ps.add_argument("--max-clips", type=int, dest="max_clips")
    ps.add_argument("--config")
    ps.set_defaults(func=cmd_scan)

    pm = sub.add_parser("make", help="build a reel from a footage folder")
    pm.add_argument("footage", nargs="?", default=".", help="folder of raw clips")
    pm.add_argument("--out", help="output folder (default ./reels)")
    pm.add_argument("--title", help="hook text shown at the start (overrides generated)")
    pm.add_argument("--music", help="path to a music file (mp3/m4a/wav)")
    pm.add_argument("--voiceover", action="store_true",
                    help="add a spoken voiceover (script auto-written)")
    pm.add_argument("--vo-text", dest="vo_text", help="exact voiceover script to speak")
    pm.add_argument("--ad", action="store_true",
                    help="also write Meta ad copy next to the reel")
    pm.add_argument("--job", help="only clips whose filename starts with this")
    pm.add_argument("--clips", nargs="+", help="explicit clip files, in order")
    pm.add_argument("--target-seconds", type=int, dest="target_seconds")
    pm.add_argument("--max-clips", type=int, dest="max_clips")
    pm.add_argument("--no-captions", action="store_true")
    pm.add_argument("--config")
    pm.set_defaults(func=cmd_make)

    pp = sub.add_parser("publish", help="post a finished reel to Instagram/Facebook")
    pp.add_argument("reel", help="path to the reel .mp4")
    pp.add_argument("--to", nargs="+", choices=["ig", "fb"],
                    help="targets (default: whatever is configured)")
    pp.add_argument("--caption", help="caption text (default: sibling .caption.txt)")
    pp.add_argument("--caption-file", dest="caption_file")
    pp.add_argument("--config")
    pp.set_defaults(func=cmd_publish)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
