/** Catálogos (etiquetas, íconos y colores) usados en formularios y listados. */
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import { Colors } from './theme';
import type { Categoria, EstadoReporte, Prioridad } from '@/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORIAS: { id: Categoria; etiqueta: string; icono: IconName }[] = [
  { id: 'electrico', etiqueta: 'Eléctrico', icono: 'flash-outline' },
  { id: 'plomeria', etiqueta: 'Plomería', icono: 'water-outline' },
  { id: 'mobiliario', etiqueta: 'Mobiliario', icono: 'easel-outline' },
  { id: 'computo', etiqueta: 'Equipo de cómputo', icono: 'desktop-outline' },
  { id: 'infraestructura', etiqueta: 'Infraestructura', icono: 'business-outline' },
  { id: 'limpieza', etiqueta: 'Limpieza', icono: 'sparkles-outline' },
  { id: 'otro', etiqueta: 'Otro', icono: 'ellipsis-horizontal-circle-outline' },
];

export const PRIORIDADES: { id: Prioridad; etiqueta: string; color: string }[] = [
  { id: 'baja', etiqueta: 'Baja', color: Colors.success },
  { id: 'media', etiqueta: 'Media', color: Colors.warning },
  { id: 'alta', etiqueta: 'Alta', color: Colors.danger },
];

export const ESTADOS: Record<
  EstadoReporte,
  { etiqueta: string; color: string; fondo: string; icono: IconName; descripcion: string }
> = {
  pendiente: {
    etiqueta: 'Pendiente',
    color: Colors.warning,
    fondo: Colors.warningSoft,
    icono: 'time-outline',
    descripcion: 'El reporte fue recibido y espera revisión.',
  },
  en_proceso: {
    etiqueta: 'En proceso',
    color: Colors.info,
    fondo: Colors.infoSoft,
    icono: 'construct-outline',
    descripcion: 'Personal de mantenimiento está atendiendo el reporte.',
  },
  resuelto: {
    etiqueta: 'Resuelto',
    color: Colors.success,
    fondo: Colors.successSoft,
    icono: 'checkmark-circle-outline',
    descripcion: 'La incidencia fue atendida y cerrada.',
  },
};

export const ORDEN_ESTADOS: EstadoReporte[] = ['pendiente', 'en_proceso', 'resuelto'];

export const categoriaPorId = (id: Categoria) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[6];
export const prioridadPorId = (id: Prioridad) => PRIORIDADES.find((p) => p.id === id) ?? PRIORIDADES[1];

export const formatoFolio = (folio: number) => `MT-${String(folio).padStart(4, '0')}`;
