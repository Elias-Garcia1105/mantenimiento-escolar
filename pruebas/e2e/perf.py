import asyncio, json, os, sys, time, statistics
from playwright.async_api import async_playwright
async def medir(browser, url):
    ctx = await browser.new_context(viewport={"width":390,"height":844}, is_mobile=True)
    page = await ctx.new_page()
    total = {"js":0,"todo":0,"peticiones":0}
    async def on_resp(r):
        try:
            b = await r.body(); total["todo"] += len(b); total["peticiones"] += 1
            if ".js" in r.url or "bundle" in r.url: total["js"] += len(b)
        except Exception: pass
    page.on("response", lambda r: asyncio.ensure_future(on_resp(r)))
    t=time.time(); await page.goto(url, wait_until="domcontentloaded")
    await page.locator('[data-testid="btn-ingresar"]').wait_for(timeout=240000)
    ms=(time.time()-t)*1000
    await page.wait_for_timeout(1500)
    heap = await page.evaluate("performance.memory ? performance.memory.usedJSHeapSize : null")
    await ctx.close()
    return ms, total, heap
async def main():
    out={}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME") or None, args=["--no-sandbox","--enable-precise-memory-info"])
        for nombre,url in [("debug","http://localhost:8081"),("release","http://localhost:8090")]:
            await medir(b,url)  # calentamiento
            ms=[];tot=None;heaps=[]
            for _ in range(5):
                m,t,h=await medir(b,url); ms.append(m); tot=t; heaps.append(h)
            out[nombre]={"carga_ms_mediana":round(statistics.median(ms)),"carga_ms":[round(x) for x in ms],
                         "js_kb":round(tot["js"]/1024),"total_kb":round(tot["todo"]/1024),"peticiones":tot["peticiones"],
                         "heap_mb":round(statistics.median(heaps)/1048576,1) if heaps[0] else None}
        await b.close()
    json.dump(out, open("perf.json","w"), indent=2); print(json.dumps(out, indent=2))
asyncio.run(main())
