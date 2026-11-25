import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EstadoVacio, InsigniaEstado, LineaTiempo, MiniMapa } from '@/components/reportes';
import { Aviso, Boton, Campo, Chip, FilaInfo, Insignia, Seccion, Tarjeta } from '@/components/ui';
import { categoriaPorId, ESTADOS, formatoFolio, ORDEN_ESTADOS, prioridadPorId } from '@/constants/catalogos';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { mensajeDeError, useReportes } from '@/context/reportes';
import { formatoCoordenadas, formatoFecha } from '@/lib/validacion';
import { backend } from '@/services/backend';
import { urlMapa } from '@/services/ubicacion';
import type { EstadoReporte, Reporte } from '@/types';

export default function DetalleReporteScreen() {
  const { id, creado } = useLocalSearchParams<{ id: string; creado?: string }>();
  const { usuario } = useAuth();
  const { reportes, cambiarEstado } = useReportes();
  const enLista = reportes.find((r) => r.id === id) ?? null;

  // Si el reporte no está en la lista (por ejemplo, al abrir un enlace directo) se consulta al servicio.
  const [remoto, setRemoto] = useState<{ id: string; reporte: Reporte | null } | null>(null);
  const reporte = enLista ?? (remoto?.id === id ? remoto.reporte : null);
  const cargando = !enLista && remoto?.id !== id;

  const [estado, setEstado] = useState<EstadoReporte>(enLista?.estado ?? 'pendiente');
  const [comentario, setComentario] = useState(enLista?.comentarioAtencion ?? '');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const consultadoDeLista = !!enLista;
  useEffect(() => {
    if (consultadoDeLista) return;
    let activo = true;
    backend
      .obtenerReporte(id)
      .catch(() => null)
      .then((r) => {
        if (!activo) return;
        setRemoto({ id, reporte: r });
        if (r) {
          setEstado(r.estado);
          setComentario(r.comentarioAtencion ?? '');
        }
      });
    return () => {
      activo = false;
    };
  }, [id, consultadoDeLista]);

  if (cargando) return <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />;
  if (!reporte)
    return <EstadoVacio icono="search-outline" titulo="Reporte no encontrado" mensaje="Es posible que haya sido eliminado o que no tengas acceso." />;

  const cat = categoriaPorId(reporte.categoria);
  const prioridad = prioridadPorId(reporte.prioridad);
  const esAdmin = usuario?.rol === 'administrativo';
  const hayCambios = estado !== reporte.estado || (comentario.trim() || null) !== (reporte.comentarioAtencion || null);

  async function guardar() {
    setGuardando(true);
    setAviso(null);
    try {
      const r = await cambiarEstado(reporte!.id, estado, comentario.trim() || null);
      if (!enLista) setRemoto({ id: r.id, reporte: r });
      setAviso({ tipo: 'exito', texto: `El reporte ahora está "${ESTADOS[r.estado].etiqueta}".` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 48 }}>
      {creado === '1' && (
        <Aviso
          tipo="exito"
          testID="aviso-creado"
          titulo="Reporte enviado correctamente"
          mensaje={`Se registró con el folio ${formatoFolio(reporte.folio)}. Podrás consultar aquí su estado.`}
        />
      )}

      {reporte.fotoUrl ? (
        <Image source={{ uri: reporte.fotoUrl }} style={styles.foto} contentFit="cover" transition={200} testID="detalle-foto" />
      ) : (
        <View style={[styles.foto, styles.sinFoto]}>
          <Ionicons name={cat.icono} size={44} color={Colors.primary} />
          <Text style={Type.caption}>Reporte sin fotografía</Text>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.folio} testID="detalle-folio">
            {formatoFolio(reporte.folio)}
          </Text>
          <InsigniaEstado estado={reporte.estado} />
        </View>
        <Text style={Type.title}>{reporte.titulo}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Insignia texto={cat.etiqueta} color={Colors.primary} fondo={Colors.primarySoft} icono={cat.icono} />
          <Insignia texto={`Prioridad ${prioridad.etiqueta.toLowerCase()}`} color={prioridad.color} fondo={Colors.surfaceAlt} />
        </View>
      </View>

      <Tarjeta estilo={{ paddingVertical: 4 }}>
        <FilaInfo icono="business-outline" etiqueta="Lugar" valor={reporte.lugar} />
        <FilaInfo icono="calendar-outline" etiqueta="Fecha de registro" valor={formatoFecha(reporte.creadoEn)} />
        <FilaInfo icono="person-outline" etiqueta="Reportado por" valor={reporte.creadoPorNombre} />
        <FilaInfo icono="refresh-outline" etiqueta="Última actualización" valor={formatoFecha(reporte.actualizadoEn)} ultimo />
      </Tarjeta>

      <Tarjeta>
        <Seccion titulo="Descripción" icono="document-text-outline" />
        <Text style={Type.body}>{reporte.descripcion}</Text>
      </Tarjeta>

      <Tarjeta>
        <Seccion titulo="Ubicación GPS" icono="location-outline" />
        {reporte.ubicacion ? (
          <View style={{ gap: 10 }}>
            <MiniMapa altura={110} />
            <Text style={styles.coordenadas} selectable>
              {formatoCoordenadas(reporte.ubicacion.latitud, reporte.ubicacion.longitud)}
            </Text>
            <Text style={Type.caption}>
              {reporte.ubicacion.precision != null ? `Precisión ±${reporte.ubicacion.precision} m · ` : ''}
              {reporte.ubicacion.direccion ?? 'Capturada desde el GPS del dispositivo'}
            </Text>
            <Boton
              titulo="Abrir en Google Maps"
              icono="map-outline"
              variante="secundario"
              compacto
              onPress={() => Linking.openURL(urlMapa(reporte.ubicacion!.latitud, reporte.ubicacion!.longitud))}
            />
          </View>
        ) : (
          <Text style={Type.caption}>El reporte no incluye coordenadas.</Text>
        )}
      </Tarjeta>

      <Tarjeta>
        <Seccion titulo="Seguimiento" subtitulo={ESTADOS[reporte.estado].descripcion} icono="git-commit-outline" />
        <LineaTiempo reporte={reporte} />
        {reporte.comentarioAtencion ? (
          <View style={styles.comentario}>
            <Text style={Type.overline}>Comentario de mantenimiento</Text>
            <Text style={Type.body}>{reporte.comentarioAtencion}</Text>
          </View>
        ) : null}
      </Tarjeta>

      {esAdmin && (
        <Tarjeta estilo={{ gap: Spacing.lg, borderColor: Colors.accent }} testID="panel-admin">
          <Seccion titulo="Atender reporte" subtitulo="Solo personal administrativo" icono="construct-outline" />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {ORDEN_ESTADOS.map((e) => (
              <Chip
                key={e}
                etiqueta={ESTADOS[e].etiqueta}
                icono={ESTADOS[e].icono}
                activo={estado === e}
                color={ESTADOS[e].color}
                onPress={() => setEstado(e)}
                testID={`estado-${e}`}
              />
            ))}
          </View>
          <Campo
            etiqueta="Comentario (opcional)"
            placeholder="Acciones realizadas o fecha estimada de atención"
            multiline
            value={comentario}
            onChangeText={setComentario}
            maxLength={300}
            contador={300}
            testID="input-comentario"
          />
          {aviso && <Aviso tipo={aviso.tipo} mensaje={aviso.texto} testID="aviso-estado" />}
          <Boton titulo="Guardar cambios" icono="save-outline" onPress={guardar} cargando={guardando} deshabilitado={!hayCambios} testID="btn-guardar-estado" />
        </Tarjeta>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  foto: { height: 220, borderRadius: Radius.xl, backgroundColor: Colors.surfaceAlt },
  sinFoto: { alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primarySoft },
  folio: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.textSubtle, letterSpacing: 0.8 },
  coordenadas: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  comentario: { marginTop: Spacing.lg, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, gap: 6 },
});
