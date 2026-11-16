// src/screens/ReportarScreen.js — fotos (opcionales) + comentario (opcional) → crea/fusiona alerta
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { crearAlerta } from '../api';
import { COLORS, NIVELES } from '../theme';

const MAX_FOTOS = 5;

export default function ReportarScreen({ pos, onClose, onSent }) {
  const [fotos, setFotos] = useState([]);
  const [comentario, setComentario] = useState('');
  const [direccion, setDireccion] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await Location.reverseGeocodeAsync({ latitude: pos.lat, longitude: pos.lng });
        if (r && r[0]) {
          const p = r[0];
          const calle = [p.street || p.name, p.streetNumber].filter(Boolean).join(' ');
          setDireccion([calle, p.city || p.subregion].filter(Boolean).join(', '));
        }
      } catch {}
    })();
  }, []);

  const tomarFoto = async () => {
    if (fotos.length >= MAX_FOTOS) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Activa el permiso de cámara para adjuntar fotos.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true });
    if (!r.canceled && r.assets?.length) setFotos((f) => [...f, r.assets[0]]);
  };

  const quitar = (i) => setFotos((f) => f.filter((_, k) => k !== i));

  const enviar = async () => {
    setEnviando(true);
    try {
      const d = await crearAlerta({ lat: pos.lat, lng: pos.lng, comentario: comentario.trim(), direccion, fotos });
      const nv = NIVELES[d.nivel]?.label || d.nivel || 'Medio';
      Alert.alert(
        d.fusionada ? 'Reporte sumado' : 'Alerta creada',
        d.fusionada
          ? `Ya había una alerta cerca; tu reporte se sumó a ella (${d.reportes} reportes).`
          : 'Gracias, los bomberos y la central ya pueden verla.'
      );
      onSent && onSent();
      onClose();
    } catch (e) {
      Alert.alert(e.status === 429 ? 'Espera un poco' : 'No se pudo enviar', e.message);
    }
    setEnviando(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <TouchableOpacity onPress={onClose}><Text style={s.volver}>← Volver</Text></TouchableOpacity>
        <Text style={s.title}>Reportar emergencia</Text>
        <Text style={s.muted}>📍 {direccion || `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`}</Text>

        <Text style={s.label}>Fotos (opcional, máx. {MAX_FOTOS})</Text>
        <ScrollView horizontal style={{ marginBottom: 8 }}>
          {fotos.map((f, i) => (
            <View key={i} style={{ marginRight: 10 }}>
              <Image source={{ uri: f.uri }} style={s.foto} />
              <TouchableOpacity style={s.x} onPress={() => quitar(i)}><Text style={{ color: '#fff' }}>✕</Text></TouchableOpacity>
            </View>
          ))}
          {fotos.length < MAX_FOTOS && (
            <TouchableOpacity style={[s.foto, s.add]} onPress={tomarFoto}>
              <Text style={{ fontSize: 30 }}>📷</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Text style={s.label}>Comentario (opcional)</Text>
        <TextInput style={s.input} multiline maxLength={500} placeholder="Ej: humo negro saliendo de una casa…"
          placeholderTextColor={COLORS.muted} value={comentario} onChangeText={setComentario} />

        <TouchableOpacity style={s.btn} onPress={enviar} disabled={enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ENVIAR ALERTA</Text>}
        </TouchableOpacity>
        <Text style={[s.muted, { marginTop: 10, textAlign: 'center' }]}>
          Se enviará con tu ubicación actual. Solo puedes reportar una vez cada 30 minutos.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  volver: { color: COLORS.muted, marginBottom: 10 },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  muted: { color: COLORS.muted, marginTop: 6 },
  label: { color: COLORS.text, fontWeight: '600', marginTop: 22, marginBottom: 8 },
  foto: { width: 100, height: 100, borderRadius: 12 },
  add: { backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  x: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 12, padding: 14, minHeight: 90, textAlignVertical: 'top' },
  btn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});