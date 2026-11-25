# Pruebas funcionales (E2E)

Ejecutan los 13 casos de prueba (CP-01 a CP-13) sobre la versión web de la app con emulación móvil.

```bash
pip install playwright && python -m playwright install chromium
# Debug: en otra terminal ->  npx expo start --web --port 8081
python e2e.py http://localhost:8081 debug resultados-debug
# Release: npx expo export --platform web  y servir la carpeta dist (con respaldo a index.html)
python e2e.py http://localhost:8090 release resultados-release
```

Cada ejecución guarda capturas, `resultados.json` y `consola.json`. Las pruebas usan el modo demostración
(sin archivo `.env`). `geo_mock.js` simula un navegador cuyo permiso de ubicación está «por preguntar» y que el usuario rechaza (CP-08).
