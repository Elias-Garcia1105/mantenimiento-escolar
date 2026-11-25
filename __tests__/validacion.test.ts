import { formatoCoordenadas, iniciales, tieneErrores, validarLogin, validarReporte } from '@/lib/validacion';
import type { NuevoReporte } from '@/types';

const reporteValido: NuevoReporte = {
  titulo: 'Fuga de agua en sanitarios',
  descripcion: 'El lavabo izquierdo gotea de forma constante.',
  categoria: 'plomeria',
  prioridad: 'alta',
  lugar: 'Edificio D, planta baja',
  ubicacion: { latitud: 19.32935, longitud: -99.46612, precision: 8, obtenidaEn: '2026-11-25T06:00:00.000Z' },
  foto: { uri: 'file:///foto.jpg', base64: 'AAA', ancho: 1280, alto: 960 },
};

describe('validarLogin', () => {
  it('exige correo y contraseña', () => {
    const e = validarLogin('', '');
    expect(e.correo).toBe('Ingresa tu correo institucional.');
    expect(e.contrasena).toBe('Ingresa tu contraseña.');
  });

  it('rechaza correos con formato inválido', () => {
    expect(validarLogin('usuario@utvt', 'secreta1').correo).toBe('El formato del correo no es válido.');
    expect(validarLogin('usuario utvt.edu.mx', 'secreta1').correo).toBeDefined();
  });

  it('exige contraseña de al menos 6 caracteres', () => {
    expect(validarLogin('a@utvt.edu.mx', '123').contrasena).toMatch(/al menos 6/);
  });

  it('acepta credenciales con formato correcto', () => {
    expect(tieneErrores(validarLogin('  estudiante@utvt.edu.mx ', 'Estudiante123'))).toBe(false);
  });
});

describe('validarReporte', () => {
  it('acepta un reporte completo', () => {
    expect(validarReporte(reporteValido)).toEqual({});
  });

  it('marca los seis campos obligatorios en un formulario vacío', () => {
    const e = validarReporte({ ...reporteValido, titulo: '', descripcion: '', categoria: null, lugar: '', foto: null, ubicacion: null });
    expect(Object.keys(e).sort()).toEqual(['categoria', 'descripcion', 'foto', 'lugar', 'titulo', 'ubicacion']);
  });

  it('valida longitudes mínimas y máximas', () => {
    expect(validarReporte({ ...reporteValido, titulo: 'Foco' }).titulo).toMatch(/al menos 5/);
    expect(validarReporte({ ...reporteValido, titulo: 'x'.repeat(81) }).titulo).toMatch(/80/);
    expect(validarReporte({ ...reporteValido, descripcion: 'Roto' }).descripcion).toMatch(/al menos 10/);
    expect(validarReporte({ ...reporteValido, descripcion: 'x'.repeat(501) }).descripcion).toMatch(/500/);
  });

  it('ignora espacios al inicio y al final', () => {
    expect(validarReporte({ ...reporteValido, titulo: '    Foco    ' }).titulo).toBeDefined();
  });
});

describe('utilidades de formato', () => {
  it('formatea coordenadas con hemisferio', () => {
    expect(formatoCoordenadas(19.32935, -99.46612)).toBe('19.329350° N, 99.466120° O');
  });

  it('obtiene iniciales ignorando abreviaturas', () => {
    expect(iniciales('Elías García')).toBe('EG');
    expect(iniciales('Mtra. Laura Méndez')).toBe('LM');
  });
});
