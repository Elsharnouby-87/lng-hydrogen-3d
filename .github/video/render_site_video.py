#!/usr/bin/env python3
"""Record only the repository's self-contained 3D website; add original high-energy instrumental audio."""
from pathlib import Path
import math, time, wave, subprocess, os, sys, traceback
import numpy as np
from playwright.sync_api import sync_playwright

OUT=Path("oapec_site_video")
OUT.mkdir(exist_ok=True)
TARGET=33.0
SR=44100

def soundscape(path):
    """Original 150 BPM instrumental: kick, snare, hats, synth bass, chords and transition risers."""
    bpm=150.0; beat=60.0/bpm
    duration=TARGET+0.12; n=int(SR*duration)
    audio=np.zeros(n,np.float32)
    def add(t,arr,gain=1):
        i=int(t*SR)
        if i>=n: return
        z=min(len(arr),n-i)
        if z>0: audio[i:i+z]+=gain*arr[:z]
    rng=np.random.default_rng(2026)
    def tone(freq,tt,wave="saw"):
        phase=2*np.pi*freq*tt
        if wave=="tri": return 2*np.arcsin(np.sin(phase))/np.pi
        if wave=="sine": return np.sin(phase)
        return (2/np.pi)*(np.sin(phase)+.46*np.sin(2*phase)+.22*np.sin(3*phase))
    # Punchy cinematic club kick and snare every bar; relentless high hats.
    for b in np.arange(0,duration,beat):
        t=np.arange(int(.28*SR),dtype=np.float32)/SR
        ph=2*np.pi*(54*t+112*(1-np.exp(-18*t))/18)
        kick=np.sin(ph)*np.exp(-15*t)
        kick+=.22*rng.standard_normal(len(t))*np.exp(-80*t)
        add(float(b),kick,.94)
    for b in np.arange(beat,duration,2*beat):
        t=np.arange(int(.23*SR),dtype=np.float32)/SR
        sn=.65*rng.standard_normal(len(t))*np.exp(-17*t)
        sn+=.17*np.sin(2*np.pi*184*t)*np.exp(-19*t)
        add(float(b),sn,.52)
    for b in np.arange(beat/2,duration,beat/2):
        t=np.arange(int(.075*SR),dtype=np.float32)/SR
        h=rng.standard_normal(len(t)).astype("float32")*np.exp(-73*t)
        h=np.append(h[0], np.diff(h))
        add(float(b),h,.11)
    # Deep rhythmic synth bass; four-bar harmonic progression in minor mode.
    progression=[(43.65,[174.61,207.65,261.63]),(51.91,[155.56,207.65,261.63]),
                 (38.89,[155.56,196.00,233.08]),(58.27,[174.61,233.08,293.66])]
    for k,b in enumerate(np.arange(0,duration,beat/2)):
        bar=int(b/(4*beat))%4
        root,_=progression[bar]
        freq=root*(2 if k%8==7 else 1)
        t=np.arange(int(.24*SR),dtype=np.float32)/SR
        bass=tone(freq,t)*np.exp(-10*t)*(1-np.exp(-120*t))
        add(float(b),bass,.18)
    # Side-chained staccato cinematic synth chords every 2 beats.
    for k,b in enumerate(np.arange(0,duration,2*beat)):
        bar=int(b/(4*beat))%4
        _,notes=progression[bar]
        t=np.arange(int(.52*SR),dtype=np.float32)/SR
        chord=sum(tone(f,t) for f in notes)/3
        env=(1-np.exp(-36*t))*np.exp(-5*t)
        add(float(b+.02),chord*env,.17)
    # Arpeggio energy above the drums.
    for k,b in enumerate(np.arange(0,duration,beat/4)):
        bar=int(b/(4*beat))%4
        _,notes=progression[bar]
        note=notes[(k//2)%3]*2
        t=np.arange(int(.115*SR),dtype=np.float32)/SR
        arp=tone(note,t,"tri")*np.exp(-28*t)
        add(float(b),arp,.075)
    # Swells at exact edit points.
    for st in [2.5,8.0,14.2,21.8,25.8,29.7]:
        length=.45;t=np.arange(int(length*SR),dtype=np.float32)/SR
        noise=rng.standard_normal(len(t)).astype(np.float32)
        hp=np.append(noise[0],np.diff(noise))
        rise=hp*((t/length)**1.7)*np.exp(-4*np.maximum(0,t-(length-.12)))
        add(st,rise,.07)
    # Intro impact, final lift and proper mastering.
    fadein=np.minimum(1,np.arange(n,dtype=np.float32)/(SR*.22))
    fadeout=np.minimum(1,(n-1-np.arange(n,dtype=np.float32))/(SR*.65))
    audio*=fadein*fadeout
    audio=np.tanh(audio*1.65)
    peak=max(0.001,float(np.max(np.abs(audio))))
    audio=np.asarray(audio/peak*.93*32767,dtype=np.int16)
    with wave.open(str(path),"wb") as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(audio.tobytes())

def run():
    recording=OUT/"recordings"
    recording.mkdir(exist_ok=True)
    home=Path("docs/index.html").resolve().as_uri()
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=[
            "--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader",
            "--enable-unsafe-swiftshader","--disable-dev-shm-usage","--autoplay-policy=no-user-gesture-required"])
        context=browser.new_context(viewport={"width":1280,"height":720},
            device_scale_factor=1,record_video_dir=str(recording),
            record_video_size={"width":1280,"height":720})
        page=context.new_page()
        page.on("pageerror",lambda err: print("Browser warning:",str(err)[:150]))
        video=page.video
        print("Loading exact repository website:",home,flush=True)
        tload=time.monotonic()
        page.goto(home,wait_until="load",timeout=120000)
        page.wait_for_selector("#model canvas",timeout=90000)
        page.wait_for_timeout(2400)
        trim=time.monotonic()-tload
        print("3D site ready; trim first",round(trim,2),"seconds",flush=True)
        t0=time.monotonic()
        def at(sec):
            sl=sec-(time.monotonic()-t0)
            if sl>0: page.wait_for_timeout(int(sl*1000))
        def action(sec,label,fn):
            at(sec)
            print("SHOT",round(time.monotonic()-t0,2),label,flush=True)
            try: fn()
            except Exception as ex: print("Skipped optional UI action:",label,str(ex)[:240],flush=True)
        def click(sel):
            page.locator(sel).first.click(timeout=1800,force=True)
        # All moving images and all screen text come exclusively from the 3D website.
        # No outside photos, PowerPoint elements, company marks or added graphic overlays.
        action(0.0,"3D overview",lambda: click("#present"))
        action(2.8,"trace hydrogen blue circuit",lambda: click('[data-trace="h2"]'))
        action(5.0,"hydrogen trace exchanger stop",lambda: click('[data-stop="2"]'))
        action(7.4,"close trace",lambda: click("#close-trace"))
        action(7.8,"enter exchanger section",lambda: click('[data-chapter="2"]'))
        action(9.4,"precooler exploded view",lambda: click('[data-core="exploded"]'))
        action(11.6,"both heat-transfer passages",lambda: click('[data-core="cutaway"]'))
        action(12.5,"highlight hydrogen passage",lambda: click('[data-stream="h2"]'))
        action(14.0,"restore both passages",lambda: click('[data-stream="both"]'))
        action(14.7,"deep cryogenic refrigeration",lambda: click('[data-chapter="3"]'))
        action(16.6,"deep refrigeration exploded",lambda: click('[data-deep="exploded"]'))
        action(18.8,"deep refrigeration cutaway",lambda: click('[data-deep="cutaway"]'))
        action(19.8,"helium cycle highlight",lambda: click('[data-deep-stream="he"]'))
        action(21.5,"LNG process path",lambda: click('[data-trace="lng"]'))
        action(23.5,"Kuwait model",lambda: page.evaluate("window.location.hash='#kuwait'"))
        action(27.6,"Egypt model",lambda: page.evaluate("window.location.hash='#egypt'"))
        action(31.0,"final 3D plant reveal",lambda: page.evaluate("window.location.hash='#plant'"))
        at(TARGET)
        page.close()
        context.close()
        browser.close()
        raw=Path(video.path())
        print("Raw record path",raw,raw.exists(),raw.stat().st_size if raw.exists() else None,flush=True)
    music=OUT/"high_energy_original.wav"
    soundscape(music)
    output=OUT/"OAPEC_Website_Only_3D_LinkedIn_33s.mp4"
    # Trim page-loading frames; all visual content is the website itself.
    cmd=["ffmpeg","-y","-hide_banner","-loglevel","error","-ss",f"{trim:.3f}","-i",str(raw),
         "-i",str(music),"-t",str(TARGET),"-map","0:v:0","-map","1:a:0",
         "-r","30","-c:v","libx264","-preset","veryfast","-crf","19",
         "-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart",
         "-shortest",str(output)]
    subprocess.run(cmd,check=True)
    subprocess.run(["ffprobe","-v","error","-show_entries","format=duration,size",
        "-of","default=noprint_wrappers=1",str(output)],check=True)
    print("FINAL VIDEO:",output,flush=True)

if __name__=="__main__":
    try: run()
    except Exception as e:
        print(traceback.format_exc(),flush=True)
        sys.exit(1)
