/**
 * Implementación del servicio en la nube con Supabase:
 *  - Auth: inicio de sesión con correo y contraseña.
 *  - PostgreSQL: tablas `perfiles` y `reportes` protegidas con Row Level Security.
 *  - Storage: bucket privado `evidencias` para las fotografías.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { AppState, Platform } from 'react-native';

import { BUCKET_EVIDENCIAS, SUPABASE_KEY, SUPABASE_URL } from '../config';
import { log } from '../logger';
import { ErrorApp, type Backend } from './tipos';
import type { Categoria, EstadoReporte, Prioridad, Reporte, Usuario } from '@/types';

interface FilaReporte {
  id: string;
  folio: number;
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  prioridad: Prioridad;
  lugar: string;
  latitud: number | null;
  longitud: number | null;
  precision_m: number | null;
  direccion: string | null;
  ubicacion_obtenida_en: string | null;
  foto_path: string | null;
  estado: EstadoReporte;
  comentario_atencion: string | null;
  creado_por: string;
  creado_por_nombre: string | null;
  creado_en: string;
  actualizado_en: string;
}

const URL_FIRMADA_SEGUNDOS = 60 * 60;

/** Convierte cualquier error de red/Supabase en un mensaje comprensible. */
function traducirError(error: unknown, contexto: string): ErrorApp {
  const e = error as { message?: string; code?: string; status?: number };
  const msg = e?.message ?? String(error);
  log.error('supabase', `${contexto}: ${msg}`, { code: e?.code, status: e?.status });

  if (/network|fetch|timeout/i.test(msg))
    return new ErrorApp('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 'red');
  if (e?.code === 'invalid_credentials' || /invalid login credentials/i.test(msg))
    return new ErrorApp('Correo o contraseña incorrectos.', 'credenciales');
  if (e?.code === 'email_not_confirmed') return new ErrorApp('Tu cuenta aún no ha sido confirmada.', 'credenciales');
  if (e?.code === '42501' || /row-level security|permission denied/i.test(msg))
    return new ErrorApp('No tienes permiso para realizar esta acción.', 'permiso');
  return new ErrorApp(`Ocurrió un problema al ${contexto.toLowerCase()}. Inténtalo más tarde.`);
}

export function crearSupabaseBackend(): Backend {
  const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Recomendación de Supabase para apps móviles: refrescar el token solo con la app en primer plano.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (estado) => {
      if (estado === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
  }

  async function cargarPerfil(id: string, correo: string): Promise<Usuario> {
    const { data, error } = await supabase.from('perfiles').select('id, nombre, correo, rol').eq('id', id).single();
    if (error) throw traducirError(error, 'Consultar el perfil');
    return { id: data.id, correo: data.correo ?? correo, nombre: data.nombre || correo, rol: data.rol };
  }

  async function aReportes(filas: FilaReporte[]): Promise<Reporte[]> {
    const rutas = filas.map((f) => f.foto_path).filter((p): p is string => !!p);
    const urls = new Map<string, string>();
    if (rutas.length) {
      const { data, error } = await supabase.storage.from(BUCKET_EVIDENCIAS).createSignedUrls(rutas, URL_FIRMADA_SEGUNDOS);
      if (error) log.warn('supabase', 'No se pudieron firmar las URLs de las fotos', error.message);
      data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
    }
    return filas.map((f) => ({
      id: f.id,
      folio: f.folio,
      titulo: f.titulo,
      descripcion: f.descripcion,
      categoria: f.categoria,
      prioridad: f.prioridad,
      lugar: f.lugar,
      ubicacion:
        f.latitud != null && f.longitud != null
          ? {
              latitud: f.latitud,
              longitud: f.longitud,
              precision: f.precision_m,
              direccion: f.direccion,
              obtenidaEn: f.ubicacion_obtenida_en ?? f.creado_en,
            }
          : null,
      fotoUrl: f.foto_path ? (urls.get(f.foto_path) ?? null) : null,
      estado: f.estado,
      comentarioAtencion: f.comentario_atencion,
      creadoPor: f.creado_por,
      creadoPorNombre: f.creado_por_nombre ?? 'Usuario',
      creadoEn: f.creado_en,
      actualizadoEn: f.actualizado_en,
    }));
  }

  return {
    async iniciarSesion(correo, contrasena) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena });
      if (error) throw traducirError(error, 'Iniciar sesión');
      return cargarPerfil(data.user.id, data.user.email ?? correo);
    },

    async cerrarSesion() {
      const { error } = await supabase.auth.signOut();
      if (error) log.warn('supabase', 'Error al cerrar sesión', error.message);
    },

    async sesionActual() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      try {
        return await cargarPerfil(user.id, user.email ?? '');
      } catch {
        return null;
      }
    },

    async listarReportes() {
      // Row Level Security decide qué filas regresa: el estudiante solo ve las suyas.
      const { data, error } = await supabase.from('reportes').select('*').order('creado_en', { ascending: false });
      if (error) throw traducirError(error, 'Consultar los reportes');
      return aReportes(data as FilaReporte[]);
    },

    async obtenerReporte(id) {
      const { data, error } = await supabase.from('reportes').select('*').eq('id', id).maybeSingle();
      if (error) throw traducirError(error, 'Consultar el reporte');
      if (!data) return null;
      const [reporte] = await aReportes([data as FilaReporte]);
      return reporte ?? null;
    },

    async crearReporte(usuario, datos) {
      let fotoPath: string | null = null;

      if (datos.foto) {
        if (!datos.foto.base64) throw new ErrorApp('No se pudo leer la fotografía. Vuelve a seleccionarla.');
        fotoPath = `${usuario.id}/${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from(BUCKET_EVIDENCIAS)
          .upload(fotoPath, decode(datos.foto.base64), { contentType: 'image/jpeg', upsert: false });
        if (error) throw traducirError(error, 'Subir la fotografía');
        log.info('supabase', 'Fotografía subida a Storage', fotoPath);
      }

      const { data, error } = await supabase
        .from('reportes')
        .insert({
          titulo: datos.titulo.trim(),
          descripcion: datos.descripcion.trim(),
          categoria: datos.categoria,
          prioridad: datos.prioridad,
          lugar: datos.lugar.trim(),
          latitud: datos.ubicacion?.latitud ?? null,
          longitud: datos.ubicacion?.longitud ?? null,
          precision_m: datos.ubicacion?.precision ?? null,
          direccion: datos.ubicacion?.direccion ?? null,
          ubicacion_obtenida_en: datos.ubicacion?.obtenidaEn ?? null,
          foto_path: fotoPath,
        })
        .select('*')
        .single();

      if (error) {
        // Si falla el registro, se elimina la foto para no dejar archivos huérfanos.
        if (fotoPath) await supabase.storage.from(BUCKET_EVIDENCIAS).remove([fotoPath]);
        throw traducirError(error, 'Registrar el reporte');
      }
      const [reporte] = await aReportes([data as FilaReporte]);
      return reporte!;
    },

    async actualizarEstado(id, estado, comentario) {
      const { data, error } = await supabase
        .from('reportes')
        .update({ estado, comentario_atencion: comentario })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw traducirError(error, 'Actualizar el estado');
      const [reporte] = await aReportes([data as FilaReporte]);
      return reporte!;
    },
  };
}
