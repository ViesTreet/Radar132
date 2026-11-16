// src/useLocation.js
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export default function useLocation() {
  const [pos, setPos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let sub;
    let cancelado = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Necesito permiso de ubicación para funcionar.');
        return;
      }
      try {
        const actual = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelado) setPos({ lat: actual.coords.latitude, lng: actual.coords.longitude });
      } catch {}
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 },
        (l) => setPos({ lat: l.coords.latitude, lng: l.coords.longitude })
      );
    })();
    return () => { cancelado = true; if (sub) sub.remove(); };
  }, []);

  return { pos, error };
}
