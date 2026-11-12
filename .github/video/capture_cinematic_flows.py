#!/usr/bin/env python3
"""Capture five authentic animated browser views for a 34-second LinkedIn showcase.
Visual frames come only from the live Three.js website, never from slide decks or synthetic imagery."""
from pathlib import Path
import subprocess, shutil, json, traceback, sys, time
from playwright.sync_api import sync_playwright

OUT=Path("cinematic_raw")
OUT.mkdir(exist_ok=True)
WEB=Path("docs/index.html").resolve().as_uri()
SPECS=[
  ("hero_desktop",1280,720,"hero",6.6),
  ("e101_desktop",1280,720,"e",8.6),
  ("e101_mobile",414,736,"e",6.6),
  ("r101_desktop",1280,720,"r",10.6),
  ("r101_mobile",414,736,"r",6.6),
]
DESKTOP_CSS="""
 * { cursor:none!important; }
 .head-actions,.narrative,.chapters,footer.footer,.hotspots,.stage-actions,
 #inspection,#equipment-card,#coldbox-note,#trace-panel,#profile-panel,
 #inspection-walk,#screen-duty-overlay,.stage-top .modes {display:none!important}
 .masthead{height:57px!important;min-height:57px!important}
 main,.is-presenting main{padding:5px 9px 0!important;max-width:none!important}
 .experience,.is-presenting .experience{
   display:block!important;position:relative!important;
   height:calc(100dvh - 65px)!important;min-height:0!important;
   border-radius:7px!important;
 }
 .stage,.is-presenting .stage{position:absolute!important;inset:0!important;height:100%!important}
 #model{position:absolute!important;inset:0!important}
 .stage-bottom{display:flex!important}
 .stage-bottom>.legend{display:flex!important}
 .stage-top .view-tag{display:flex!important;font-size:12px!important;letter-spacing:.09em!important;
   padding:12px 14px!important}
"""
MOBILE_CSS="""
 * {cursor:none!important}
 .head-actions,.narrative,.chapters,footer.footer,.hotspots,.stage-actions,
 #inspection,#equipment-card,#coldbox-note,#trace-panel,#profile-panel,
 #inspection-walk,#screen-duty-overlay,.stage-top .modes,
 .mobile-controls,.mobile-sheet,.mobile-chapter,.mobile-nav,
 .mobile-scrim,.mobile-panel{display:none!important}
 .masthead,.is-presenting .masthead{
   height:58px!important;min-height:58px!important;display:flex!important;
   padding:0 13px!important;align-items:center!important;
 }
 .masthead .event{display:none!important}
 main,.is-presenting main{padding:5px 6px 0!important;max-width:none!important}
 .experience,.is-presenting .experience{
   display:block!important;position:relative!important;
   height:calc(100dvh - 68px)!important;min-height:0!important;
   border-radius:9px!important;overflow:hidden!important
 }
 .stage,.is-presenting .stage{
   position:absolute!important;inset:0!important;
   width:100%!important;height:100%!important;min-height:0!important;
 }
 #model{position:absolute!important;inset:0!important}
 .stage-bottom{display:flex!important}
 .stage-bottom .legend{display:flex!important;font-size:10px!important}
 .stage-top .view-tag{display:flex!important;font-size:10px!important;
   padding:9px!important}
"""
def cmd(args):
    subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
def duration(path):
    proc=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
            "-of","default=noprint_wrappers=1:nokey=1",str(path)],capture_output=True,text=True,check=True)
    return float(proc.stdout.strip())
def cine(page,method,*args):
    return page.evaluate("([method,arguments_])=>window.__siteFilm[method](...arguments_)",[method,list(args)])

def capture(p, spec):
    name,w,h,what,d=spec
    c=p.chromium.launch(headless=True,args=[
        "--no-sandbox","--enable-webgl","--use-gl=angle",
        "--use-angle=swiftshader","--enable-unsafe-swiftshader",
        "--disable-dev-shm-usage","--autoplay-policy=no-user-gesture-required",
        "--disable-background-timer-throttling","--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
    ])
    raw_dir=OUT/("rec_"+name);raw_dir.mkdir(exist_ok=True)
    ctx=c.new_context(viewport={"width":w,"height":h},device_scale_factor=1,
        record_video_dir=str(raw_dir),record_video_size={"width":w,"height":h},
        reduced_motion="no-preference")
    page=ctx.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)[:200]))
    tload=time.monotonic()
    page.goto(WEB,wait_until="load",timeout=120000)
    page.wait_for_function("window.__siteFilm && window.__siteFilm.ready()",timeout=110000)
    # This changes only the viewing layout, not 3D equipment/geometry.
    page.add_style_tag(content=MOBILE_CSS if w<600 else DESKTOP_CSS)
    cine(page,"present")
    cine(page,"flow",True)
    cine(page,"trace","both")
    cine(page,"labels",False)
    # Faster visualization of the site's own animated particles for screen legibility.
    cine(page,"speed",3.2 if what!="hero" else 2.6)
    if what=="hero":
        cine(page,"chapter",0,"overview",450)
    elif what=="e":
        cine(page,"chapter",2,"exchange",600)
        cine(page,"core","exploded","exchange",600)
        cine(page,"stream","both")
    elif what=="r":
        cine(page,"chapter",3,"deep",600)
        cine(page,"deep","cutaway",600)
        cine(page,"deepStream","both")
    else: raise ValueError(what)
    page.wait_for_timeout(1600)
    page.evaluate("document.documentElement.scrollTop=0;document.body.scrollTop=0;")
    page.wait_for_timeout(250)
    info=page.evaluate("""() => ({
         ready:window.__siteFilm.ready(),
         title:document.getElementById("view-name")?.textContent,
         canvas:document.querySelector("#model canvas")?.getBoundingClientRect().toJSON(),
         viewport:[innerWidth,innerHeight],
         visible:!document.getElementById("model").hidden,
         legend:document.querySelector(".legend")?.innerText
    })""")
    print("READY",name, json.dumps(info), "errors:",errors[:2],flush=True)
    assert info["ready"] and info["visible"] and info["canvas"] and info["canvas"]["height"]>300
    if what=="e": assert "EXPLODED" in info["title"].upper(),info
    if what=="r": assert "CUTAWAY" in info["title"].upper(),info
    if w<600: assert info["viewport"][0]<600
    # Static QA preview before film; separate from captured segment.
    page.screenshot(path=str(OUT/(name+"_QA.png")),timeout=35000,animations="allow")
    # Capture continuous actual WebGL motion without precomputed stills.
    page.wait_for_timeout(int(d*1000))
    # Slight head hold avoids last-frame truncation at renderer shutdown.
    page.wait_for_timeout(280)
    film=page.video
    page.close();ctx.close();c.close()
    path=Path(film.path())
    if not path.exists(): raise RuntimeError("Browser capture missing "+name)
    raw_length=duration(path)
    ss=max(0,raw_length-d-.28)
    actual=min(d,raw_length-ss-.05)
    dest=OUT/(name+".mp4")
    cmd(["ffmpeg","-hide_banner","-loglevel","error","-y","-ss",f"{ss:.3f}",
        "-i",str(path),"-t",f"{actual:.3f}","-an","-r","30","-c:v","libx264",
        "-preset","veryfast","-crf","18","-pix_fmt","yuv420p",str(dest)])
    print("CAPTURE",name,"raw",round(raw_length,2),"trim",round(duration(dest),2),"bytes",dest.stat().st_size,flush=True)
    return {"file":name,"source_duration":raw_length,"trim_duration":duration(dest),"ui":info,"errors":errors}

def main():
    meta=[]
    with sync_playwright() as p:
        for spec in SPECS:
            meta.append(capture(p,spec))
    (OUT/"capture_manifest.json").write_text(json.dumps(meta,indent=2))
    print("ALL WEBSITE-ONLY CLIPS READY",flush=True)
if __name__=="__main__":
    try:main()
    except Exception:
        print(traceback.format_exc(),flush=True)
        sys.exit(1)
