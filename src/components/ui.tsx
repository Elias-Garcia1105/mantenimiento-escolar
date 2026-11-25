/** Componentes base reutilizables (botones, campos, tarjetas, avisos). */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Colors, Fonts, Radius, Shadow, Spacing, Type } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/* ---------- Botón ---------- */
type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  icono,
  cargando,
  deshabilitado,
  estilo,
  testID,
  compacto,
}: {
  titulo: string;
  onPress?: () => void;
  variante?: Variante;
  icono?: IconName;
  cargando?: boolean;
  deshabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
  testID?: string;
  compacto?: boolean;
}) {
  const paleta = {
    primario: { fondo: Colors.primary, texto: Colors.onPrimary, borde: Colors.primary },
    secundario: { fondo: Colors.surface, texto: Colors.primary, borde: Colors.border },
    fantasma: { fondo: 'transparent', texto: Colors.primary, borde: 'transparent' },
    peligro: { fondo: Colors.dangerSoft, texto: Colors.danger, borde: Colors.dangerSoft },
  }[variante];
  const inactivo = deshabilitado || cargando;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        styles.boton,
        compacto && styles.botonCompacto,
        { backgroundColor: paleta.fondo, borderColor: paleta.borde },
        variante === 'primario' && !inactivo && Shadow.raised,
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        inactivo && { opacity: 0.55 },
        estilo,
      ]}>
      {cargando ? (
        <ActivityIndicator color={paleta.texto} />
      ) : (
        <>
          {icono && <Ionicons name={icono} size={compacto ? 17 : 19} color={paleta.texto} />}
          <Text style={[styles.botonTexto, compacto && { fontSize: 14 }, { color: paleta.texto }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ---------- Campo de texto ---------- */
export function Campo({
  etiqueta,
  icono,
  error,
  ayuda,
  secreto,
  contador,
  ...props
}: TextInputProps & {
  etiqueta: string;
  icono?: IconName;
  error?: string;
  ayuda?: string;
  secreto?: boolean;
  contador?: number;
}) {
  const [enfocado, setEnfocado] = useState(false);
  const [oculto, setOculto] = useState(true);
  const largo = typeof props.value === 'string' ? props.value.length : 0;

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.filaEntre}>
        <Text style={Type.label}>{etiqueta}</Text>
        {contador ? (
          <Text style={[Type.caption, largo > contador && { color: Colors.danger }]}>
            {largo}/{contador}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.campo,
          props.multiline && { alignItems: 'flex-start', paddingVertical: 12 },
          enfocado && { borderColor: Colors.primary, backgroundColor: Colors.surface },
          !!error && { borderColor: Colors.danger, backgroundColor: '#FFF9F9' },
        ]}>
        {icono && (
          <Ionicons
            name={icono}
            size={19}
            color={error ? Colors.danger : enfocado ? Colors.primary : Colors.textSubtle}
            style={props.multiline ? { marginTop: 2 } : undefined}
          />
        )}
        <TextInput
          placeholderTextColor={Colors.textSubtle}
          {...props}
          secureTextEntry={secreto && oculto}
          onFocus={(e) => {
            setEnfocado(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]}
        />
        {secreto && (
          <Pressable
            onPress={() => setOculto((v) => !v)}
            hitSlop={10}
            accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}>
            <Ionicons name={oculto ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSubtle} />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.filaError}>
          <Ionicons name="alert-circle" size={14} color={Colors.danger} />
          <Text style={[Type.caption, { color: Colors.danger, flex: 1 }]}>{error}</Text>
        </View>
      ) : ayuda ? (
        <Text style={Type.caption}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

/* ---------- Tarjeta ---------- */
export function Tarjeta({ children, estilo, testID }: { children: ReactNode; estilo?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View testID={testID} style={[styles.tarjeta, Shadow.card, estilo]}>
      {children}
    </View>
  );
}

/* ---------- Encabezado de sección ---------- */
export function Seccion({
  titulo,
  subtitulo,
  icono,
  derecha,
}: {
  titulo: string;
  subtitulo?: string;
  icono?: IconName;
  derecha?: ReactNode;
}) {
  return (
    <View style={[styles.filaEntre, { marginBottom: Spacing.md }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        {icono && (
          <View style={styles.iconoSeccion}>
            <Ionicons name={icono} size={17} color={Colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={Type.heading}>{titulo}</Text>
          {subtitulo ? <Text style={Type.caption}>{subtitulo}</Text> : null}
        </View>
      </View>
      {derecha}
    </View>
  );
}

/* ---------- Chip seleccionable ---------- */
export function Chip({
  etiqueta,
  activo,
  onPress,
  icono,
  color = Colors.primary,
  testID,
}: {
  etiqueta: string;
  activo?: boolean;
  onPress?: () => void;
  icono?: IconName;
  color?: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      style={({ pressed }) => [
        styles.chip,
        activo && { backgroundColor: color, borderColor: color },
        pressed && { opacity: 0.8 },
      ]}>
      {icono && <Ionicons name={icono} size={15} color={activo ? '#fff' : Colors.textMuted} />}
      <Text style={[styles.chipTexto, activo && { color: '#fff' }]}>{etiqueta}</Text>
    </Pressable>
  );
}

/* ---------- Insignia ---------- */
export function Insignia({ texto, color, fondo, icono }: { texto: string; color: string; fondo: string; icono?: IconName }) {
  return (
    <View style={[styles.insignia, { backgroundColor: fondo }]}>
      {icono ? <Ionicons name={icono} size={13} color={color} /> : <View style={[styles.punto, { backgroundColor: color }]} />}
      <Text style={[styles.insigniaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

/* ---------- Aviso ---------- */
type TipoAviso = 'info' | 'error' | 'exito' | 'advertencia';
export function Aviso({
  tipo = 'info',
  titulo,
  mensaje,
  accion,
  testID,
}: {
  tipo?: TipoAviso;
  titulo?: string;
  mensaje: string;
  accion?: ReactNode;
  testID?: string;
}) {
  const p = {
    info: { c: Colors.info, f: Colors.infoSoft, i: 'information-circle' as IconName },
    error: { c: Colors.danger, f: Colors.dangerSoft, i: 'alert-circle' as IconName },
    exito: { c: Colors.success, f: Colors.successSoft, i: 'checkmark-circle' as IconName },
    advertencia: { c: Colors.warning, f: Colors.warningSoft, i: 'warning' as IconName },
  }[tipo];
  return (
    <View testID={testID} style={[styles.aviso, { backgroundColor: p.f, borderColor: `${p.c}33` }]} accessibilityRole="alert">
      <Ionicons name={p.i} size={20} color={p.c} />
      <View style={{ flex: 1, gap: 2 }}>
        {titulo ? <Text style={[Type.label, { color: p.c }]}>{titulo}</Text> : null}
        <Text style={[Type.caption, { color: Colors.text, fontSize: 13, lineHeight: 18 }]}>{mensaje}</Text>
        {accion ? <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>{accion}</View> : null}
      </View>
    </View>
  );
}

/* ---------- Fila de información ---------- */
export function FilaInfo({ icono, etiqueta, valor, ultimo }: { icono: IconName; etiqueta: string; valor: string; ultimo?: boolean }) {
  return (
    <View style={[styles.filaInfo, !ultimo && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border }]}>
      <Ionicons name={icono} size={18} color={Colors.textSubtle} />
      <Text style={[Type.caption, { flex: 1, fontSize: 13 }]}>{etiqueta}</Text>
      <Text style={[Type.label, { flexShrink: 1, textAlign: 'right' }]} numberOfLines={2}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botonCompacto: { minHeight: 42, paddingHorizontal: Spacing.lg, borderRadius: Radius.sm },
  botonTexto: { fontFamily: Fonts.bold, fontSize: 15.5, letterSpacing: 0.2 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.ink,
    paddingVertical: 12,
    outlineStyle: 'none',
  } as object,
  filaError: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tarjeta: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconoSeccion: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipTexto: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.textMuted },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  punto: { width: 6, height: 6, borderRadius: 3 },
  insigniaTexto: { fontFamily: Fonts.bold, fontSize: 11.5, letterSpacing: 0.2 },
  aviso: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: Radius.md, borderWidth: 1 },
  filaInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
