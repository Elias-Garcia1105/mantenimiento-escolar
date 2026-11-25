import { crearDemoBackend, USUARIOS_DEMO } from '@/services/backend/demo-backend';
import type { NuevoReporte } from '@/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const backend = crearDemoBackend(0);
const [estudiante, admin] = USUARIOS_DEMO.map(({ contrasena: _c, ...u }) => u);

const datos: NuevoReporte = {
  titulo: 'Contacto eléctrico dañado',
  descripcion: 'El contacto junto al pizarrón está suelto y echa chispas.',
  categoria: 'electrico',
  prioridad: 'alta',
  lugar: 'Edificio A, aula 3',
  ubicacion: { latitud: 19.33, longitud: -99.46, precision: 10, obtenidaEn: new Date().toISOString() },
  foto: { uri: 'file:///x.jpg', base64: 'QUJD', ancho: 1280, alto: 960 },
};

describe('Servicio de datos (modo demostración)', () => {
  it('rechaza credenciales inválidas', async () => {
    await expect(backend.iniciarSesion('estudiante@utvt.edu.mx', 'mala')).rejects.toThrow('Correo o contraseña incorrectos.');
  });

  it('inicia sesión y la conserva', async () => {
    const u = await backend.iniciarSesion('ESTUDIANTE@utvt.edu.mx ', 'Estudiante123');
    expect(u.rol).toBe('estudiante');
    expect(u).not.toHaveProperty('contrasena');
    expect(await backend.sesionActual()).toEqual(u);
  });

  it('el estudiante solo ve sus propios reportes', async () => {
    const propios = await backend.listarReportes(estudiante!);
    const todos = await backend.listarReportes(admin!);
    expect(propios.every((r) => r.creadoPor === estudiante!.id)).toBe(true);
    expect(todos.length).toBeGreaterThan(propios.length);
  });

  it('registra un reporte con folio consecutivo y estado pendiente', async () => {
    const antes = await backend.listarReportes(admin!);
    const nuevo = await backend.crearReporte(estudiante!, datos);
    expect(nuevo.folio).toBe(Math.max(...antes.map((r) => r.folio)) + 1);
    expect(nuevo.estado).toBe('pendiente');
    expect(nuevo.fotoUrl).toBe('data:image/jpeg;base64,QUJD');
    expect(nuevo.ubicacion?.latitud).toBe(19.33);
  });

  it('actualiza el estado y lo refleja al consultar', async () => {
    const [ultimo] = await backend.listarReportes(estudiante!);
    await backend.actualizarEstado(ultimo!.id, 'resuelto', 'Se reemplazó el contacto.');
    const consultado = await backend.obtenerReporte(ultimo!.id);
    expect(consultado?.estado).toBe('resuelto');
    expect(consultado?.comentarioAtencion).toBe('Se reemplazó el contacto.');
  });

  it('cierra la sesión', async () => {
    await backend.cerrarSesion();
    expect(await backend.sesionActual()).toBeNull();
  });
});
