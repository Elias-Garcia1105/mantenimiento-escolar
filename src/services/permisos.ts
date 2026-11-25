/**
 * Consulta y solicitud de permisos del dispositivo (cámara, fotografías y ubicación).
 *
 * Criterios de privacidad aplicados:
 *  - Los permisos se solicitan solo cuando el usuario usa la función que los necesita.
 *  - Antes de la solicitud del sistema, la app explica para qué se usa cada permiso.
 *  - Si el usuario lo rechaza, la app sigue funcionando y ofrece abrir la configuración.
 */
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

import { log } from './logger';

export type TipoPermiso = 'camara' | 'galeria' | 'ubicacion';
export type EstadoPermiso = 'concedido' | 'denegado' | 'sin_solicitar' | 'limitado' | 'no_requerido';

export interface InfoPermiso {
  tipo: TipoPermiso;
  estado: EstadoPermiso;
  /** false cuando el sistema ya no mostrará el diálogo y hay que ir a Configuración. */
  puedePreguntar: boolean;
}

type Respuesta = { status: string; granted: boolean; canAskAgain: boolean; accessPrivileges?: string };

/** En Android 13+ (API 33) el selector de fotos del sistema no requiere permiso. */
export const galeriaSinPermiso = Platform.OS === 'android' && Number(Platform.Version) >= 33;

function normalizar(tipo: TipoPermiso, r: Respuesta): InfoPermiso {
  let estado: EstadoPermiso;
  if (tipo === 'galeria' && galeriaSinPermiso) estado = 'no_requerido';
  else if (r.granted) estado = r.accessPrivileges === 'limited' ? 'limitado' : 'concedido';
  else if (r.status === 'undetermined') estado = 'sin_solicitar';
  else estado = 'denegado';
  // En web, expo-location siempre informa canAskAgain = true, pero el navegador no vuelve a
  // mostrar el diálogo después de un rechazo: el usuario debe habilitarlo en la configuración del sitio.
  const puedePreguntar = Platform.OS === 'web' && estado === 'denegado' ? false : r.canAskAgain;
  return { tipo, estado, puedePreguntar };
}

export async function consultarPermiso(tipo: TipoPermiso): Promise<InfoPermiso> {
  try {
    const r =
      tipo === 'camara'
        ? await ImagePicker.getCameraPermissionsAsync()
        : tipo === 'galeria'
          ? await ImagePicker.getMediaLibraryPermissionsAsync()
          : await Location.getForegroundPermissionsAsync();
    return normalizar(tipo, r);
  } catch (e) {
    log.warn('permisos', `No se pudo consultar el permiso ${tipo}`, e);
    return { tipo, estado: 'sin_solicitar', puedePreguntar: true };
  }
}

export async function solicitarPermiso(tipo: TipoPermiso): Promise<InfoPermiso> {
  log.info('permisos', `Solicitando permiso: ${tipo}`);
  const r =
    tipo === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : tipo === 'galeria'
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await Location.requestForegroundPermissionsAsync();
  const info = normalizar(tipo, r);
  log.info('permisos', `Resultado del permiso ${tipo}: ${info.estado}`, { puedePreguntar: info.puedePreguntar });
  return info;
}

export async function consultarTodos(): Promise<InfoPermiso[]> {
  return Promise.all((['camara', 'galeria', 'ubicacion'] as const).map(consultarPermiso));
}

/** Abre la pantalla de configuración de la app en el sistema operativo. */
export async function abrirConfiguracion() {
  if (Platform.OS === 'web') return false;
  log.info('permisos', 'Abriendo configuración del sistema');
  await Linking.openSettings();
  return true;
}

export const TEXTO_PERMISO: Record<
  TipoPermiso,
  { titulo: string; recurso: string; uso: string; icono: 'camera-outline' | 'images-outline' | 'location-outline' }
> = {
  camara: {
    titulo: 'Cámara',
    recurso: 'la cámara',
    uso: 'Tomar una fotografía del desperfecto como evidencia del reporte.',
    icono: 'camera-outline',
  },
  galeria: {
    titulo: 'Fotografías',
    recurso: 'tus fotografías',
    uso: 'Elegir una foto existente de tu galería para adjuntarla al reporte.',
    icono: 'images-outline',
  },
  ubicacion: {
    titulo: 'Ubicación',
    recurso: 'tu ubicación',
    uso: 'Registrar las coordenadas GPS del lugar del reporte. Solo se lee cuando presionas "Obtener ubicación".',
    icono: 'location-outline',
  },
};

export const ETIQUETA_ESTADO: Record<EstadoPermiso, string> = {
  concedido: 'Concedido',
  denegado: 'Denegado',
  sin_solicitar: 'Sin solicitar',
  limitado: 'Acceso limitado',
  no_requerido: 'No requerido',
};
