/** Campos especiales del formulario de reporte: fotografía, ubicación GPS y explicación de permisos. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { MiniMapa } from './reportes';
import { Aviso, Boton } from './ui';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { formatoCoordenadas } from '@/lib/validacion';
import { obtenerFoto } from '@/services/multimedia';
import { abrirConfiguracion, consultarPermiso, TEXTO_PERMISO, type TipoPermiso } from '@/services/permisos';
import { obtenerUbicacion, urlMapa } from '@/services/ubicacion';
import type { Foto, Ubicacion } from '@/types';

/* ---------- Explicación previa a la solicitud del sistema ---------- */
export function ModalPermiso({
  tipo,
  onContinuar,
  onCancelar,
}: {
  tipo: TipoPermiso | null;
  onContinuar: () => void;
  onCancelar: () => void;
}) {
  const t = tipo ? TEXTO_PERMISO[tipo] : null;
  return (
    <Modal visible={!!tipo} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.fondoModal}>
        <View style={styles.hoja} testID="modal-permiso">
          <View style={styles.iconoGrande}>{t && <Ionicons name={t.icono} size={34} color={Colors.primary} />}</View>
          <Text style={[Type.title, { textAlign: 'center' }]}>Permitir acceso a {t?.recurso}</Text>
          <Text style={[Type.body, { textAlign: 'center', color: Colors.textMuted }]}>{t?.uso}</Text>
          <View style={styles.listaGarantias}>
            {[
              'Solo se usa cuando tú lo decides.',
              'No se accede en segundo plano.',
              'Puedes cambiar tu decisión en Configuración.',
            ].map((g) => (
              <View key={g} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                <Text style={[Type.caption, { fontSize: 13, color: Colors.text }]}>{g}</Text>
              </View>
            ))}
          </View>
          <Boton titulo="Continuar" onPress={onContinuar} testID="permiso-continuar" estilo={{ alignSelf: 'stretch' }} />
          <Boton titulo="Ahora no" variante="fantasma" onPress={onCancelar} estilo={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  );
}

function AvisoPermisoDenegado({ tipo, puedePreguntar, onReintentar }: { tipo: TipoPermiso; puedePreguntar: boolean; onReintentar: () => void }) {
  const nombre = TEXTO_PERMISO[tipo].titulo.toLowerCase();
  const consecuencia =
    tipo === 'camara'
      ? 'No podrás tomar fotos, pero puedes elegir una imagen de tu galería.'
      : tipo === 'ubicacion'
        ? 'Sin este permiso no es posible registrar las coordenadas del reporte.'
        : 'No podrás elegir imágenes de tu galería.';
  const enWeb = Platform.OS === 'web';
  return (
    <Aviso
      testID={`aviso-denegado-${tipo}`}
      tipo="advertencia"
      titulo={`Permiso de ${nombre} denegado`}
      mensaje={
        puedePreguntar
          ? consecuencia
          : `${consecuencia} ${enWeb ? 'Habilítalo desde la configuración del navegador.' : 'Actívalo desde la configuración del dispositivo.'}`
      }
      accion={
        puedePreguntar ? (
          <Boton titulo="Volver a intentar" compacto variante="secundario" icono="refresh" onPress={onReintentar} />
        ) : !enWeb ? (
          <Boton titulo="Abrir configuración" compacto variante="secundario" icono="settings-outline" onPress={abrirConfiguracion} />
        ) : undefined
      }
    />
  );
}

/* ---------- Fotografía ---------- */
export function CampoFoto({ foto, onCambiar, error }: { foto: Foto | null; onCambiar: (f: Foto | null) => void; error?: string }) {
  const [cargando, setCargando] = useState<'camara' | 'galeria' | null>(null);
  const [explicar, setExplicar] = useState<'camara' | 'galeria' | null>(null);
  const [denegado, setDenegado] = useState<{ tipo: 'camara' | 'galeria'; puedePreguntar: boolean } | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  async function ejecutar(origen: 'camara' | 'galeria') {
    setCargando(origen);
    setDenegado(null);
    setFallo(null);
    const r = await obtenerFoto(origen);
    setCargando(null);
    if (r.ok) onCambiar(r.foto);
    else if (r.motivo === 'permiso_denegado') setDenegado({ tipo: origen, puedePreguntar: r.puedePreguntar });
    else if (r.motivo === 'error') setFallo(r.mensaje);
  }

  async function iniciar(origen: 'camara' | 'galeria') {
    const info = await consultarPermiso(origen);
    if (info.estado === 'sin_solicitar') setExplicar(origen);
    else ejecutar(origen);
  }

  return (
    <View style={{ gap: 10 }}>
      {foto ? (
        <View style={styles.previa} testID="foto-previa">
          <Image source={{ uri: foto.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.previaBarra}>
            <View style={styles.previaEtiqueta}>
              <Ionicons name="checkmark-circle" size={15} color="#fff" />
              <Text style={styles.previaTexto}>
                Foto adjunta · {foto.ancho}×{foto.alto}
              </Text>
            </View>
            <Pressable onPress={() => onCambiar(null)} style={styles.previaQuitar} accessibilityLabel="Quitar fotografía" testID="quitar-foto">
              <Ionicons name="trash-outline" size={17} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.zonaFoto, !!error && { borderColor: Colors.danger, backgroundColor: '#FFF9F9' }]}>
          <View style={styles.iconoFoto}>
            <Ionicons name="camera" size={26} color={Colors.primary} />
          </View>
          <Text style={[Type.label, { textAlign: 'center' }]}>Agrega una foto del desperfecto</Text>
          <Text style={[Type.caption, { textAlign: 'center' }]}>Una imagen clara ayuda a atender el reporte más rápido.</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Boton
          titulo={foto ? 'Otra foto' : 'Tomar foto'}
          icono="camera-outline"
          variante="secundario"
          compacto
          estilo={{ flex: 1 }}
          cargando={cargando === 'camara'}
          deshabilitado={!!cargando}
          onPress={() => iniciar('camara')}
          testID="btn-camara"
        />
        <Boton
          titulo="Galería"
          icono="images-outline"
          variante="secundario"
          compacto
          estilo={{ flex: 1 }}
          cargando={cargando === 'galeria'}
          deshabilitado={!!cargando}
          onPress={() => iniciar('galeria')}
          testID="btn-galeria"
        />
      </View>

      {error && !foto ? <Text style={[Type.caption, { color: Colors.danger }]}>{error}</Text> : null}
      {denegado && (
        <AvisoPermisoDenegado tipo={denegado.tipo} puedePreguntar={denegado.puedePreguntar} onReintentar={() => ejecutar(denegado.tipo)} />
      )}
      {fallo && <Aviso tipo="error" mensaje={fallo} />}

      <ModalPermiso
        tipo={explicar}
        onCancelar={() => setExplicar(null)}
        onContinuar={() => {
          const origen = explicar!;
          setExplicar(null);
          ejecutar(origen);
        }}
      />
    </View>
  );
}

/* ---------- Ubicación GPS ---------- */
export function CampoUbicacion({
  ubicacion,
  onCambiar,
  error,
}: {
  ubicacion: Ubicacion | null;
  onCambiar: (u: Ubicacion | null) => void;
  error?: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [explicar, setExplicar] = useState(false);
  const [denegado, setDenegado] = useState<{ puedePreguntar: boolean } | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  async function ejecutar() {
    setCargando(true);
    setDenegado(null);
    setFallo(null);
    const r = await obtenerUbicacion();
    setCargando(false);
    if (r.ok) onCambiar(r.ubicacion);
    else if (r.motivo === 'permiso_denegado') setDenegado({ puedePreguntar: r.puedePreguntar });
    else setFallo(r.mensaje);
  }

  async function iniciar() {
    const info = await consultarPermiso('ubicacion');
    if (info.estado === 'sin_solicitar') setExplicar(true);
    else ejecutar();
  }

  return (
    <View style={{ gap: 10 }}>
      {ubicacion ? (
        <View style={styles.ubicacionOk} testID="ubicacion-obtenida">
          <MiniMapa altura={104} />
          <View style={{ gap: 4 }}>
            <Text style={styles.coordenadas} selectable>
              {formatoCoordenadas(ubicacion.latitud, ubicacion.longitud)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {ubicacion.precision != null && (
                <Text style={Type.caption}>
                  <Ionicons name="radio-outline" size={12} /> Precisión ±{ubicacion.precision} m
                </Text>
              )}
              {ubicacion.direccion ? <Text style={Type.caption}>{ubicacion.direccion}</Text> : null}
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.zonaGps, !!error && { borderColor: Colors.danger, backgroundColor: '#FFF9F9' }]}>
          {cargando ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="navigate-circle-outline" size={26} color={Colors.primary} />}
          <View style={{ flex: 1 }}>
            <Text style={Type.label}>{cargando ? 'Buscando señal GPS…' : 'Ubicación no registrada'}</Text>
            <Text style={Type.caption}>Se guardan las coordenadas del lugar del desperfecto.</Text>
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Boton
          titulo={ubicacion ? 'Actualizar' : 'Obtener ubicación'}
          icono="locate-outline"
          variante="secundario"
          compacto
          estilo={{ flex: 1 }}
          cargando={cargando}
          onPress={iniciar}
          testID="btn-ubicacion"
        />
        {ubicacion && (
          <Boton
            titulo="Ver mapa"
            icono="map-outline"
            variante="fantasma"
            compacto
            onPress={() => Linking.openURL(urlMapa(ubicacion.latitud, ubicacion.longitud))}
          />
        )}
      </View>

      {error && !ubicacion ? <Text style={[Type.caption, { color: Colors.danger }]}>{error}</Text> : null}
      {denegado && <AvisoPermisoDenegado tipo="ubicacion" puedePreguntar={denegado.puedePreguntar} onReintentar={ejecutar} />}
      {fallo && <Aviso tipo="error" titulo="No se obtuvo la ubicación" mensaje={fallo} />}

      <ModalPermiso
        tipo={explicar ? 'ubicacion' : null}
        onCancelar={() => setExplicar(false)}
        onContinuar={() => {
          setExplicar(false);
          ejecutar();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(15,26,23,0.55)',
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconoGrande: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  listaGarantias: {
    alignSelf: 'stretch',
    gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 14,
    marginVertical: 6,
  },
  zonaFoto: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  iconoFoto: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  previa: {
    height: 190,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'flex-end',
  },
  previaBarra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  previaEtiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,26,23,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  previaTexto: { color: '#fff', fontFamily: Fonts.semibold, fontSize: 12 },
  previaQuitar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(201,59,59,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zonaGps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
    padding: 16,
  },
  ubicacionOk: {
    gap: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    backgroundColor: Colors.surfaceAlt,
  },
  coordenadas: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink, letterSpacing: 0.2 },
});
