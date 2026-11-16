// App.js
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthErrorHandler, setToken } from './src/api';
import { COLORS } from './src/theme';
import ApiBridge from './src/ApiBridge';
import LoginScreen from './src/screens/LoginScreen';
import CivilScreen from './src/screens/CivilScreen';
import BomberoScreen from './src/screens/BomberoScreen';

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cerrarSesion = async () => {
    setToken(null);
    await AsyncStorage.removeItem('sesion');
    setSesion(null);
  };

  useEffect(() => {
    setAuthErrorHandler(cerrarSesion);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('sesion');
        if (raw) {
          const s = JSON.parse(raw);
          setToken(s.token);
          setSesion(s);
        }
      } catch {}
      setCargando(false);
    })();
  }, []);

  const iniciarSesion = async (s) => {
    setToken(s.token);
    await AsyncStorage.setItem('sesion', JSON.stringify(s));
    setSesion(s);
  };

  let contenido;
  if (cargando) {
    contenido = (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  } else if (!sesion) {
    contenido = <LoginScreen onLogin={iniciarSesion} />;
  } else if (sesion.usuario.rol === 'civil') {
    contenido = <CivilScreen usuario={sesion.usuario} onLogout={cerrarSesion} />;
  } else {
    contenido = <BomberoScreen usuario={sesion.usuario} onLogout={cerrarSesion} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />
      {/* una sola instancia, siempre montada: mantiene la cookie anti-bot */}
      <ApiBridge />
      {contenido}
    </View>
  );
}
