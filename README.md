# Mantenimiento Escolar · App móvil

Aplicación móvil para registrar y dar seguimiento a **reportes de mantenimiento escolar**.
Desarrollada con **React Native + Expo (SDK 58)**, **Expo Router** y **Supabase** como servicio en la nube.

| Funcionalidad | Implementación |
|---|---|
| Inicio de sesión | Supabase Auth (correo y contraseña) |
| Registro de reportes | Formulario validado → tabla `reportes` (PostgreSQL) |
| Captura y adjunto de fotografías | `expo-image-picker` (cámara o galería) + `expo-image-manipulator` (1280 px, JPEG 60 %) |
| Ubicación GPS | `expo-location` (solo en primer plano, precisión alta) |
| Envío y consulta en la nube | `@supabase/supabase-js` + Storage (bucket privado `evidencias`) |
| Estado de los reportes | Pendiente → En proceso → Resuelto (lo cambia el personal administrativo) |

## 1. Requisitos

- Node.js 20 o superior y npm.
- Teléfono Android con **Expo Go** (versión compatible con SDK 58) o un emulador.
- Cuenta gratuita en [Supabase](https://supabase.com) (opcional: sin ella la app funciona en *modo demostración*).
- Cuenta gratuita en [Expo](https://expo.dev) para compilar con EAS Build.

## 2. Instalación y ejecución (modo Debug)

```bash
npm install
npx expo start            # escanea el QR con Expo Go
```

Otros comandos útiles:

```bash
npx expo start --no-dev --minify   # JavaScript en modo producción (similar a Release)
npm test                           # pruebas unitarias (Jest)
npm run typecheck                  # verificación de tipos (TypeScript)
npm run lint                       # análisis estático (ESLint)
npx expo-doctor                    # diagnóstico del proyecto
```

### Cuentas del modo demostración

Si no existe el archivo `.env`, la app usa datos locales y muestra estas cuentas en el inicio de sesión:

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | estudiante@utvt.edu.mx | Estudiante123 |
| Personal administrativo | mantenimiento@utvt.edu.mx | Admin123 |

## 3. Conectar el servicio en la nube (Supabase)

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**, pega el contenido de `supabase/schema.sql` y ejecútalo. Se crean las tablas, las políticas de seguridad (RLS) y el bucket privado `evidencias`.
3. En **Authentication › Users › Add user** crea los dos usuarios de prueba (marca *Auto Confirm User*) y ejecuta las dos sentencias `update` que aparecen al final de `schema.sql` para asignar nombre y rol.
4. Copia `.env.example` como `.env` y escribe la URL y la *publishable/anon key* de **Project Settings › API**.
5. Reinicia con `npx expo start --clear`. En el inicio de sesión debe aparecer «Supabase (Auth, PostgreSQL y Storage)».

> La *anon key* es pública por diseño; los datos están protegidos por las políticas RLS: cada estudiante solo ve sus reportes y únicamente el personal administrativo puede cambiar el estado.

## 4. Diagnóstico

- Pantalla **Perfil › Diagnóstico**: modo de compilación (Debug/Release), versión, Application ID y registro de eventos.
- Todos los mensajes de la app llevan la etiqueta `[MttoApp]`. En Android:

```bash
adb logcat -s ReactNativeJS:V          # mensajes de JavaScript
adb logcat *:E                          # solo errores del sistema
```

## 5. Permisos (app.json)

| Permiso Android | Uso | Configuración |
|---|---|---|
| `CAMERA` | Tomar la foto del desperfecto | `expo-image-picker` › `cameraPermission` |
| `READ/WRITE_EXTERNAL_STORAGE` (solo Android ≤ 12) | Elegir una foto de la galería | En Android 13+ se usa el selector de fotos, sin permiso |
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Coordenadas del reporte | `expo-location` › `locationWhenInUsePermission` |
| Bloqueados | `RECORD_AUDIO`, `ACCESS_BACKGROUND_LOCATION`, `SYSTEM_ALERT_WINDOW`, `VIBRATE` | `android.blockedPermissions` |

## 6. Compilación con EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure                                   # ya existe eas.json; solo vincula el proyecto
eas build --platform android --profile preview        # APK para pruebas internas
eas build --platform android --profile production     # AAB para Google Play
```

| Perfil | Formato | Uso |
|---|---|---|
| `development` | APK con *dev client* | Depuración en dispositivo |
| `preview` | **APK** | Instalación directa y pruebas internas |
| `production` | **AAB** | Publicación en Google Play |

Identificador: `mx.edu.utvt.mantenimientoescolar` · Versión `1.0.0` (versionCode `1`).

## 7. Distribución

1. Descarga el APK desde la página del build en expo.dev.
2. Crea un *release* en GitHub (`v1.0.0`) y adjunta el APK.
3. Edita `docs/index.html` (objeto `CONFIG`) con el enlace del APK y publícala con GitHub Pages (Settings › Pages › rama `main`, carpeta `/docs`).
4. Comparte el enlace o el código QR con los usuarios de prueba.

## 8. Estructura

```
src/
  app/                 Pantallas (Expo Router)
    (tabs)/            Reportes · Nuevo · Perfil
    reporte/[id].tsx   Detalle y cambio de estado
    login.tsx, permisos.tsx, diagnostico.tsx
  components/          Componentes de interfaz
  context/             Sesión (auth) y reportes
  services/            Backend (Supabase / demo), permisos, fotos, GPS, logger
  lib/validacion.ts    Reglas de validación (probadas con Jest)
supabase/schema.sql    Base de datos, RLS y Storage
docs/                  Página de descarga del APK (GitHub Pages)
__tests__/             Pruebas unitarias (Jest)
pruebas/e2e/           Pruebas funcionales automatizadas (Playwright)
supabase/pruebas/      Pruebas de las políticas RLS en PostgreSQL local
```
