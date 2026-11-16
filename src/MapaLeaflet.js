// src/MapaLeaflet.js — mapa con Leaflet + OpenStreetMap dentro de un WebView (sin SDK de Google Maps)
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { SITE_URL } from './config';

const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;background:#dfe3ea}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var COLORS={ligero:'#f1c40f',medio:'#e67e22',peligroso:'#e74c3c'};
var map=L.map('map',{zoomControl:false}).setView([-36.82,-73.05],13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var markers=L.layerGroup().addTo(map), me=null, routeLine=null, first=true;
function send(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
window.setUser=function(lat,lng){
  if(!me){me=L.circleMarker([lat,lng],{radius:8,color:'#fff',weight:3,fillColor:'#2980b9',fillOpacity:1}).addTo(map);}
  else{me.setLatLng([lat,lng]);}
  if(first){map.setView([lat,lng],14);first=false;}
};
window.setAlertas=function(list){
  markers.clearLayers();
  list.forEach(function(a){
    var c=COLORS[a.nivel]||'#e67e22';
    var m=L.circleMarker([a.lat,a.lng],{radius:13,color:'#222',weight:2,fillColor:c,fillOpacity:0.9}).addTo(markers);
    m.on('click',function(){send({type:'alerta',id:a.id});});
  });
};
window.drawRoute=function(fLat,fLng,tLat,tLng){
  var url='https://router.project-osrm.org/route/v1/driving/'+fLng+','+fLat+';'+tLng+','+tLat+'?overview=full&geometries=geojson';
  fetch(url).then(function(r){return r.json();}).then(function(d){
    if(!d.routes||!d.routes.length){send({type:'routeError'});return;}
    var r=d.routes[0];
    if(routeLine)map.removeLayer(routeLine);
    routeLine=L.geoJSON(r.geometry,{style:{color:'#2980b9',weight:6,opacity:0.9}}).addTo(map);
    map.fitBounds(routeLine.getBounds(),{padding:[40,40]});
    send({type:'route',distance:r.distance,duration:r.duration});
  }).catch(function(){send({type:'routeError'});});
};
window.clearRoute=function(){if(routeLine){map.removeLayer(routeLine);routeLine=null;}};
window.focusOn=function(lat,lng){map.setView([lat,lng],16);};
send({type:'ready'});
</script></body></html>`;

const Mapa = forwardRef(function Mapa({ alertas, userPos, onSelect, onRoute }, ref) {
  const web = useRef(null);
  const [ready, setReady] = useState(false);

  const run = (js) => web.current?.injectJavaScript(js + ';true;');

  useImperativeHandle(ref, () => ({
    drawRoute: (a, b) => run(`drawRoute(${a.lat},${a.lng},${b.lat},${b.lng})`),
    clearRoute: () => run('clearRoute()'),
    focusOn: (p) => run(`focusOn(${p.lat},${p.lng})`),
  }));

  useEffect(() => {
    if (!ready) return;
    const min = (alertas || []).map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, nivel: a.nivel }));
    run(`setAlertas(${JSON.stringify(min)})`);
  }, [alertas, ready]);

  useEffect(() => {
    if (ready && userPos) run(`setUser(${userPos.lat},${userPos.lng})`);
  }, [userPos, ready]);

  const onMessage = (e) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'ready') setReady(true);
      else if (m.type === 'alerta') onSelect && onSelect(m.id);
      else if (m.type === 'route') onRoute && onRoute({ distance: m.distance, duration: m.duration });
      else if (m.type === 'routeError') onRoute && onRoute({ error: true });
    } catch {}
  };

  return (
    <WebView
      ref={web}
      originWhitelist={['*']}
      // baseUrl con tu dominio: OpenStreetMap exige un Referer válido para servir los tiles
      source={{ html: HTML, baseUrl: SITE_URL }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={onMessage}
      style={{ flex: 1 }}
    />
  );
});

export default Mapa;
