// src/api.js
import { BASE_URL } from './config';

let token = null;
let onAuthError = null;
export const setToken = (t) => { token = t; };
export const setAuthErrorHandler = (fn) => { onAuthError = fn; };

let bridge = null;
let cookie = '';
let seq = 0;
const pending = new Map();
let readyResolve;
const readyPromise = new Promise((res) => { readyResolve = res; });

export function attachBridge(b) { bridge = b; }

export function onBridgeMessage(raw) {
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  if (m.type === 'ready') {
    cookie = m.cookie || '';
    readyResolve();
    return;
  }
  if (m.id != null && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    clearTimeout(p.t);
    p.resolve(m);
  }
}

function waitReady() {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error(
      'No se pudo establecer conexión con el servidor (anti-bot de InfinityFree). Revisa tu internet y SITE_URL.'
    )), 30000);
  });
  return Promise.race([readyPromise, timeout]).finally(() => clearTimeout(timer));
}

const LS = new RegExp(String.fromCharCode(0x2028), 'g');
const PS = new RegExp(String.fromCharCode(0x2029), 'g');
const esc = (s) => JSON.stringify(s).replace(LS, '\\u2028').replace(PS, '\\u2029');

function bridgeFetch(url, method, bodyStr) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const t = setTimeout(() => { pending.delete(id); reject(new Error('Tiempo de espera agotado')); }, 45000);
    pending.set(id, { resolve, t });
    const js =
      `(function(){var id=${id};` +
      `fetch(${esc(url)},{method:${esc(method)},headers:{'Content-Type':'text/plain;charset=UTF-8'},` +
      `body:${bodyStr ? esc(bodyStr) : 'undefined'},credentials:'same-origin'})` +
      `.then(function(r){return r.text().then(function(t){return{status:r.status,text:t};});})` +
      `.then(function(o){window.ReactNativeWebView.postMessage(JSON.stringify({id:id,status:o.status,text:o.text}));})` +
      `.catch(function(e){window.ReactNativeWebView.postMessage(JSON.stringify({id:id,status:0,text:'',err:String(e)+' | pagina: '+location.href}));});` +
      `})();`;
    bridge.run(js);
  });
}

export function imageSource(url) {
  return { uri: `${url}?i=1`, headers: cookie ? { Cookie: cookie } : undefined };
}

async function call(endpoint, { method = 'GET', params = {}, body } = {}) {
  await waitReady();
  if (!bridge) throw new Error('El puente de conexión no está listo');

  const qs = new URLSearchParams({ i: '1', ...params });
  if (token) qs.set('token', token);
  const url = `${BASE_URL}/${endpoint}?${qs.toString()}`;

  const r = await bridgeFetch(url, method, body ? JSON.stringify(body) : '');
  if (r.err) throw new Error(`Error de red: ${r.err} | api: ${BASE_URL}/${endpoint}`);

  let data;
  try {
    data = JSON.parse(r.text);
  } catch {
    throw new Error(`No es JSON (HTTP ${r.status}): ${String(r.text).slice(0, 150)}`);
  }

  if (r.status === 401 && token && onAuthError) onAuthError();
  if (r.status >= 400 || data.error) {
    const err = new Error(data.error || 'Error de servidor');
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function login(correo, contrasena) {
  return call('login.php', { method: 'POST', body: { correo, contrasena } });
}

// En src/api.js
export function registro(correo, nombre, contrasena, pos) {
  return call('registro.php', { 
    method: 'POST', 
    body: { 
      correo, 
      nombre, 
      contrasena, 
      lat: pos ? pos.lat : null, 
      lng: pos ? pos.lng : null 
    } 
  });
}

export function getAlertas(pos) {
  const params = pos ? { lat: String(pos.lat), lng: String(pos.lng), radio_km: '10' } : {};
  return call('alertas.php', { params });
}

export function getAlerta(id) {
  return call('alerta.php', { params: { id: String(id) } });
}

// Adaptado para enviar la estructura que maneja el backend unificado de Radar132
// En src/api.js — reemplaza crearAlerta por esta versión
export function crearAlerta({ lat, lng, comentario, direccion, fotos }) {
  return call('crear_alerta.php', {
    method: 'POST',
    body: {
      lat,
      lng,
      comentario: comentario || '',
      direccion: direccion || '',
      fotos_b64: (fotos || []).map((f) => f.base64).filter(Boolean),
    },
  });
}