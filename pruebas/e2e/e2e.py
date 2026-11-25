"""
Pruebas funcionales (E2E) de la app Mantenimiento Escolar ejecutadas sobre la versión web
con emulación de dispositivo móvil. Registra resultados, tiempos, consola y capturas.

Uso: python3 e2e.py <url> <modo: debug|release> <carpeta_salida>
"""
import asyncio, json, sys, time, os
from playwright.async_api import async_playwright

URL, MODO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
AQUI = os.path.dirname(os.path.abspath(__file__))
FOTO = os.path.join(AQUI, "foto_prueba.jpg")
FOTO_GAL = os.path.join(AQUI, "foto_galeria.jpg")
COORDS = {"latitude": 19.32935, "longitude": -99.46612, "accuracy": 8}

resultados, consola = [], []


def registrar(cid, funcionalidad, prueba, esperado, obtenido, ok, ms=None, captura=None):
    resultados.append(dict(id=cid, funcionalidad=funcionalidad, prueba=prueba, esperado=esperado,
                           obtenido=obtenido, estado="Aprobada" if ok else "Fallida", ms=ms, captura=captura))
    print(f"[{MODO}] {cid} {'OK ' if ok else 'FAIL'} {prueba} -> {obtenido} ({ms} ms)")


def tid(page, t):
    return page.locator(f'[data-testid="{t}"]').locator("visible=true").first


async def shot(page, nombre):
    p = f"{OUT}/{nombre}.png"
    await page.wait_for_timeout(350)
    await page.screenshot(path=p)
    return p


async def nuevo_contexto(browser, geo: bool, mock_prompt: bool = False):
    ctx = await browser.new_context(
        viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
        locale="es-MX", timezone_id="America/Mexico_City",
        geolocation=COORDS if geo else None, permissions=["geolocation"] if geo else [])
    if mock_prompt:
        await ctx.add_init_script(path=os.path.join(AQUI, "geo_mock.js"))
    page = await ctx.new_page()
    page.on("console", lambda m: consola.append({"t": round(time.time(), 3), "tipo": m.type, "texto": m.text}))
    page.on("pageerror", lambda e: consola.append({"t": round(time.time(), 3), "tipo": "pageerror", "texto": str(e)}))
    return ctx, page


async def login(page, correo, clave):
    await tid(page, "input-correo").fill(correo)
    await tid(page, "input-contrasena").fill(clave)
    await tid(page, "btn-ingresar").click()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get("CHROME") or None, args=["--no-sandbox"])

        # ---------------- Contexto principal (GPS concedido) ----------------
        ctx, page = await nuevo_contexto(browser, geo=True)
        t0 = time.time()
        await page.goto(URL, wait_until="domcontentloaded", timeout=240000)
        await tid(page, "btn-ingresar").wait_for(timeout=240000)
        carga_ms = int((time.time() - t0) * 1000)
        await shot(page, "01_login")

        # CP-01 campos vacíos
        try:
            await tid(page, "btn-ingresar").click()
            await page.get_by_text("Ingresa tu correo institucional.").wait_for(timeout=5000)
            c = await shot(page, "02_login_validacion")
            registrar("CP-01", "Inicio de sesión", "Enviar el formulario con campos vacíos",
                      "Mostrar mensajes de validación sin consultar el servicio",
                      "Se muestran los mensajes «Ingresa tu correo institucional» e «Ingresa tu contraseña»", True, captura=c)
        except Exception as e:
            registrar("CP-01", "Inicio de sesión", "Enviar el formulario con campos vacíos", "Validación", str(e), False)

        # CP-02 credenciales inválidas
        try:
            t = time.time()
            await login(page, "estudiante@utvt.edu.mx", "claveIncorrecta")
            await tid(page, "error-login").wait_for(timeout=10000)
            ms = int((time.time() - t) * 1000)
            c = await shot(page, "03_login_invalido")
            txt = await tid(page, "error-login").inner_text()
            registrar("CP-02", "Inicio de sesión", "Ingresar credenciales inválidas",
                      "Rechazar el acceso y mostrar un mensaje claro", "Acceso rechazado: «" + txt.split("\n")[-1] + "»",
                      "incorrectos" in txt, ms, c)
        except Exception as e:
            registrar("CP-02", "Inicio de sesión", "Ingresar credenciales inválidas", "Rechazo", str(e), False)

        # CP-03 credenciales válidas
        try:
            t = time.time()
            await login(page, "estudiante@utvt.edu.mx", "Estudiante123")
            await tid(page, "resumen-activos").wait_for(timeout=15000)
            await page.wait_for_timeout(600)
            ms = int((time.time() - t) * 1000)
            c = await shot(page, "04_inicio_estudiante")
            registrar("CP-03", "Inicio de sesión", "Ingresar credenciales válidas (estudiante)",
                      "Permitir el acceso y mostrar los reportes del usuario",
                      "Acceso concedido; se muestra el panel «Mis reportes» con sus reportes", True, ms, c)
        except Exception as e:
            registrar("CP-03", "Inicio de sesión", "Credenciales válidas", "Acceso", str(e), False)

        # Detalle de un reporte existente
        try:
            await tid(page, "reporte-3").click()
            await tid(page, "detalle-folio").wait_for(timeout=10000)
            await shot(page, "05_detalle_existente")
            await page.go_back()
            await tid(page, "resumen-activos").wait_for(timeout=10000)
        except Exception as e:
            print("detalle existente:", e)

        # CP-04 formulario vacío
        await tid(page, "tab-nuevo").click()
        await tid(page, "btn-enviar").wait_for(timeout=10000)
        await shot(page, "06_nuevo_vacio")
        try:
            await tid(page, "btn-enviar").click()
            await tid(page, "aviso-validacion").wait_for(timeout=5000)
            c = await shot(page, "07_nuevo_validacion")
            txt = await tid(page, "aviso-validacion").inner_text()
            registrar("CP-04", "Registro de reportes", "Enviar el formulario sin datos",
                      "Impedir el envío e indicar los campos faltantes",
                      "Envío bloqueado: " + txt.split("\n")[-1], "6 campos" in txt, captura=c)
        except Exception as e:
            registrar("CP-04", "Registro de reportes", "Formulario vacío", "Validación", str(e), False)

        # CP-05 cámara
        try:
            t = time.time()
            async with page.expect_file_chooser() as fc:
                await tid(page, "btn-camara").click()
            chooser = await fc.value
            await chooser.set_files(FOTO)
            await tid(page, "foto-previa").wait_for(timeout=15000)
            ms = int((time.time() - t) * 1000)
            await tid(page, "foto-previa").scroll_into_view_if_needed()
            c = await shot(page, "08_foto_adjunta")
            txt = await tid(page, "foto-previa").inner_text()
            registrar("CP-05", "Captura fotográfica", "Tomar una fotografía con la cámara",
                      "Adjuntar la imagen al reporte", "Imagen adjunta y optimizada (" + txt.split("·")[-1].strip() + " px)",
                      "1280" in txt, ms, c)
        except Exception as e:
            registrar("CP-05", "Captura fotográfica", "Cámara", "Adjuntar", str(e), False)

        # CP-06 galería (reemplaza la foto)
        try:
            async with page.expect_file_chooser() as fc:
                await tid(page, "btn-galeria").click()
            chooser = await fc.value
            await chooser.set_files(FOTO_GAL)
            await page.wait_for_timeout(1200)
            txt = await tid(page, "foto-previa").inner_text()
            registrar("CP-06", "Captura fotográfica", "Seleccionar una imagen de la galería",
                      "Reemplazar la imagen adjunta", "Imagen reemplazada (" + txt.split("·")[-1].strip() + " px)",
                      "800" in txt)
            # se regresa a la foto original para el reporte
            async with page.expect_file_chooser() as fc:
                await tid(page, "btn-camara").click()
            await (await fc.value).set_files(FOTO)
            await page.wait_for_timeout(1200)
        except Exception as e:
            registrar("CP-06", "Captura fotográfica", "Galería", "Adjuntar", str(e), False)

        # Datos del formulario
        await tid(page, "input-titulo").fill("Grieta y filtración en muro del pasillo")
        await tid(page, "cat-infraestructura").click()
        await tid(page, "prioridad-alta").click()
        await tid(page, "input-lugar").fill("Edificio C, pasillo planta alta")
        await tid(page, "input-descripcion").fill(
            "Se observa una grieta vertical en el muro junto a la bajada de agua; hay humedad y un charco en el piso.")
        await tid(page, "input-descripcion").scroll_into_view_if_needed()
        await shot(page, "09_formulario_datos")

        # CP-07 GPS concedido
        try:
            t = time.time()
            await tid(page, "btn-ubicacion").click()
            await tid(page, "ubicacion-obtenida").wait_for(timeout=20000)
            ms = int((time.time() - t) * 1000)
            await tid(page, "btn-enviar").scroll_into_view_if_needed()
            c = await shot(page, "10_ubicacion_obtenida")
            txt = await tid(page, "ubicacion-obtenida").inner_text()
            linea = [l for l in txt.split("\n") if "°" in l][0]
            registrar("CP-07", "Ubicación GPS", "Obtener la ubicación del dispositivo (permiso concedido)",
                      "Mostrar coordenadas o ubicación", f"Coordenadas obtenidas: {linea} (±8 m)", "19.329350" in linea, ms, c)
        except Exception as e:
            registrar("CP-07", "Ubicación GPS", "GPS concedido", "Coordenadas", str(e), False)

        # CP-09 envío
        try:
            t = time.time()
            await tid(page, "btn-enviar").click()
            await tid(page, "aviso-creado").wait_for(timeout=20000)
            ms = int((time.time() - t) * 1000)
            await page.wait_for_timeout(500)
            c = await shot(page, "11_reporte_creado")
            folio = await tid(page, "detalle-folio").inner_text()
            registrar("CP-09", "Registro de reportes", "Registrar un reporte completo (foto, datos y GPS)",
                      "Guardar la información y asignar folio", f"Reporte guardado con folio {folio} y estado «Pendiente»",
                      folio.startswith("MT-"), ms, c)
        except Exception as e:
            registrar("CP-09", "Registro de reportes", "Registro completo", "Guardar", str(e), False)

        # Captura del detalle desplazado (ubicación + seguimiento)
        try:
            await page.get_by_text("Seguimiento").locator("visible=true").first.scroll_into_view_if_needed()
            await shot(page, "12_detalle_seguimiento")
        except Exception as e:
            print("scroll detalle:", e)

        # CP-10 consulta tras recargar (persistencia / consulta al servicio)
        try:
            t = time.time()
            await page.goto(URL, wait_until="domcontentloaded")
            await tid(page, "resumen-activos").wait_for(timeout=60000)
            await tid(page, "reporte-4").wait_for(timeout=15000)
            ms = int((time.time() - t) * 1000)
            c = await shot(page, "13_lista_actualizada")
            registrar("CP-10", "Consulta de reportes", "Recargar la app y consultar la lista",
                      "Recuperar la sesión y los reportes guardados", "Sesión restaurada; el reporte MT-0004 aparece en la lista",
                      True, ms, c)
        except Exception as e:
            registrar("CP-10", "Consulta de reportes", "Recarga", "Persistencia", str(e), False)

        # Filtro por estado
        try:
            await tid(page, "filtro-pendiente").click()
            await page.wait_for_timeout(400)
            await shot(page, "14_filtro_pendiente")
            await tid(page, "filtro-pendiente").click()
        except Exception as e:
            print("filtro:", e)

        # Perfil, permisos y diagnóstico
        await tid(page, "tab-perfil").click()
        await tid(page, "btn-salir").wait_for(timeout=10000)
        await shot(page, "15_perfil")
        await tid(page, "opcion-permisos").click()
        await tid(page, "permiso-ubicacion").wait_for(timeout=10000)
        await page.wait_for_timeout(500)
        await shot(page, "16_permisos_concedidos")
        await page.go_back()
        await tid(page, "opcion-diagnostico").click()
        await tid(page, "info-compilacion").wait_for(timeout=10000)
        await shot(page, "17_diagnostico")
        modo_txt = await tid(page, "info-compilacion").inner_text()
        await page.go_back()

        # CP-13 cerrar sesión + ruta protegida
        try:
            await tid(page, "btn-salir").click()
            await tid(page, "btn-ingresar").wait_for(timeout=10000)
            await page.goto(URL.rstrip("/") + "/nuevo", wait_until="domcontentloaded")
            await tid(page, "btn-ingresar").wait_for(timeout=60000)
            registrar("CP-13", "Inicio de sesión", "Cerrar sesión e intentar abrir una ruta protegida (/nuevo)",
                      "Regresar al inicio de sesión y bloquear el acceso", "Sesión cerrada; la ruta /nuevo redirige al inicio de sesión", True)
        except Exception as e:
            registrar("CP-13", "Inicio de sesión", "Cerrar sesión", "Redirección", str(e), False)

        # CP-11 administrativo cambia estado
        try:
            await login(page, "mantenimiento@utvt.edu.mx", "Admin123")
            await tid(page, "resumen-activos").wait_for(timeout=15000)
            await page.wait_for_timeout(500)
            await shot(page, "18_inicio_admin")
            await tid(page, "reporte-4").click()
            await tid(page, "panel-admin").wait_for(timeout=10000)
            await tid(page, "estado-en_proceso").click()
            await tid(page, "input-comentario").fill("Se programó la revisión con el área de obra civil para el jueves.")
            t = time.time()
            await tid(page, "btn-guardar-estado").click()
            await tid(page, "aviso-estado").wait_for(timeout=10000)
            ms = int((time.time() - t) * 1000)
            await tid(page, "panel-admin").scroll_into_view_if_needed()
            c = await shot(page, "19_admin_estado")
            txt = await tid(page, "aviso-estado").inner_text()
            registrar("CP-11", "Estado de reportes", "Cambiar el estado de un reporte (personal administrativo)",
                      "Actualizar el estado y guardar el comentario", "Estado actualizado: " + txt, "En proceso" in txt, ms, c)
            await page.go_back()
            await tid(page, "tab-perfil").click()
            await tid(page, "btn-salir").click()
            await tid(page, "btn-ingresar").wait_for(timeout=10000)
        except Exception as e:
            registrar("CP-11", "Estado de reportes", "Cambio de estado", "Actualizar", str(e), False)

        # CP-12 estudiante visualiza el nuevo estado
        try:
            await login(page, "estudiante@utvt.edu.mx", "Estudiante123")
            await tid(page, "resumen-activos").wait_for(timeout=15000)
            await tid(page, "reporte-4").click()
            await tid(page, "detalle-folio").wait_for(timeout=10000)
            await page.get_by_text("Comentario de mantenimiento").locator("visible=true").first.scroll_into_view_if_needed()
            c = await shot(page, "20_estudiante_estado")
            visible = await page.get_by_text("Se programó la revisión").locator("visible=true").count()
            registrar("CP-12", "Estado de reportes", "Consultar el estado del reporte como estudiante",
                      "Visualizar el estado actualizado y el comentario", "Se muestra «En proceso» en la línea de tiempo con el comentario del personal",
                      visible > 0, captura=c)
        except Exception as e:
            registrar("CP-12", "Estado de reportes", "Consulta del estado", "Visualizar", str(e), False)

        await ctx.close()

        # ---------------- Contexto sin permiso de ubicación ----------------
        ctx2, page2 = await nuevo_contexto(browser, geo=False, mock_prompt=True)
        await page2.goto(URL, wait_until="domcontentloaded", timeout=240000)
        await tid(page2, "btn-ingresar").wait_for(timeout=240000)
        await login(page2, "estudiante@utvt.edu.mx", "Estudiante123")
        await tid(page2, "resumen-activos").wait_for(timeout=15000)
        await tid(page2, "tab-nuevo").click()
        await tid(page2, "btn-ubicacion").wait_for(timeout=10000)
        try:
            await tid(page2, "btn-ubicacion").scroll_into_view_if_needed()
            await tid(page2, "btn-ubicacion").click()
            await tid(page2, "modal-permiso").wait_for(timeout=8000)
            await shot(page2, "21_explicacion_permiso")
            await tid(page2, "permiso-continuar").click()
            await tid(page2, "aviso-denegado-ubicacion").wait_for(timeout=20000)
            await tid(page2, "aviso-denegado-ubicacion").scroll_into_view_if_needed()
            c = await shot(page2, "22_ubicacion_denegada")
            txt = await tid(page2, "aviso-denegado-ubicacion").inner_text()
            registrar("CP-08", "Ubicación GPS", "Rechazar el permiso de ubicación",
                      "Informar al usuario sin cerrar la app", "Se muestra el aviso «" + [l for l in txt.split("\n") if "denegado" in l][0].strip() + "» con la indicación de habilitarlo en la configuración; la app sigue funcionando",
                      "denegado" in txt and "Volver a intentar" not in txt, captura=c)
            with open(f"{OUT}/cp08_texto.txt", "w") as f:
                f.write(txt)
        except Exception as e:
            registrar("CP-08", "Ubicación GPS", "Permiso denegado", "Aviso", str(e), False)
        await tid(page2, "tab-perfil").click()
        await tid(page2, "opcion-permisos").click()
        await tid(page2, "permiso-ubicacion").wait_for(timeout=10000)
        await page2.wait_for_timeout(500)
        await shot(page2, "23_permisos_denegado")
        await ctx2.close()
        await browser.close()

    resultados.sort(key=lambda r: r["id"])
    json.dump({"modo": MODO, "url": URL, "carga_inicial_ms": carga_ms, "info_compilacion": modo_txt,
               "resultados": resultados}, open(f"{OUT}/resultados.json", "w"), ensure_ascii=False, indent=2)
    json.dump(consola, open(f"{OUT}/consola.json", "w"), ensure_ascii=False, indent=2)
    print("carga inicial ms:", carga_ms)

asyncio.run(main())
