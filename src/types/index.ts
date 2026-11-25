/** Tipos de dominio compartidos por toda la aplicación. */

export type Rol = 'estudiante' | 'administrativo';

export type EstadoReporte = 'pendiente' | 'en_proceso' | 'resuelto';

export type Prioridad = 'baja' | 'media' | 'alta';

export type Categoria =
  | 'electrico'
  | 'plomeria'
  | 'mobiliario'
  | 'computo'
  | 'infraestructura'
  | 'limpieza'
  | 'otro';

export interface Usuario {
  id: string;
  correo: string;
  nombre: string;
  rol: Rol;
}

export interface Ubicacion {
  latitud: number;
  longitud: number;
  /** Precisión horizontal en metros reportada por el GPS. */
  precision: number | null;
  /** Dirección aproximada (solo disponible en Android/iOS). */
  direccion?: string | null;
  obtenidaEn: string;
}

export interface Foto {
  /** URI local (file://, content:// o data:) lista para mostrarse o subirse. */
  uri: string;
  base64?: string | null;
  ancho: number;
  alto: number;
}

export interface Reporte {
  id: string;
  folio: number;
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  prioridad: Prioridad;
  lugar: string;
  ubicacion: Ubicacion | null;
  fotoUrl: string | null;
  estado: EstadoReporte;
  comentarioAtencion: string | null;
  creadoPor: string;
  creadoPorNombre: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface NuevoReporte {
  titulo: string;
  descripcion: string;
  categoria: Categoria | null;
  prioridad: Prioridad;
  lugar: string;
  ubicacion: Ubicacion | null;
  foto: Foto | null;
}
