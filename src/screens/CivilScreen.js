// src/screens/CivilScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapa from '../MapaLeaflet';
import useLocation from '../useLocation';
import { getAlertas } from '../api';
import { COLORS, NIVELES, hace } from '../theme';
import { REFRESCO_MS } from '../config';
import ReportarScreen from './ReportarScreen';

export default function CivilScreen({ usuario, onLogout }) {
  const { pos, error } = useLocation();
  const [alertas, setAlertas] = useState([]);
  const [sel, setSel] = useState(null);
  const [reportando, setReportando] = useState(false);

  const cargar = useCallback(async () => {
    if (!pos) return;
    try {
      const d = await getAlertas(pos);
      setAlertas(d.alertas);
    } catch {}
  }, [pos?.lat, pos?.lng]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  if (reportando) {
    return <ReportarScreen pos={pos} onClose={() => setReportando(false)} onSent={cargar} />;
  }

  const alerta = alertas.find((a) => a.id === sel);
  const nv = alerta ? NIVELES[alerta.nivel] || NIVELES.ligero : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={s.header}>
        <Text style={s.title}>Hola, {usuario.nombre}</Text>
        <TouchableOpacity onPress={onLogout}><Text style={s.salir}>Salir</Text></TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <Mapa alertas={alertas} userPos={pos} onSelect={setSel} />

        <View style={s.leyenda}>
          {Object.entries(NIVELES).map(([k, v]) => (
            <View key={k} style={s.leyItem}>
              <View style={[s.dot, { backgroundColor: v.color }]} />
              <Text style={s.leyTxt}>{v.label} ({v.rango})</Text>
            </View>
          ))}
        </View>

        {!!error && <Text style={s.error}>{error}</Text>}

        {alerta && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.dot, { backgroundColor: nv.color, width: 14, height: 14 }]} />
              <Text style={s.cardTitle}>Peligrosidad {nv.label.toLowerCase()}</Text>
            </View>
            <Text style={s.cardTxt}>{alerta.direccion}</Text>
            <Text style={s.cardMuted}>
              {alerta.reportes} reporte(s) · {hace(alerta.minutos)}
              {alerta.distancia_m != null ? ` · a ${alerta.distancia_m} m` : ''}
            </Text>
          </View>
        )}

        <TouchableOpacity style={s.fab} onPress={() => setReportando(true)} disabled={!pos}>
          <Text style={s.fabTxt}>{pos ? '🚨 REPORTAR EMERGENCIA' : 'Obteniendo ubicación…'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: COLORS.bg },
  title: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  salir: { color: COLORS.muted },
  leyenda: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(18,21,28,0.88)', borderRadius: 10, padding: 8 },
  leyItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  leyTxt: { color: COLORS.text, fontSize: 12, marginLeft: 6 },
  dot: { width: 10, height: 10, borderRadius: 7 },
  error: { position: 'absolute', top: 10, right: 10, left: 140, color: '#fff', backgroundColor: '#c0392b', padding: 8, borderRadius: 8 },
  card: { position: 'absolute', left: 12, right: 12, bottom: 92, backgroundColor: COLORS.card, borderRadius: 14, padding: 14 },
  cardTitle: { color: COLORS.text, fontWeight: '700', marginLeft: 8, fontSize: 15 },
  cardTxt: { color: COLORS.text, marginTop: 6 },
  cardMuted: { color: COLORS.muted, marginTop: 2, fontSize: 12 },
  fab: { position: 'absolute', left: 16, right: 16, bottom: 20, backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, alignItems: 'center', elevation: 6 },
  fabTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
