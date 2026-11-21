// src/screens/BomberoScreen.js — lista/mapa de alertas, detalle con tipo, descripción, fotos y comentarios
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapa from '../MapaLeaflet';
import useLocation from '../useLocation';
import { getAlerta, getAlertas, imageSource } from '../api';
import { COLORS, NIVELES, hace } from '../theme';
import { REFRESCO_MS } from '../config';

const ORDEN = { peligroso: 0, medio: 1, ligero: 2 };

const TIPOS_LABEL = {
  incendio: 'Incendio',
  forestal: 'Forestal',
  pastizal: 'Pastizal',
  edificio: 'Casa / Edificio',
  vehicular: 'Vehicular',
  industrial: 'Industrial',
  otro: 'Otro',
};

function fmtTipo(t) {
  if (!t) return 'Incidente';
  const k = String(t).toLowerCase();
  return TIPOS_LABEL[k] || (k.charAt(0).toUpperCase() + k.slice(1));
}

function fmtRuta(r) {
  const km = (r.distance / 1000).toFixed(1);
  const min = Math.max(1, Math.round(r.duration / 60));
  return `${km} km · ~${min} min`;
}

export default function BomberoScreen({ usuario, onLogout }) {
  const { pos } = useLocation();
  const mapa = useRef(null);
  const [alertas, setAlertas] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDet, setCargandoDet] = useState(false);
  const [ruta, setRuta] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const d = await getAlertas(null);
      setAlertas(d.alertas.sort((a, b) => (ORDEN[a.nivel] ?? 3) - (ORDEN[b.nivel] ?? 3) || a.minutos - b.minutos));
    } catch {}
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const abrir = async (id) => {
    setRuta(null);
    mapa.current?.clearRoute();
    setCargandoDet(true);
    try {
      const d = await getAlerta(id);
      setDetalle(d.alerta);
      mapa.current?.focusOn(d.alerta);
    } catch {}
    setCargandoDet(false);
  };

  const cerrarDetalle = () => {
    setDetalle(null);
    setRuta(null);
    mapa.current?.clearRoute();
  };

  const calcularRuta = () => {
    if (!pos || !detalle) return;
    setRuta({ cargando: true });
    mapa.current?.drawRoute(pos, detalle);
  };

  const nv = detalle ? NIVELES[detalle.nivel] || NIVELES.ligero : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={s.header}>
        <Text style={s.title}>🚒 {usuario.nombre} · {alertas.length} alerta(s)</Text>
        <TouchableOpacity onPress={onLogout}><Text style={s.salir}>Salir</Text></TouchableOpacity>
      </View>

      <View style={{ flex: 1.1 }}>
        <Mapa
          ref={mapa}
          alertas={alertas}
          userPos={pos}
          onSelect={abrir}
          onRoute={(r) => setRuta(r.error ? { error: true } : r)}
        />
      </View>

      <View style={s.panel}>
        {!detalle ? (
          <ScrollView>
            {alertas.length === 0 && <Text style={s.muted}>Sin alertas activas 🎉</Text>}
            {alertas.map((a) => {
              const n = NIVELES[a.nivel] || NIVELES.ligero;
              return (
                <TouchableOpacity key={a.id} style={s.item} onPress={() => abrir(a.id)}>
                  <View style={[s.dot, { backgroundColor: n.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemTitle} numberOfLines={1}>{fmtTipo(a.tipo)} · {a.direccion}</Text>
                    <Text style={s.muted}>{n.label} · {a.reportes} reporte(s) · {a.fotos} foto(s) · {hace(a.minutos)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView>
            <TouchableOpacity onPress={cerrarDetalle}><Text style={s.muted}>← Volver a la lista</Text></TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <View style={[s.dot, { backgroundColor: nv.color }]} />
              <Text style={s.itemTitle}>{fmtTipo(detalle.tipo)} · {nv.label} · {detalle.reportes} reporte(s)</Text>
            </View>
            <Text style={{ color: COLORS.text, marginTop: 4 }}>{detalle.direccion}</Text>
            <Text style={s.muted}>{hace(detalle.minutos)}</Text>

            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity style={s.btn} onPress={calcularRuta} disabled={!pos}>
                <Text style={s.btnTxt}>🧭 Calcular ruta</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: COLORS.accent, marginLeft: 8 }]}
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${detalle.lat},${detalle.lng}`)}>
                <Text style={s.btnTxt}>Abrir en Maps</Text>
              </TouchableOpacity>
            </View>
            {ruta?.cargando && <ActivityIndicator style={{ marginTop: 8 }} color={COLORS.primary} />}
            {ruta?.distance != null && <Text style={s.ruta}>Ruta: {fmtRuta(ruta)}</Text>}
            {ruta?.error && <Text style={[s.muted, { color: '#ff8a80' }]}>No se pudo calcular la ruta. Prueba con "Abrir en Maps".</Text>}

            {/* 1. Tipo de incidente y Detalles */}
            <View style={{ marginTop: 12 }}>
              <Text style={s.itemTitle}>Tipo de incidente</Text>
              <Text style={{ color: COLORS.text, marginTop: 2 }}>{fmtTipo(detalle.tipo)}</Text>

              <Text style={[s.itemTitle, { marginTop: 10 }]}>Detalles</Text>
              <Text style={{ color: COLORS.text, marginTop: 2 }}>
                {detalle.descripcion ? detalle.descripcion : 'Sin detalles adicionales.'}
              </Text>
            </View>

            {/* 2. Fotos */}
            <Text style={[s.itemTitle, { marginTop: 12 }]}>Fotos ({detalle.fotos.length})</Text>
            {detalle.fotos.length === 0 ? (
              <Text style={s.muted}>Nadie adjuntó fotos aún.</Text>
            ) : (
              <ScrollView horizontal style={{ marginTop: 6 }}>
                {detalle.fotos.map((u, i) => (
                  <Image key={i} source={imageSource(u)} style={s.foto} />
                ))}
              </ScrollView>
            )}

            {/* 3. Comentarios al final */}
            {detalle.comentarios?.length > 0 && (
              <View style={{ marginTop: 12, marginBottom: 16 }}>
                <Text style={s.itemTitle}>Comentarios de reportes ({detalle.comentarios.length})</Text>
                {detalle.comentarios.map((c, i) => (
                  <View key={i} style={s.comBox}>
                    <Text style={s.comAutor}>{c.usuario || 'Usuario'} <Text style={s.muted}>· {hace(c.minutos)}</Text></Text>
                    <Text style={{ color: COLORS.text, marginTop: 2 }}>{c.comentario}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
        {cargandoDet && <ActivityIndicator style={s.loader} color={COLORS.primary} />}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: COLORS.bg },
  title: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  salir: { color: COLORS.muted },
  panel: { flex: 1, backgroundColor: COLORS.bg, padding: 14, borderTopLeftRadius: 18, borderTopRightRadius: 18, marginTop: -14 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  itemTitle: { color: COLORS.text, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  dot: { width: 14, height: 14, borderRadius: 8, marginRight: 10 },
  btn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700' },
  ruta: { color: COLORS.text, fontWeight: '700', marginTop: 8 },
  comBox: { backgroundColor: COLORS.card, borderRadius: 10, padding: 10, marginTop: 6 },
  comAutor: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  foto: { width: 160, height: 160, borderRadius: 12, marginRight: 10, backgroundColor: COLORS.card },
  loader: { position: 'absolute', top: 14, right: 14 },
});