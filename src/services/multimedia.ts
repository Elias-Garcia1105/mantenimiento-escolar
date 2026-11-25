/**
 * Captura y selección de fotografías.
 * Después de obtener la imagen se redimensiona y comprime para reducir el consumo
 * de datos al subirla a la nube (máx. 1280 px de ancho, calidad JPEG 60 %).
 */
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { log } from './logger';
import { consultarPermiso, solicitarPermiso, type TipoPermiso } from './permisos';
import type { Foto } from '@/types';

const ANCHO_MAXIMO = 1280;

export type ResultadoFoto =
  | { ok: true; foto: Foto }
  | { ok: false; motivo: 'cancelado' }
  | { ok: false; motivo: 'permiso_denegado'; puedePreguntar: boolean }
  | { ok: false; motivo: 'error'; mensaje: string };

async function asegurarPermiso(tipo: TipoPermiso) {
  let info = await consultarPermiso(tipo);
  if (info.estado === 'sin_solicitar' || (info.estado === 'denegado' && info.puedePreguntar)) {
    info = await solicitarPermiso(tipo);
  }
  return info;
}

async function optimizar(asset: ImagePicker.ImagePickerAsset): Promise<Foto> {
  const contexto = ImageManipulator.manipulate(asset.uri);
  if (asset.width > ANCHO_MAXIMO) contexto.resize({ width: ANCHO_MAXIMO });
  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  log.info('foto', 'Imagen optimizada', {
    original: `${asset.width}x${asset.height}`,
    final: `${resultado.width}x${resultado.height}`,
    kb: resultado.base64 ? Math.round((resultado.base64.length * 3) / 4 / 1024) : null,
  });
  return { uri: resultado.uri, base64: resultado.base64 ?? null, ancho: resultado.width, alto: resultado.height };
}

export async function obtenerFoto(origen: 'camara' | 'galeria'): Promise<ResultadoFoto> {
  try {
    const permiso = await asegurarPermiso(origen);
    if (permiso.estado === 'denegado') {
      log.warn('foto', `Permiso de ${origen} denegado`, { puedePreguntar: permiso.puedePreguntar });
      return { ok: false, motivo: 'permiso_denegado', puedePreguntar: permiso.puedePreguntar };
    }

    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false };
    const resultado =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync(opciones)
        : await ImagePicker.launchImageLibraryAsync(opciones);

    if (resultado.canceled || !resultado.assets?.[0]) {
      log.info('foto', `Selección cancelada (${origen})`);
      return { ok: false, motivo: 'cancelado' };
    }

    const foto = await optimizar(resultado.assets[0]);
    log.info('foto', `Fotografía adjuntada desde ${origen}`);
    return { ok: true, foto };
  } catch (e) {
    log.error('foto', `Error al obtener la fotografía (${origen})`, e);
    return { ok: false, motivo: 'error', mensaje: 'No se pudo obtener la fotografía. Inténtalo de nuevo.' };
  }
}
