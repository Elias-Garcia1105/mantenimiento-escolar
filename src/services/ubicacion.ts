/**
 * Obtención de la ubicación GPS del reporte (solo en primer plano).
 */
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { log } from './logger';
import { consultarPermiso, solicitarPermiso } from './permisos';
import type { Ubicacion } from '@/types';

const TIEMPO_LIMITE_MS = 15000;

export type ResultadoUbicacion =
  | { ok: true; ubicacion: Ubicacion }
  | { ok: false; motivo: 'permiso_denegado'; puedePreguntar: boolean }
  | { ok: false; motivo: 'servicios_apagados' | 'sin_senal' | 'error'; mensaje: string };

function conTiempoLimite<T>(promesa: Promise<T>, ms: number) {
  return Promise.race([
    promesa,
    new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('TIEMPO_AGOTADO')), ms)),
  ]);
}

async function direccionAproximada(lat: number, lng: number): Promise<string | null> {
  if (Platform.OS === 'web') return null; // La geocodificación inversa no está disponible en web.
  try {
    const [d] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!d) return null;
    return [d.street && `${d.street}${d.streetNumber ? ` ${d.streetNumber}` : ''}`, d.district, d.city ?? d.subregion]
      .filter(Boolean)
      .join(', ');
  } catch (e) {
    log.warn('gps', 'No se pudo obtener la dirección aproximada', e);
    return null;
  }
}

export async function obtenerUbicacion(): Promise<ResultadoUbicacion> {
  try {
    let permiso = await consultarPermiso('ubicacion');
    if (permiso.estado === 'sin_solicitar' || (permiso.estado === 'denegado' && permiso.puedePreguntar)) {
      permiso = await solicitarPermiso('ubicacion');
    }
    if (permiso.estado === 'denegado') {
      log.warn('gps', 'Permiso de ubicación denegado', { puedePreguntar: permiso.puedePreguntar });
      return { ok: false, motivo: 'permiso_denegado', puedePreguntar: permiso.puedePreguntar };
    }

    const serviciosActivos = await Location.hasServicesEnabledAsync();
    if (!serviciosActivos) {
      log.warn('gps', 'Los servicios de ubicación del dispositivo están apagados');
      return { ok: false, motivo: 'servicios_apagados', mensaje: 'Activa la ubicación (GPS) de tu dispositivo.' };
    }

    log.info('gps', 'Solicitando posición actual (precisión alta)');
    let posicion: Location.LocationObject | null = null;
    try {
      posicion = await conTiempoLimite(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        TIEMPO_LIMITE_MS,
      );
    } catch (e) {
      log.warn('gps', 'No se obtuvo posición actual, se usará la última conocida', e);
      posicion = await Location.getLastKnownPositionAsync();
    }

    if (!posicion) {
      return { ok: false, motivo: 'sin_senal', mensaje: 'No se pudo obtener señal GPS. Intenta en un lugar abierto.' };
    }

    const { latitude, longitude, accuracy } = posicion.coords;
    const ubicacion: Ubicacion = {
      latitud: latitude,
      longitud: longitude,
      precision: accuracy != null ? Math.round(accuracy) : null,
      direccion: await direccionAproximada(latitude, longitude),
      obtenidaEn: new Date(posicion.timestamp).toISOString(),
    };
    log.info('gps', 'Ubicación obtenida', { lat: latitude.toFixed(6), lng: longitude.toFixed(6), precision: ubicacion.precision });
    return { ok: true, ubicacion };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    log.error('gps', 'Error al obtener la ubicación', e);
    if (/denied|permission/i.test(mensaje)) return { ok: false, motivo: 'permiso_denegado', puedePreguntar: false };
    return { ok: false, motivo: 'error', mensaje: 'Ocurrió un error al leer el GPS. Inténtalo de nuevo.' };
  }
}

export const urlMapa = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
