#!/usr/bin/env python3
"""Professionally sequenced website-only 3D film using the site's native process camera."""
import os,sys,time,subprocess,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
import render_site_video as soundtrack

DURATION=33.6
soundtrack.TARGET=DURATION
ROOT=Path("oapec_guided_reel")
ROOT.mkdir(exist_ok=True)
SIZES=(1280,720)
FPS=30

def main():
    url=Path("docs/index.html").resolve().as_uri()
    shot_log=[]
    with sync_playwright() as play:
        browser=play.chromium.launch(headless=False,args=[
            "--no-sandbox", "--kiosk", "--window-position=0,0", "--window-size=1280,720",
            "--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader", "--disable-infobars","--disable-dev-shm-usage",
            "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"
        ])
        context=browser.new_context(viewport={"width":SIZES[0],"height":SIZES[1]},device_scale_factor=1)
        page=context.new_page()
        page.on('pageerror',lambda e:print("Page warning:",str(e)[:140],flush=True))
        page.goto(url,wait_until='load',timeout=120000)
        page.wait_for_selector("#model canvas",timeout=90000)
        page.wait_for_function("window.__siteFilm && window.__siteFilm.ready()",timeout=90000)
        page.wait_for_timeout(2500)
        # A clear cinematic site experience: original website, original text, native 3D plant.
        # Hide site buttons, hints, panels and cards that would distract from the process.
        # No external graphics, photos, PowerPoint content or added titles are used.
        page.add_style_tag(content="""
          * { cursor:none !important; }
          header .head-actions, .chapters, footer.footer, .hotspots, .stage-actions,
          .stage-top .modes, #inspection, #equipment-card, #coldbox-note,
          #trace-panel, #profile-panel, #inspection-walk, #screen-duty-overlay,
          .narrative .tour-actions, .narrative .keyboard-help, .presenter-cue {
             display: none !important;
          }
          .narrative { pointer-events:none !important; }
          .stage { overflow:hidden !important; }
          #model canvas { pointer-events:none !important; }
        """)
        page.evaluate("window.__siteFilm.present(); window.__siteFilm.flow(true); window.__siteFilm.labels(true); window.__siteFilm.trace('both')")
        page.wait_for_timeout(500)
        raw=ROOT/"website_live_3d_recording.mp4"
        ffmpeg=["ffmpeg","-y","-hide_banner","-loglevel","error","-nostdin",
            "-f","x11grab","-draw_mouse","0","-framerate",str(FPS),
            "-video_size",f"{SIZES[0]}x{SIZES[1]}",
            "-i",os.environ.get("DISPLAY",":99"),"-t",str(DURATION),
            "-c:v","libx264","-preset","ultrafast","-crf","19","-pix_fmt","yuv420p",str(raw)]
        recording=subprocess.Popen(ffmpeg,stdin=subprocess.DEVNULL,stderr=subprocess.PIPE)
        t0=time.monotonic()
        def seek(t):
            gap=t-(time.monotonic()-t0)
            if gap>0:page.wait_for_timeout(int(gap*1000))
        def trigger(t,description,fn):
            seek(t)
            try:fn()
            except Exception as e:print("Director warning:",description,str(e)[:300],flush=True)
            print(f"{(time.monotonic()-t0):5.2f}s / {description}",flush=True)
            shot_log.append((t,description))
        def cine(cmd,*args):page.evaluate("([cmd,args]) => window.__siteFilm[cmd](...args)",[cmd,list(args)])
        def snap(name):page.screenshot(path=str(ROOT/(name+".png")),timeout=9000)
        # STRUCTURED SEQUENCE—single directional process story rather than random equipment jumping.
        trigger(0.05,"01 / Establishing shot: complete LNG-H2 industrial plant",lambda:cine("chapter",0,"overview",700))
        trigger(1.90,"01 / Steady overview, both animated streams",lambda:snap("01_overview"))
        trigger(3.20,"02 / LNG cold source: tank and cryogenic pump",lambda:(cine("trace","lng"),cine("chapter",1,"lng",1400)))
        trigger(4.80,"02 / LNG path in camera focus",lambda:snap("02_lng"))
        trigger(6.40,"03 / Hydrogen conditioning and compressor",lambda:(cine("trace","h2"),cine("chapter",0,"compressor",1400)))
        trigger(8.05,"03 / Hydrogen circuit in focus",lambda:snap("03_hydrogen"))
        trigger(9.60,"04 / E-101 thermal handoff: separate fluid passages",lambda:(cine("trace","both"),cine("chapter",2,"exchange",1200),cine("stream","both")))
        trigger(11.35,"04 / E-101 cutaway",lambda:snap("04_exchanger"))
        trigger(12.60,"05 / Inspect E-101 plate-fin core",lambda:cine("core","section","section",1300))
        trigger(14.30,"05 / E-101 section view",lambda:snap("05_section"))
        trigger(15.80,"06 / Deep refrigeration to ~20 K",lambda:(cine("chapter",3,"deep",1300),cine("deepStream","both")))
        trigger(17.35,"06 / Detailed cryogenic cold-box cutaway",lambda:snap("06_coldbox"))
        trigger(18.05,"06 / Expose stages and expanders inside R-101",lambda:cine("deep","exploded",1100))
        trigger(19.45,"06 / Staged refrigeration anatomy",lambda:snap("07_exploded"))
        trigger(20.25,"07 / Final liquid-hydrogen storage",lambda:cine("focus","liquid",1150))
        trigger(21.45,"07 / LH2 tank, end of cryogenic journey",lambda:snap("08_liquid"))
        trigger(22.40,"08 / Kuwait cold-energy interactive screening",lambda:page.evaluate("location.hash='#kuwait'"))
        trigger(24.05,"08 / Kuwait simulator scenario",lambda:snap("09_kuwait"))
        trigger(26.40,"09 / Egypt cold-energy interactive screening",lambda:page.evaluate("location.hash='#egypt'"))
        trigger(28.05,"09 / Egypt simulator scenario",lambda:snap("10_egypt"))
        trigger(30.40,"10 / Return to complete interactive 3D website",lambda:page.evaluate("location.hash='#plant'"))
        trigger(30.68,"10 / Wide plant camera, LNG and hydrogen circuits together",
                lambda:(cine("trace","both"),cine("chapter",0,"overview",1200)))
        trigger(32.05,"10 / Final plant hero shot",lambda:snap("11_final"))
        seek(DURATION)
        try:recording.wait(timeout=80)
        except subprocess.TimeoutExpired:
            recording.terminate();recording.wait(timeout=10)
        if recording.returncode:
            raise RuntimeError("X11 screen capture failed: "+recording.stderr.read().decode(errors="replace")[-1500:])
        context.close();browser.close()
    music=ROOT/"original_high_energy_150bpm.wav"
    soundtrack.soundscape(music)
    out=ROOT/"OAPEC_2026_3D_Guided_Website_Only_33s.mp4"
    subprocess.run(["ffmpeg","-y","-hide_banner","-loglevel","error",
         "-i",str(raw),"-i",str(music),"-t",str(DURATION),
         "-map","0:v:0","-map","1:a:0","-c:v","libx264","-preset","medium","-crf","18",
         "-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart",
         "-shortest",str(out)],check=True)
    subprocess.run(["ffprobe","-v","error","-show_entries","format=duration,size",
       "-of","default=noprint_wrappers=1",str(out)],check=True)
    print("FINAL GUIDED WEBSITE-ONLY VIDEO:",out,flush=True)

if __name__=='__main__':
    try:main()
    except Exception:
        print(traceback.format_exc(),flush=True)
        sys.exit(1)
