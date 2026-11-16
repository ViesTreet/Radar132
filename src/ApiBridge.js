// src/ApiBridge.js — WebView invisible que carga api/ping.php.
// Así el navegador embebido resuelve el desafío anti-bot de InfinityFree y las llamadas a la API
// se hacen desde ahí (mismo origen, con cookie).
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { BASE_URL } from './config';
import { attachBridge, onBridgeMessage } from './api';

// source constante: si el objeto cambia entre renders el WebView puede recargarse
// y cortar los fetch que estén en vuelo ("failed to fetch")
const SOURCE = { uri: `${BASE_URL}/ping.php?i=1` };

function ApiBridge() {
  const web = useRef(null);

  useEffect(() => {
    attachBridge({ run: (js) => web.current?.injectJavaScript(js + ';true;') });
  }, []);

  // El contenedor exterior del WebView trae flex:1 por defecto; por eso lo envolvemos en un View
  // absoluto de 1x1 y además le damos containerStyle, para que NO ocupe espacio en el layout.
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
    >
      <WebView
        ref={web}
        source={SOURCE}
        onMessage={(e) => onBridgeMessage(e.nativeEvent.data)}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        containerStyle={{ flex: 0, width: 1, height: 1 }}
        style={{ width: 1, height: 1 }}
      />
    </View>
  );
}

// memo: que App.js al re-renderizar no toque el puente
export default React.memo(ApiBridge);