import type { EstadoReporte, NuevoReporte, Reporte, Usuario } from '@/types';

/**
 * Contrato que implementan los dos orígenes de datos de la app:
 *  - SupabaseBackend: servicio en la nube (producción).
 *  - DemoBackend: datos locales para pruebas sin conexión.
 * Las pantallas solo conocen esta interfaz, nunca la implementación concreta.
 */
export interface Backend {
  iniciarSesion(correo: string, contrasena: string): Promise<Usuario>;
  cerrarSesion(): Promise<void>;
  sesionActual(): Promise<Usuario | null>;
  listarReportes(usuario: Usuario): Promise<Reporte[]>;
  obtenerReporte(id: string): Promise<Reporte | null>;
  crearReporte(usuario: Usuario, datos: NuevoReporte): Promise<Reporte>;
  actualizarEstado(id: string, estado: EstadoReporte, comentario: string | null): Promise<Reporte>;
}

/** Error con mensaje listo para mostrarse al usuario. */
export class ErrorApp extends Error {
  constructor(
    message: string,
    public readonly codigo: 'credenciales' | 'red' | 'permiso' | 'validacion' | 'desconocido' = 'desconocido',
  ) {
    super(message);
    this.name = 'ErrorApp';
  }
}
