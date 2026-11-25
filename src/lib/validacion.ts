/**
 * Reglas de validación del lado del cliente.
 * Son funciones puras para poder probarlas con Jest sin depender de la interfaz.
 */
import type { NuevoReporte } from '@/types';

export type Errores<T extends string> = Partial<Record<T, string>>;

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarLogin(correo: string, contrasena: string): Errores<'correo' | 'contrasena'> {
  const errores: Errores<'correo' | 'contrasena'> = {};
  const c = correo.trim();

  if (!c) errores.correo = 'Ingresa tu correo institucional.';
  else if (!CORREO_REGEX.test(c)) errores.correo = 'El formato del correo no es válido.';

  if (!contrasena) errores.contrasena = 'Ingresa tu contraseña.';
  else if (contrasena.length < 6) errores.contrasena = 'La contraseña debe tener al menos 6 caracteres.';

  return errores;
}

export type CampoReporte = 'titulo' | 'descripcion' | 'categoria' | 'lugar' | 'foto' | 'ubicacion';

export const LIMITES = {
  tituloMin: 5,
  tituloMax: 80,
  descripcionMin: 10,
  descripcionMax: 500,
  lugarMax: 60,
} as const;

export function validarReporte(r: NuevoReporte): Errores<CampoReporte> {
  const errores: Errores<CampoReporte> = {};
  const titulo = r.titulo.trim();
  const descripcion = r.descripcion.trim();
  const lugar = r.lugar.trim();

  if (titulo.length < LIMITES.tituloMin)
    errores.titulo = `Escribe un título de al menos ${LIMITES.tituloMin} caracteres.`;
  else if (titulo.length > LIMITES.tituloMax)
    errores.titulo = `El título no debe superar ${LIMITES.tituloMax} caracteres.`;

  if (descripcion.length < LIMITES.descripcionMin)
    errores.descripcion = `Describe el problema con al menos ${LIMITES.descripcionMin} caracteres.`;
  else if (descripcion.length > LIMITES.descripcionMax)
    errores.descripcion = `La descripción no debe superar ${LIMITES.descripcionMax} caracteres.`;

  if (!r.categoria) errores.categoria = 'Selecciona una categoría.';

  if (!lugar) errores.lugar = 'Indica el edificio, aula o área.';
  else if (lugar.length > LIMITES.lugarMax) errores.lugar = `Máximo ${LIMITES.lugarMax} caracteres.`;

  if (!r.foto) errores.foto = 'Adjunta una fotografía como evidencia.';
  if (!r.ubicacion) errores.ubicacion = 'Obtén la ubicación GPS del reporte.';

  return errores;
}

export const tieneErrores = (e: object) => Object.keys(e).length > 0;

/** Formatea coordenadas a 6 decimales (≈ 0.11 m de resolución). */
export function formatoCoordenadas(lat: number, lng: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const eo = lng >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(6)}° ${ns}, ${Math.abs(lng).toFixed(6)}° ${eo}`;
}

export function formatoFecha(iso: string, conHora = true) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fecha = `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  if (!conHora) return fecha;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fecha}, ${hh}:${mm}`;
}

export function tiempoRelativo(iso: string, ahora = Date.now()) {
  const diff = Math.max(0, ahora - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return formatoFecha(iso, false);
}

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter((p) => p && !p.endsWith('.'))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
