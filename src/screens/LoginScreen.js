// src/screens/LoginScreen.js
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { login, registro } from '../api';
import { COLORS } from '../theme';

export default function LoginScreen({ onLogin }) {
  const [esRegistro, setEsRegistro] = useState(false);
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const procesarAccion = async () => {
    setError('');
    setCargando(true);
    try {
      if (esRegistro) {
        if (!nombre.trim()) throw new Error('Ingresa tu nombre');
        
        // Obtener ubicación actual del dispositivo para extraer la comuna automáticamente
        let pos = null;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          }
        } catch {}

        const d = await registro(correo.trim(), nombre.trim(), pass, pos);
        await onLogin({ token: d.token, usuario: d.usuario });
      } else {
        const d = await login(correo.trim(), pass);
        await onLogin({ token: d.token, usuario: d.usuario });
      }
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>🔥 Radar132</Text>
        <Text style={s.sub}>{esRegistro ? 'Crea tu cuenta de civil' : 'Alertas de incendios en tiempo real'}</Text>

        {esRegistro && (
          <TextInput 
            style={s.input} 
            placeholder="Nombre completo" 
            placeholderTextColor={COLORS.muted}
            value={nombre} 
            onChangeText={setNombre} 
          />
        )}

        <TextInput 
          style={s.input} 
          placeholder="Correo electrónico" 
          placeholderTextColor={COLORS.muted}
          autoCapitalize="none" 
          keyboardType="email-address"
          value={correo} 
          onChangeText={setCorreo} 
        />
        
        <TextInput 
          style={s.input} 
          placeholder="Contraseña" 
          placeholderTextColor={COLORS.muted}
          secureTextEntry 
          value={pass} 
          onChangeText={setPass} 
          onSubmitEditing={procesarAccion} 
        />

        {!!error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity style={s.btn} onPress={procesarAccion} disabled={cargando}>
          {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{esRegistro ? 'Registrarse' : 'Entrar'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.switchBtn} onPress={() => { setEsRegistro(!esRegistro); setError(''); }}>
          <Text style={s.switchTxt}>
            {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  logo: { color: COLORS.text, fontSize: 36, fontWeight: '800', textAlign: 'center' },
  sub: { color: COLORS.muted, textAlign: 'center', marginBottom: 28, marginTop: 4 },
  input: { backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16, width: '100%', maxWidth: 400 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6, width: '100%', maxWidth: 400 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#ff8a80', marginBottom: 12, textAlign: 'center' },
  switchBtn: { marginTop: 20, padding: 8 },
  switchTxt: { color: COLORS.primary, fontWeight: '600', textAlign: 'center' },
});