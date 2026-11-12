#!/usr/bin/env python3
"""Website-only 3D capture at a fixed 30-second timeline using real Chromium/X11 screen recording."""
import os, sys, time, subprocess, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from render_site_video import soundscape, TARGET
OUT=Path("oapec_site_video");OUT.mkdir(exist_ok=True)
def run():
    home=Path("docs/index.html").resolve().as_uri()
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=False,args=[
            "--no-sandbox","--window-position=0,0","--window-size=1280,720",
            "--kiosk","--enable-webgl","--use-gl=angle","--use-angle=swiftshader",
            "--enable-unsafe-swiftshader","--disable-dev-shm-usage","--disable-infobars",
            "--hide-scrollbars","--autoplay-policy=no-user-gesture-required"])
        ctx=browser.new_context(viewport={"width":1280,"height":720},device_scale_factor=1)
        page=ctx.new_page()
        page.goto(home,wait_until="load",timeout=120000)
        page.wait_for_selector("#model canvas",timeout=90000)
        page.wait_for_timeout(2500)
        print("Actual self-contained website loaded",flush=True)
        try: page.locator("#present").click(force=True,timeout=1500)
        except Exception as e: print("Could not switch site Present mode",str(e)[:100],flush=True)
        page.wait_for_timeout(450)
        raw=OUT/"x11_capture.mp4"
        cmd=[
            "ffmpeg","-y","-hide_banner","-loglevel","error","-nostdin",
            "-f","x11grab","-draw_mouse","0","-framerate","30",
            "-video_size","1280x720","-i",os.environ.get("DISPLAY",":99"),
            "-t",str(TARGET),"-c:v","libx264","-preset","ultrafast",
            "-crf","18","-pix_fmt","yuv420p",str(raw)]
        screen=subprocess.Popen(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        start=time.monotonic()
        def at(sec):
            delta=sec-(time.monotonic()-start)
            if delta>0: page.wait_for_timeout(int(delta*1000))
        def action(sec,label,fn):
            at(sec)
            try: fn()
            except Exception as e: print("Optional interaction failed",label,str(e)[:200],flush=True)
            print(f"Shot {sec:4.1f} s: {label}",flush=True)
        def click(sel): page.locator(sel).first.click(force=True,timeout=1500)
        # Editing rhythm: clean flow from overview to hydrogen, heat exchanger, cold box,
        # then the two on-site national models and back to the process.
        action(.2,"plant overview",lambda:None)
        action(2.8,"hydrogen blue circuit",lambda:click('[data-trace="h2"]'))
        action(5.1,"hydrogen next stop",lambda:click('[data-stop="2"]'))
        action(7.0,"end trace",lambda:click("#close-trace"))
        action(7.5,"E-101 cryogenic precooler",lambda:click('[data-chapter="2"]'))
        action(9.5,"E-101 exploded plates",lambda:click('[data-core="exploded"]'))
        action(11.1,"E-101 cutaway",lambda:click('[data-core="cutaway"]'))
        action(12.1,"H2 channel",lambda:click('[data-stream="h2"]'))
        action(13.4,"two separated circuits",lambda:click('[data-stream="both"]'))
        action(14.6,"R-101 cold box",lambda:click('[data-chapter="3"]'))
        action(16.2,"R-101 exploded",lambda:click('[data-deep="exploded"]'))
        action(18.0,"R-101 cutaway",lambda:click('[data-deep="cutaway"]'))
        action(19.4,"helium circuit",lambda:click('[data-deep-stream="he"]'))
        action(21.4,"LNG green circuit",lambda:click('[data-trace="lng"]'))
        action(23.3,"Kuwait site model",lambda:page.evaluate("location.hash='#kuwait'"))
        action(24.2,"Kuwait screenshot",lambda:page.screenshot(path=str(OUT/"kuwait_site.png")))
        action(27.3,"Egypt site model",lambda:page.evaluate("location.hash='#egypt'"))
        action(28.2,"Egypt screenshot",lambda:page.screenshot(path=str(OUT/"egypt_site.png")))
        action(30.5,"plant site end",lambda:page.evaluate("location.hash='#plant'"))
        at(TARGET)
        try: screen.wait(timeout=60)
        except subprocess.TimeoutExpired: screen.terminate();screen.wait(timeout=10)
        if screen.returncode: 
            print("FFmpeg error:",screen.stderr.read().decode(errors="replace")[-1800:],flush=True)
            raise RuntimeError(f"X11 grab failed {screen.returncode}")
        page.screenshot(path=str(OUT/"website_end.png"))
        ctx.close();browser.close()
    music=OUT/"high_energy_original.wav"
    soundscape(music)
    output=OUT/"OAPEC_Website_Only_3D_LinkedIn_33s.mp4"
    subprocess.run(["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(raw),
      "-i",str(music),"-t",str(TARGET),"-map","0:v:0","-map","1:a:0",
      "-c:v","libx264","-preset","veryfast","-crf","19","-pix_fmt","yuv420p",
      "-c:a","aac","-b:a","192k","-movflags","+faststart","-shortest",str(output)],check=True)
    subprocess.run(["ffprobe","-v","error","-show_entries","format=duration,size",
        "-of","default=noprint_wrappers=1",str(output)],check=True)
    print("Final site-only MP4:",output,flush=True)
if __name__=="__main__":
    try:run()
    except Exception as e:
        print(traceback.format_exc(),flush=True)
        sys.exit(1)
