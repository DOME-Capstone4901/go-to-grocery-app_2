import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { palette, shadows } from '../../utils/theme';

const DEFAULT_HEIGHT = 340;

/** Only the first tracker is rendered — single blue dot on the map. */
function singleTrackerDot(dots) {
  if (!Array.isArray(dots) || !dots.length) return [];
  return [dots[0]];
}

function shouldUseIframeMap() {
  try {
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return false;
    }
  } catch {
    /* ignore */
  }
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return false;
  }
  if (Platform.OS === 'web') {
    return true;
  }
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function buildLiveMapHtml(centerLat, centerLng, iframeBridge) {
  const la = Number(centerLat);
  const ln = Number(centerLng);
  const postToHost = iframeBridge
    ? 'try { if (window.parent) window.parent.postMessage(payload, \'*\'); } catch (e) {}'
    : 'try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload); } catch (e) {}';

  const iframeListener = iframeBridge
    ? `
  window.addEventListener('message', function(ev) {
    try {
      var raw = typeof ev.data === 'string' ? ev.data : '';
      if (!raw || raw.charAt(0) !== '{') return;
      var d = JSON.parse(raw);
      if (d && d.type === 'liveOverlay' && d.data != null) {
        var inner = typeof d.data === 'string' ? d.data : JSON.stringify(d.data);
        if (window.__setLiveOverlay) window.__setLiveOverlay(inner);
      }
    } catch (err) {}
  });`
    : '';

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  .leaflet-control-attribution { font-size: 10px; max-width: 55%; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script>
(function() {
  var map = L.map('map', { zoomControl: true }).setView([${la}, ${ln}], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  var dotLayer = L.layerGroup().addTo(map);
  var storeLayer = L.layerGroup().addTo(map);

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  }

  var liveTracker = null;

  window.__setLiveOverlay = function(jsonStr) {
    try {
      var payload = JSON.parse(jsonStr);
      storeLayer.clearLayers();
      var c = payload.center || {};
      var cla = Number(c.lat), cln = Number(c.lng);
      if (isFinite(cla) && isFinite(cln)) {
        map.setView([cla, cln], Math.min(map.getZoom(), 14), { animate: true, duration: 0.25 });
      }
      var dotArr = payload.dots || [];
      var d = dotArr[0];
      if (d && isFinite(Number(d.lat)) && isFinite(Number(d.lng))) {
        var plat = Number(d.lat), plng = Number(d.lng);
        var moving = !!d.moving;
        var sel = !!d.selected;
        var fill = moving ? '#4da3ff' : '#0066cc';
        var rad = moving ? 9 : (sel ? 13 : 10);
        var did = String(d.id || 'dot-1');
        if (!liveTracker) {
          liveTracker = L.circleMarker([plat, plng], {
            radius: rad,
            fillColor: fill,
            color: sel ? '#00264d' : '#ffffff',
            weight: sel ? 4 : 2,
            fillOpacity: 0.95
          });
          liveTracker.addTo(dotLayer);
          liveTracker.on('click', function() {
            var id = (liveTracker && liveTracker.options && liveTracker.options.dotId) ? liveTracker.options.dotId : 'dot-1';
            var payload = JSON.stringify({ type: 'dotPress', id: String(id) });
            ${postToHost}
          });
        } else {
          liveTracker.setLatLng([plat, plng]);
          liveTracker.setStyle({
            radius: rad,
            fillColor: fill,
            color: sel ? '#00264d' : '#ffffff',
            weight: sel ? 4 : 2,
            fillOpacity: 0.95
          });
        }
        liveTracker.options.dotId = did;
        liveTracker.bindPopup('<div style="font-size:12px;line-height:1.4"><b>' + esc(d.label || did) + '</b><br/>' +
          (moving ? '<span style="color:#1565c0">● Moving</span>' : '<span style="color:#0d47a1">■ Stopped</span>') +
          '<br/><span style="color:#555;font-size:11px">' + plat.toFixed(5) + ', ' + plng.toFixed(5) + '</span></div>');
      } else {
        if (liveTracker) {
          dotLayer.removeLayer(liveTracker);
          liveTracker = null;
        }
      }
      (payload.stores || []).forEach(function(s) {
        var plat = Number(s.lat), plng = Number(s.lng);
        if (!isFinite(plat) || !isFinite(plng)) return;
        var mk = L.circleMarker([plat, plng], {
          radius: 7,
          fillColor: '#e67e22',
          color: '#fff',
          weight: 2,
          fillOpacity: 0.95
        });
        var nm = esc(s.name || 'Store');
        var cat = esc(s.category || '');
        var dist = s.distanceKm != null ? (Math.round(Number(s.distanceKm) * 100) / 100) + ' km' : '';
        mk.bindPopup('<div style="font-size:12px;max-width:220px"><b>' + nm + '</b><br/>' +
          '<span style="color:#555">' + cat + '</span><br/>' +
          '<span style="color:#888;font-size:11px">' + dist + '</span></div>');
        mk.on('click', function() {
          var payload = JSON.stringify({ type: 'storePress', store: s });
          ${postToHost}
        });
        mk.addTo(storeLayer);
      });
    } catch (err) {}
  };
  ${iframeListener}
})();
</script>
</body></html>`;
}

export default function LiveTrackedMap({
  centerLat,
  centerLng,
  mapKey,
  dots = [],
  stores = [],
  height = DEFAULT_HEIGHT,
  title = 'Live map',
  hint = 'Blue = live tracker · Orange = nearby stores. Tap a pin for details.',
  onDotPress,
  onStorePress,
}) {
  const useIframeMap = shouldUseIframeMap();
  const webRef = useRef(null);
  const iframeRef = useRef(null);
  const htmlAnchorRef = useRef({ la: NaN, ln: NaN, key: null });

  const la = Number(centerLat);
  const ln = Number(centerLng);
  const coordsValid = Number.isFinite(la) && Number.isFinite(ln);

  const anchorKey = String(mapKey ?? 'live-map');
  if (coordsValid && htmlAnchorRef.current.key !== anchorKey) {
    htmlAnchorRef.current = { la, ln, key: anchorKey };
  }

  const html = useMemo(() => {
    const { la: hLa, ln: hLn } = htmlAnchorRef.current;
    if (!Number.isFinite(hLa) || !Number.isFinite(hLn)) {
      return '<!DOCTYPE html><html><head></head><body></body></html>';
    }
    return buildLiveMapHtml(hLa, hLn, useIframeMap);
  }, [anchorKey, useIframeMap]);

  const payloadRef = useRef('');
  const dotsOne = useMemo(() => singleTrackerDot(dots), [dots]);

  const pushOverlay = useCallback(() => {
    const { la: cLa, ln: cLn } = htmlAnchorRef.current;
    const inner = JSON.stringify({
      center: { lat: cLa, lng: cLn },
      dots: dotsOne,
      stores,
    });
    if (payloadRef.current === inner) return;
    payloadRef.current = inner;

    if (useIframeMap) {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({ type: 'liveOverlay', data: inner }), '*');
      }
      return;
    }
    const wv = webRef.current;
    if (!wv) return;
    const escaped = JSON.stringify(inner);
    const js = `(function(){ try { if (window.__setLiveOverlay) window.__setLiveOverlay(${escaped}); } catch(e) {} true; })();`;
    wv.injectJavaScript(js);
  }, [useIframeMap, dotsOne, stores]);

  useEffect(() => {
    pushOverlay();
  }, [pushOverlay]);

  useEffect(() => {
    if (!useIframeMap) return undefined;
    const handler = e => {
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      try {
        const raw = typeof e.data === 'string' ? e.data : '';
        if (!raw || raw.charAt(0) !== '{') return;
        const msg = JSON.parse(raw);
        if (msg.type === 'dotPress' && msg.id && onDotPress) onDotPress(String(msg.id));
        if (msg.type === 'storePress' && msg.store && onStorePress) onStorePress(msg.store);
      } catch {
        /* ignore */
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
    return undefined;
  }, [useIframeMap, onDotPress, onStorePress]);

  const NativeWebView = useMemo(() => {
    if (useIframeMap) return null;
    return require('react-native-webview').default;
  }, [useIframeMap]);

  if (!coordsValid) {
    return (
      <View style={[styles.wrap, { minHeight: height }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>Waiting for map coordinates…</Text>
      </View>
    );
  }

  const webviewKey = mapKey != null && String(mapKey).length > 0 ? String(mapKey) : 'live-map';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {useIframeMap ? (
        <iframe
          key={webviewKey}
          ref={iframeRef}
          title="Live tracked map"
          srcDoc={html}
          style={{
            width: '100%',
            height,
            borderWidth: 0,
            borderStyle: 'solid',
            backgroundColor: '#dfe5e0',
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onLoad={pushOverlay}
        />
      ) : NativeWebView ? (
        <NativeWebView
          ref={webRef}
          key={webviewKey}
          source={{ html }}
          style={[styles.webview, { height }]}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={pushOverlay}
          onMessage={event => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'dotPress' && msg.id && onDotPress) onDotPress(String(msg.id));
              if (msg.type === 'storePress' && msg.store && onStorePress) onStorePress(msg.store);
            } catch {
              /* ignore */
            }
          }}
          {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.greenDeep,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: palette.muted,
    paddingHorizontal: 12,
    paddingBottom: 8,
    lineHeight: 17,
  },
  webview: {
    width: '100%',
    backgroundColor: '#dfe5e0',
  },
});
