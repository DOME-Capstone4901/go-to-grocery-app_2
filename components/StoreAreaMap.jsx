import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { palette, shadows } from '../utils/theme';

const MAP_HEIGHT = 320;

const BRAND_DOT = {
  walmart: '#0071ce',
  kroger: '#004990',
  aldi: '#00529B',
};

/**
 * `react-native-webview` is a no-op stub in browsers ("does not support this platform").
 * Real RN native runtimes report `navigator.product === 'ReactNative'` — use WebView there.
 * Otherwise prefer an iframe when a DOM exists (Expo web and normal browsers).
 */
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
  return (
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  );
}

/**
 * Interactive map (Leaflet + OSM) — pan and zoom, then stores reload for the map center.
 * Native: WebView + injectJavaScript. Web: iframe + postMessage (WebView is not supported on web).
 */
function buildLeafletHtml(centerLat, centerLng, iframeBridge, autoFitStores = false) {
  const la = Number(centerLat);
  const ln = Number(centerLng);
  const autoFitFlag = autoFitStores ? 'true' : 'false';
  const storeListener = iframeBridge
    ? `
  window.addEventListener('message', function(ev) {
    try {
      var raw = typeof ev.data === 'string' ? ev.data : '';
      if (!raw || raw.charAt(0) !== '{') return;
      var d = JSON.parse(raw);
      if (d && d.type === 'stores' && typeof d.data === 'string' && window.__setStores) {
        window.__setStores(d.data);
      }
      if (d && d.type === 'userPick' && typeof d.data === 'string' && window.__setUserPick) {
        window.__setUserPick(d.data);
      }
    } catch (err) {}
  });`
    : '';

  const postToHost = iframeBridge
    ? 'try { if (window.parent) window.parent.postMessage(payload, \'*\'); } catch (e) {}'
    : 'try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload); } catch (e) {}';

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  .leaflet-control-attribution { font-size: 10px; max-width: 60%; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script>
(function() {
  var AUTO_FIT_STORES = ${autoFitFlag};
  var map = L.map('map', { zoomControl: true }).setView([${la}, ${ln}], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  var markerLayer = L.layerGroup().addTo(map);
  var userDotLayer = L.layerGroup().addTo(map);
  var userDot = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function userPickPopupHtml(plat, plng) {
    var la = escAttr(String(plat));
    var ln = escAttr(String(plng));
    return '<div style="padding:4px 2px 6px;text-align:center;min-width:132px">' +
      '<button type="button" class="user-pick-search-btn" data-lat="' + la + '" data-lng="' + ln + '" ' +
      'style="display:block;width:100%;padding:10px 12px;background:#1565c0;color:#fff;border:none;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;box-shadow:0 1px 3px rgba(0,0,0,0.15)">' +
      'Search here</button>' +
      '<p style="font-size:10px;color:#666;margin:8px 0 0;line-height:1.35">Nearest Walmart, Kroger & Aldi</p>' +
      '</div>';
  }
  /** Same rules as mapsDrivingDirectionsUrl (destination-only — for new-tab fallback). */
  function buildGoogleDirectionsHref(s) {
    try {
      var lat = Number(s.lat), lng = Number(s.lng);
      var pid = s.placeId != null ? String(s.placeId) : '';
      var isDemo = pid.indexOf('demo-') === 0;
      var sp = new URLSearchParams();
      sp.set('api', '1');
      sp.set('travelmode', 'driving');
      if (pid && !isDemo && pid.length > 8) {
        sp.set('destination', String(s.name || 'Store').slice(0, 200));
        sp.set('destination_place_id', pid);
      } else if (isFinite(lat) && isFinite(lng)) {
        sp.set('destination', lat + ',' + lng);
      } else {
        sp.set('destination', String(s.name || 'Store'));
      }
      return 'https://www.google.com/maps/dir/?' + sp.toString();
    } catch (e) {
      return 'https://www.google.com/maps';
    }
  }

  window.__setUserPick = function(jsonStr) {
    try {
      var p = JSON.parse(jsonStr);
      if (p.clear || p.lat == null || !isFinite(Number(p.lat))) {
        if (userDot) {
          userDotLayer.removeLayer(userDot);
          userDot = null;
        }
        return;
      }
      var plat = Number(p.lat), plng = Number(p.lng);
      if (!isFinite(plat) || !isFinite(plng)) return;
      if (!userDot) {
        userDot = L.circleMarker([plat, plng], {
          radius: 12,
          fillColor: '#1e88e5',
          color: '#ffffff',
          weight: 3,
          fillOpacity: 0.95
        });
        userDot.bindPopup(userPickPopupHtml(plat, plng));
        userDot.addTo(userDotLayer);
      } else {
        userDot.setLatLng([plat, plng]);
        userDot.bindPopup(userPickPopupHtml(plat, plng));
      }
    } catch (e) {}
  };

  window.__setStores = function(jsonStr) {
    try {
      var stores = JSON.parse(jsonStr);
      markerLayer.clearLayers();
      if (!stores || !stores.length) return;
      var colors = { walmart: '#0071ce', kroger: '#004990', aldi: '#00529B', default: '#c45c26' };
      stores.forEach(function(s) {
        var plat = Number(s.lat), plng = Number(s.lng);
        if (!isFinite(plat) || !isFinite(plng)) return;
        var b = String(s.brand || '').toLowerCase();
        var c = colors[b] || colors.default;
        var m = L.circleMarker([plat, plng], { radius: 10, fillColor: c, color: '#fff', weight: 2, fillOpacity: 0.95 });
        var addr = esc(s.address || 'Address from search');
        var dist = s.miles != null ? ('~' + s.miles + ' mi · ') : '';
        var dirHref = buildGoogleDirectionsHref(s);
        var storeB64 = btoa(unescape(encodeURIComponent(JSON.stringify(s))));
        var popupHtml = '<div style="font-size:12px;line-height:1.45;max-width:240px">' +
          '<b style="font-size:13px">' + esc(s.name || 'Store') + '</b><br/>' +
          '<span style="color:#333">' + esc(String(s.brand || '')) + '</span><br/>' +
          '<span style="color:#444">' + addr + '</span><br/>' +
          '<span style="color:#666;font-size:11px">' + dist + plat.toFixed(4) + ', ' + plng.toFixed(4) + '</span>' +
          '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #e0e0e0">' +
          '<button type="button" class="store-map-dir-btn" data-b64="' + escAttr(storeB64) + '" ' +
          'style="display:block;width:100%;padding:9px 10px;background:#0071ce;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit">' +
          'Directions</button>' +
          '<a href="' + escAttr(dirHref) + '" target="_blank" rel="noopener noreferrer" ' +
          'style="display:block;margin-top:8px;text-align:center;font-size:11px;color:#0071ce;font-weight:600;text-decoration:underline">' +
          'Open in Google Maps (new tab)</a>' +
          '<span style="display:block;margin-top:6px;font-size:10px;color:#888;line-height:1.35">Driving directions use Google Maps (same as Walmart store locator).</span>' +
          '</div></div>';
        m.bindPopup(popupHtml);
        m.on('click', function() {
          var payload = JSON.stringify({ type: 'storeSelect', store: s });
          ${postToHost}
        });
        m.addTo(markerLayer);
      });
      if (AUTO_FIT_STORES && stores.length) {
        var pts = [];
        for (var i = 0; i < stores.length; i++) {
          var st = stores[i];
          var xla = Number(st.lat), xln = Number(st.lng);
          if (isFinite(xla) && isFinite(xln)) pts.push([xla, xln]);
        }
        if (pts.length === 1) {
          map.setView(pts[0], Math.max(map.getZoom(), 14));
        } else if (pts.length > 1) {
          var b = L.latLngBounds(pts);
          map.fitBounds(b, { padding: [36, 36], maxZoom: 15, animate: true });
        }
      }
    } catch (e) {}
  };
  ${storeListener}

  map.getContainer().addEventListener('click', function(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var searchHere = t.closest('.user-pick-search-btn');
    if (searchHere) {
      ev.preventDefault();
      ev.stopPropagation();
      var sla = Number(searchHere.getAttribute('data-lat'));
      var sln = Number(searchHere.getAttribute('data-lng'));
      if (!isFinite(sla) || !isFinite(sln)) return;
      var payloadSearch = JSON.stringify({ type: 'userPickSearch', lat: sla, lng: sln });
      ${postToHost.replace(/payload/g, 'payloadSearch')}
      return;
    }
    var btn = t.closest('.store-map-dir-btn');
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    var b64 = btn.getAttribute('data-b64');
    if (!b64) return;
    try {
      var json = decodeURIComponent(escape(atob(b64)));
      var st = JSON.parse(json);
      var payload = JSON.stringify({ type: 'storeDirections', store: st });
      ${postToHost}
    } catch (err) {}
  });

  var reportMoves = false;
  setTimeout(function() { reportMoves = true; }, 750);
  var idleTimer = null;
  function postIdle() {
    var c = map.getCenter();
    var payload = JSON.stringify({ type: 'mapIdle', lat: c.lat, lng: c.lng });
    ${postToHost}
  }
  map.on('moveend', function() {
    if (!reportMoves) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(postIdle, 450);
  });
  map.on('click', function(e) {
    var ll = e.latlng;
    var payload = JSON.stringify({ type: 'mapClick', lat: ll.lat, lng: ll.lng });
    ${postToHost}
  });
})();
</script>
</body></html>`;
}

export default function StoreAreaMap({
  lat,
  lng,
  subtitle,
  stores = [],
  /** Remount map when the user runs a new location search (text). */
  mapKey,
  /** When true, map pans/zooms to fit all pins whenever the store list updates (can feel jumpy). */
  autoFitStores = false,
  onMapIdle,
  /** Fires when user taps a store pin (full store object from search results). */
  onStoreSelect,
  /** Driving directions from pin popup (Google Maps — parent adds GPS origin when available). */
  onStoreDirections,
  /** Single tap on map (not used if omitted). */
  onMapClick,
  /** Optional: show a blue “search here” dot at this coordinate (omit to hide). */
  pickLat,
  pickLng,
}) {
  const useIframeMap = shouldUseIframeMap();
  const webRef = useRef(null);
  const iframeRef = useRef(null);
  const htmlAnchorRef = useRef({ la: NaN, ln: NaN, key: null });
  const la = Number(lat);
  const ln = Number(lng);
  const coordsValid = Number.isFinite(la) && Number.isFinite(ln);

  const anchorKey = String(mapKey ?? 'map-area');
  if (coordsValid && htmlAnchorRef.current.key !== anchorKey) {
    htmlAnchorRef.current = { la, ln, key: anchorKey };
  }

  const html = useMemo(() => {
    const { la: hLa, ln: hLn } = htmlAnchorRef.current;
    if (!Number.isFinite(hLa) || !Number.isFinite(hLn)) {
      return '<!DOCTYPE html><html><head></head><body></body></html>';
    }
    return buildLeafletHtml(hLa, hLn, useIframeMap, autoFitStores);
  }, [anchorKey, useIframeMap, autoFitStores]);

  const storesRef = useRef(stores);
  storesRef.current = stores;

  const pickLatRef = useRef(pickLat);
  const pickLngRef = useRef(pickLng);
  pickLatRef.current = pickLat;
  pickLngRef.current = pickLng;

  const pushMarkersToWeb = useCallback(() => {
    const payload = JSON.stringify(storesRef.current ?? []);
    if (useIframeMap) {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({ type: 'stores', data: payload }), '*');
      }
      return;
    }
    const wv = webRef.current;
    if (!wv) return;
    const js = `(function(){ try { if (window.__setStores) window.__setStores(${JSON.stringify(payload)}); } catch(e) {} true; })();`;
    wv.injectJavaScript(js);
  }, [useIframeMap]);

  const pushUserPickToWeb = useCallback(() => {
    const pla = pickLatRef.current;
    const pln = pickLngRef.current;
    const inner =
      pla != null &&
      pln != null &&
      Number.isFinite(Number(pla)) &&
      Number.isFinite(Number(pln))
        ? JSON.stringify({ lat: Number(pla), lng: Number(pln) })
        : JSON.stringify({ clear: true });
    if (useIframeMap) {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({ type: 'userPick', data: inner }), '*');
      }
      return;
    }
    const wv = webRef.current;
    if (!wv) return;
    const escaped = JSON.stringify(inner);
    const js = `(function(){ try { if (window.__setUserPick) window.__setUserPick(${escaped}); } catch(e) {} true; })();`;
    wv.injectJavaScript(js);
  }, [useIframeMap]);

  useEffect(() => {
    pushMarkersToWeb();
  }, [stores, pushMarkersToWeb]);

  useEffect(() => {
    pushUserPickToWeb();
  }, [pickLat, pickLng, pushUserPickToWeb]);

  useEffect(() => {
    if (!useIframeMap) return undefined;
    const handler = e => {
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      try {
        const raw = typeof e.data === 'string' ? e.data : '';
        if (!raw || raw.charAt(0) !== '{') return;
        const msg = JSON.parse(raw);
        if (msg.type === 'mapIdle' && msg.lat != null && msg.lng != null && onMapIdle) {
          onMapIdle(Number(msg.lat), Number(msg.lng));
        }
        if (msg.type === 'storeSelect' && msg.store && onStoreSelect) {
          onStoreSelect(msg.store);
        }
        if (msg.type === 'storeDirections' && msg.store && onStoreDirections) {
          onStoreDirections(msg.store);
        }
        if (
          (msg.type === 'mapClick' || msg.type === 'userPickSearch') &&
          msg.lat != null &&
          msg.lng != null &&
          onMapClick
        ) {
          onMapClick(Number(msg.lat), Number(msg.lng));
        }
      } catch {
        /* ignore */
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
    return undefined;
  }, [useIframeMap, onMapIdle, onStoreSelect, onStoreDirections, onMapClick]);

  if (!coordsValid) {
    return null;
  }

  const webviewKey = mapKey != null && String(mapKey).length > 0 ? String(mapKey) : 'map-area';

  const NativeWebView = useMemo(() => {
    if (useIframeMap) return null;
    return require('react-native-webview').default;
  }, [useIframeMap]);

  const pinCounts = useMemo(() => {
    const c = { walmart: 0, kroger: 0, aldi: 0 };
    for (const s of stores || []) {
      const b = String(s.brand || '').toLowerCase();
      if (b === 'walmart' || b === 'kroger' || b === 'aldi') c[b] += 1;
    }
    return c;
  }, [stores]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Map</Text>
      <Text style={styles.hint}>
        Tap the map to place a pin, then tap Search here in the bubble (or tap the map again) to load nearest stores.
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {useIframeMap ? (
        // react-native-webview is a stub on web; iframe + postMessage works in the browser.
        // eslint-disable-next-line react/no-unknown-property
        <iframe
          key={webviewKey}
          ref={iframeRef}
          title="Store search map"
          srcDoc={html}
          style={{
            width: '100%',
            height: MAP_HEIGHT,
            borderWidth: 0,
            borderStyle: 'solid',
            backgroundColor: '#dfe5e0',
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onLoad={() => {
            pushMarkersToWeb();
            pushUserPickToWeb();
          }}
        />
      ) : NativeWebView ? (
        <NativeWebView
          ref={webRef}
          key={webviewKey}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={() => {
            pushMarkersToWeb();
            pushUserPickToWeb();
          }}
          onMessage={event => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'mapIdle' && msg.lat != null && msg.lng != null && onMapIdle) {
                onMapIdle(Number(msg.lat), Number(msg.lng));
              }
              if (msg.type === 'storeSelect' && msg.store && onStoreSelect) {
                onStoreSelect(msg.store);
              }
              if (msg.type === 'storeDirections' && msg.store && onStoreDirections) {
                onStoreDirections(msg.store);
              }
              if (
                (msg.type === 'mapClick' || msg.type === 'userPickSearch') &&
                msg.lat != null &&
                msg.lng != null &&
                onMapClick
              ) {
                onMapClick(Number(msg.lat), Number(msg.lng));
              }
            } catch {
              /* ignore */
            }
          }}
          {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
        />
      ) : null}

      <View style={styles.pinFooter}>
        {stores.length === 0 ? (
          <Text style={styles.legendHint}>
            Blue dot = your search point. Store locations are in the list under the map (not drawn as extra pins).
          </Text>
        ) : (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BRAND_DOT.walmart }]} />
              <Text style={styles.legendText}>Walmart ({pinCounts.walmart})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BRAND_DOT.kroger }]} />
              <Text style={styles.legendText}>Kroger ({pinCounts.kroger})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BRAND_DOT.aldi }]} />
              <Text style={styles.legendText}>Aldi ({pinCounts.aldi})</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  title: {
    fontSize: 14,
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
    paddingBottom: 6,
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 12,
    color: palette.muted,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  webview: {
    height: MAP_HEIGHT,
    width: '100%',
    backgroundColor: '#dfe5e0',
  },
  pinFooter: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surfaceAlt,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.text,
  },
  legendHint: {
    fontSize: 12,
    color: palette.muted,
    lineHeight: 18,
  },
});
