#!/usr/bin/env python3
"""
ReelForge — auto-edit raw jobsite footage into 9:16 reels for Facebook & Instagram.

Feed it a folder of phone clips from a job; it trims each clip, stacks them into a
vertical 1080x1920 reel with crossfades, burns in a hook title, a call-to-action,
and a brand watermark, lays music under it, and writes a ready-to-paste caption.

Zero paid services: everything runs locally on ffmpeg.

Usage:
  python3 reelforge.py scan  FOOTAGE_DIR
  python3 reelforge.py make  FOOTAGE_DIR [options]

Examples:
  python3 reelforge.py make ~/Downloads/footage
  python3 reelforge.py make ~/Downloads/footage --title "Slab leak found + fixed" \
      --music assets/track1.mp3 --out ~/Desktop/reels

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
import urllib.request

VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm", ".mts", ".3gp"}

# ---------------------------------------------------------------------------
# Defaults — every field can be overridden in reel_config.json.
# Bracketed values are the productizable knobs: swap per client.
# ---------------------------------------------------------------------------
DEFAULTS = {
    "brand_name": "RU\u00b7BRIC PLUMBING",          # [CLIENT BRAND NAME]
    "cta_text": "Call or DM us \u2014 done right the first time.",  # [CLIENT CTA]
    "phone_display": "",                             # [CLIENT PHONE] shown under CTA if set
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
    """Run a command, dying with ffmpeg's stderr tail on failure."""
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


def build_reel(parts, takes, out_path, cfg, font, hook_text, music_path, tmpdir):
    n = len(parts)
    fade = cfg["fade_seconds"] if n > 1 else 0.0
    total = sum(takes) - (n - 1) * fade

    cmd = ["ffmpeg", "-y"]
    for p in parts:
        cmd += ["-i", p]
    music_idx = None
    if music_path:
        music_idx = n
        cmd += ["-stream_loop", "-1", "-i", music_path]
    logo_idx = None
    if cfg.get("logo_path") and os.path.isfile(cfg["logo_path"]):
        logo_idx = n + (1 if music_path else 0)
        cmd += ["-i", cfg["logo_path"]]

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
    cta = wrap_text(cfg["cta_text"], 26)
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
            f"afade=t=in:d=0.5,afade=t=out:st={fade_out_start:.3f}:d=1.5[amus]"
        )
        if nat_vol > 0:
            fc.append(f"[anat]volume={nat_vol}[anatq]")
            fc.append("[amus][anatq]amix=inputs=2:duration=first:normalize=0[aout]")
        else:
            fc.append("[amus]anull[aout]")
    else:
        fc.append(
            f"[anat]afade=t=out:st={fade_out_start:.3f}:d=1.5[aout]"
        )

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
# Captions
# ---------------------------------------------------------------------------

def caption_offline(job, city, hook_text, cfg):
    city_name = (city or cfg["caption_city_default"]).title()
    lines = [
        f"{hook_text} \U0001f527",
        "",
        f"Another one done right the first time in {city_name}.",
        "Licensed Texas Master Plumber \u2014 premium work, no shortcuts.",
        "",
        "\U0001f4f2 Call or DM to book.",
        "",
        cfg["caption_hashtags"] + (f" #{city.lower()}" if city else ""),
    ]
    return "\n".join(lines)


def caption_claude(job, city, hook_text, cfg):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    prompt = (
        "Write a short Instagram/Facebook Reels caption for a premium residential "
        f"plumbing company called {cfg['brand_name']} (brand voice: craftsman, confident, "
        "'done right the first time', never discount-y, no emoji spam — max 2 emoji). "
        f"The reel shows: {hook_text}. Job type: {job or 'plumbing job'}. "
        f"City: {(city or cfg['caption_city_default']).title()}, Texas. "
        "3-5 short lines, then a call-to-action line, then one line of 6-10 hashtags "
        "including the city. Return ONLY the caption text."
    )
    body = json.dumps({
        "model": "claude-sonnet-5",
        "max_tokens": 400,
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
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        return "".join(b.get("text", "") for b in data.get("content", [])).strip() or None
    except Exception as e:
        print(f"  (Claude caption skipped: {e})")
        return None


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
    takes = plan_takes(clips[: args.max_clips or DEFAULTS['max_clips']], load_config(args.config))
    print(f"\nA reel from the first {len(takes)} clips would run "
          f"~{sum(takes) - (len(takes)-1)*DEFAULTS['fade_seconds']:.0f}s.")


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
            meta = probe(p) or die(f"cannot read video: {p}")
            clips.append(meta)
    else:
        clips = list_footage(args.footage, args.job)
    if not clips:
        die(f"no video files found in {args.footage}")
    clips = clips[: cfg["max_clips"]]

    job, city = parse_filename_meta(clips[0]["path"])
    hook_text = args.title or cfg["hooks_by_job"].get(job) or "Watch this job, start to finish"

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
    print(f"  hook:  {hook_text}")
    print(f"  music: {os.path.basename(music) if music else '(clip audio)'}")

    tmpdir = tempfile.mkdtemp(prefix="reelforge_")
    try:
        parts = []
        for idx, (clip, take) in enumerate(zip(clips, takes), 1):
            print(f"  [{idx}/{len(clips)}] {os.path.basename(clip['path'])} -> {take}s")
            part = os.path.join(tmpdir, f"part{idx:02d}.mp4")
            normalize_clip(clip, take, part, cfg)
            parts.append(part)

        print("  stitching + titles + audio ...")
        total = build_reel(parts, takes, out_path, cfg, font, hook_text, music, tmpdir)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    caption = None
    if not args.no_captions:
        caption = caption_claude(job, city, hook_text, cfg) or \
                  caption_offline(job, city, hook_text, cfg)
        cap_path = os.path.splitext(out_path)[0] + ".caption.txt"
        with open(cap_path, "w", encoding="utf-8") as f:
            f.write(caption + "\n")

    size_mb = os.path.getsize(out_path) / 1e6
    print(f"\nDone: {out_path}  ({total:.1f}s, {size_mb:.1f} MB)")
    if caption:
        print(f"Caption: {os.path.splitext(out_path)[0] + '.caption.txt'}")
    print("Upload the .mp4 to Instagram Reels / Facebook Reels and paste the caption.")


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
    pm.add_argument("--title", help="hook text shown at the start")
    pm.add_argument("--music", help="path to a music file (mp3/m4a/wav)")
    pm.add_argument("--job", help="only clips whose filename starts with this")
    pm.add_argument("--clips", nargs="+", help="explicit clip files, in order")
    pm.add_argument("--target-seconds", type=int, dest="target_seconds")
    pm.add_argument("--max-clips", type=int, dest="max_clips")
    pm.add_argument("--no-captions", action="store_true")
    pm.add_argument("--config")
    pm.set_defaults(func=cmd_make)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
