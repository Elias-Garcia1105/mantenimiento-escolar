import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoFoto, CampoUbicacion } from '@/components/formulario';
import { Aviso, Boton, Campo, Chip, Seccion, Tarjeta } from '@/components/ui';
import { CATEGORIAS, PRIORIDADES } from '@/constants/catalogos';
import { Colors, Spacing, Type } from '@/constants/theme';
import { mensajeDeError, useReportes } from '@/context/reportes';
import { LIMITES, tieneErrores, validarReporte, type CampoReporte, type Errores } from '@/lib/validacion';
import { log } from '@/services/logger';
import type { NuevoReporte } from '@/types';

const VACIO: NuevoReporte = {
  titulo: '',
  descripcion: '',
  categoria: null,
  prioridad: 'media',
  lugar: '',
  ubicacion: null,
  foto: null,
};

export default function NuevoReporteScreen() {
  const { crear } = useReportes();
  const [datos, setDatos] = useState<NuevoReporte>(VACIO);
  const [errores, setErrores] = useState<Errores<CampoReporte>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const actualizar = <K extends keyof NuevoReporte>(campo: K, valor: NuevoReporte[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    if (errores[campo as CampoReporte]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  async function enviar() {
    setErrorEnvio(null);
    const e = validarReporte(datos);
    setErrores(e);
    if (tieneErrores(e)) {
      log.warn('formulario', 'Validación fallida', Object.keys(e));
      scroll.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setEnviando(true);
    try {
      const nuevo = await crear(datos);
      setDatos(VACIO);
      setErrores({});
      router.push({ pathname: '/reporte/[id]', params: { id: nuevo.id, creado: '1' } });
    } catch (err) {
      setErrorEnvio(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  const numErrores = Object.values(errores).filter(Boolean).length;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={Type.display}>Nuevo reporte</Text>
            <Text style={[Type.body, { color: Colors.textMuted }]}>Describe el desperfecto, adjunta una foto y registra su ubicación.</Text>
          </View>

          {numErrores > 0 && (
            <Aviso
              tipo="error"
              testID="aviso-validacion"
              titulo="Revisa la información"
              mensaje={`Hay ${numErrores} ${numErrores === 1 ? 'campo pendiente' : 'campos pendientes'} por completar.`}
            />
          )}
          {errorEnvio && <Aviso tipo="error" titulo="No se pudo enviar el reporte" mensaje={errorEnvio} testID="error-envio" />}

          <Tarjeta>
            <Seccion titulo="Evidencia fotográfica" subtitulo="Cámara o galería" icono="camera-outline" />
            <CampoFoto foto={datos.foto} onCambiar={(f) => actualizar('foto', f)} error={errores.foto} />
          </Tarjeta>

          <Tarjeta estilo={{ gap: Spacing.lg }}>
            <Seccion titulo="Datos del reporte" subtitulo="¿Qué ocurre y dónde?" icono="document-text-outline" />
            <Campo
              etiqueta="Título"
              placeholder="Ej. Fuga de agua en sanitarios"
              value={datos.titulo}
              onChangeText={(v) => actualizar('titulo', v)}
              error={errores.titulo}
              maxLength={LIMITES.tituloMax}
              testID="input-titulo"
            />

            <View style={{ gap: 8 }}>
              <Text style={Type.label}>Categoría</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIAS.map((c) => (
                  <Chip
                    key={c.id}
                    etiqueta={c.etiqueta}
                    icono={c.icono}
                    activo={datos.categoria === c.id}
                    onPress={() => actualizar('categoria', c.id)}
                    testID={`cat-${c.id}`}
                  />
                ))}
              </View>
              {errores.categoria ? <Text style={[Type.caption, { color: Colors.danger }]}>{errores.categoria}</Text> : null}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={Type.label}>Prioridad</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PRIORIDADES.map((p) => (
                  <View key={p.id} style={{ flex: 1 }}>
                    <Chip
                      etiqueta={p.etiqueta}
                      activo={datos.prioridad === p.id}
                      color={p.color}
                      onPress={() => actualizar('prioridad', p.id)}
                      testID={`prioridad-${p.id}`}
                    />
                  </View>
                ))}
              </View>
            </View>

            <Campo
              etiqueta="Lugar"
              icono="business-outline"
              placeholder="Edificio, aula o área"
              value={datos.lugar}
              onChangeText={(v) => actualizar('lugar', v)}
              error={errores.lugar}
              maxLength={LIMITES.lugarMax}
              testID="input-lugar"
            />
            <Campo
              etiqueta="Descripción"
              placeholder="Explica el problema con el mayor detalle posible"
              multiline
              contador={LIMITES.descripcionMax}
              value={datos.descripcion}
              onChangeText={(v) => actualizar('descripcion', v)}
              error={errores.descripcion}
              testID="input-descripcion"
            />
          </Tarjeta>

          <Tarjeta>
            <Seccion titulo="Ubicación GPS" subtitulo="Coordenadas del desperfecto" icono="location-outline" />
            <CampoUbicacion ubicacion={datos.ubicacion} onCambiar={(u) => actualizar('ubicacion', u)} error={errores.ubicacion} />
          </Tarjeta>

          <Boton titulo="Enviar reporte" icono="send" onPress={enviar} cargando={enviando} testID="btn-enviar" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
