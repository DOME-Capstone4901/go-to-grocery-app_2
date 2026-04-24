import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { palette } from '../../utils/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_SIZE = Math.min(Math.round(SCREEN_W * 0.72), 290);
const FRAME_TOP = Math.round((SCREEN_H - FRAME_SIZE) / 2) - 50;
const FRAME_LEFT = Math.round((SCREEN_W - FRAME_SIZE) / 2);

const BARCODE_TYPES = [
  'ean13', 'ean8', 'upc_a', 'upc_e',
  'code128', 'code39', 'code93', 'itf14',
  'qr', 'pdf417', 'aztec', 'datamatrix',
];

const MONTH_MAP = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function parseOcrDate(text) {
  if (!text) return null;
  const up = text.toUpperCase().replace(/\s+/g, ' ').trim();

  // Strip common prefixes
  const prefixed = up.match(
    /(?:BEST\s+BY|USE\s+BY|EXPIRES?D?|BEST\s+BEFORE|EXP)\s*:?\s*(.+)/
  );
  const t = prefixed ? prefixed[1] : up;

  // Month name + day + year: JUN 26 2026
  const mdy = t.match(
    /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[.,\s]+(\d{1,2})[.,\s]+(\d{2,4})/
  );
  if (mdy) {
    const y = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    return `${MONTH_MAP[mdy[1]]}/${mdy[2].padStart(2, '0')}/${y}`;
  }

  // Month name + year: JUN 2026 or JUN/26
  const my = t.match(
    /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\s]+(\d{2,4})/
  );
  if (my) {
    const y = my[2].length === 2 ? `20${my[2]}` : my[2];
    return `${MONTH_MAP[my[1]]}/01/${y}`;
  }

  // ISO: YYYY-MM-DD
  const iso = t.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (iso) {
    return `${iso[2].padStart(2, '0')}/${iso[3].padStart(2, '0')}/${iso[1]}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const full = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (full) {
    const y = full[3].length === 2 ? `20${full[3]}` : full[3];
    return `${full[1].padStart(2, '0')}/${full[2].padStart(2, '0')}/${y}`;
  }

  // MM/YYYY or MM/YY
  const myShort = t.match(/(\d{1,2})\/(\d{4}|\d{2})(?!\d)/);
  if (myShort) {
    const y = myShort[2].length === 2 ? `20${myShort[2]}` : myShort[2];
    return `${myShort[1].padStart(2, '0')}/01/${y}`;
  }

  return null;
}

async function runOcr(base64, apiKey) {
  const form = new FormData();
  form.append('base64Image', `data:image/jpg;base64,${base64}`);
  form.append('apikey', apiKey);
  form.append('language', 'eng');
  form.append('isOverlayRequired', 'false');
  const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
  const json = await res.json();
  return json?.ParsedResults?.[0]?.ParsedText ?? '';
}

export default function Scan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const scanLock = useRef(false);

  const [mode, setMode] = useState('barcode');
  const [torchOn, setTorchOn] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [foundDate, setFoundDate] = useState(null);
  const [success, setSuccess] = useState(false);

  const scanLineY = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  const startScanLine = useCallback(() => {
    scanLineY.setValue(0);
    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, { toValue: FRAME_SIZE - 4, duration: 1600, useNativeDriver: true }),
        Animated.timing(scanLineY, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    animRef.current.start();
  }, [scanLineY]);

  const stopScanLine = useCallback(() => {
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mode === 'barcode' && !success) {
      startScanLine();
    } else {
      stopScanLine();
    }
    return stopScanLine;
  }, [mode, success, startScanLine, stopScanLine]);

  const reset = useCallback(() => {
    scanLock.current = false;
    setScanResult(null);
    setFoundDate(null);
    setSuccess(false);
    setOcrLoading(false);
  }, []);

  // Reset when screen gains focus (e.g. returning from addToPantry)
  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset])
  );

  const handleBarcodeScan = useCallback(({ type, data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setSuccess(true);
    setScanResult({ type, data });
    Vibration.vibrate(100);
    setTimeout(() => {
      router.push({ pathname: '/(tabs)/addToPantry', params: { barcode: data } });
    }, 2000);
  }, [router]);

  const handleCapture = async () => {
    if (!cameraRef.current || ocrLoading) return;
    const apiKey = process.env.EXPO_PUBLIC_OCR_KEY;
    if (!apiKey) {
      alert('OCR key missing. Add EXPO_PUBLIC_OCR_KEY to your .env file.');
      return;
    }
    setOcrLoading(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      const text = await runOcr(pic.base64, apiKey);
      let date = null;
      for (const line of text.split('\n')) {
        date = parseOcrDate(line);
        if (date) break;
      }
      if (date) {
        Vibration.vibrate(100);
        setFoundDate(date);
        setSuccess(true);
      } else {
        alert('No expiry date found. Try better lighting or move closer.');
      }
    } catch (e) {
      alert('Scan error: ' + e.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const switchMode = (m) => { reset(); setMode(m); };

  const bracketColor = success ? '#3E9954' : mode === 'barcode' ? palette.orange : palette.sun;

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permScreen}>
        <Ionicons name="camera-outline" size={64} color={palette.muted} />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permMsg}>Allow camera access to scan barcodes and expiry dates.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: BARCODE_TYPES } : undefined}
        onBarcodeScanned={mode === 'barcode' ? handleBarcodeScan : undefined}
      />

      {/* Darkening overlay — transparent scan window cut out via surrounding views */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ height: FRAME_TOP, backgroundColor: 'rgba(0,0,0,0.65)' }} />
        <View style={{ height: FRAME_SIZE, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
          <View style={{ width: FRAME_SIZE }} />
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
        </View>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
      </View>

      {/* Scan frame decorations */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: FRAME_TOP,
          left: FRAME_LEFT,
          width: FRAME_SIZE,
          height: FRAME_SIZE,
        }}
      >
        {/* Corner brackets */}
        <View style={[styles.bracket, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderColor: bracketColor }]} />
        <View style={[styles.bracket, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderColor: bracketColor }]} />
        <View style={[styles.bracket, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: bracketColor }]} />
        <View style={[styles.bracket, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderColor: bracketColor }]} />

        {/* Animated scan line (barcode mode) */}
        {mode === 'barcode' && !success && (
          <Animated.View
            style={[
              styles.scanLine,
              { backgroundColor: palette.orange, transform: [{ translateY: scanLineY }] },
            ]}
          />
        )}

        {/* Yellow crosshair (expiry mode) */}
        {mode === 'expiry' && !foundDate && (
          <View style={styles.crosshairWrap}>
            <View style={[styles.crosshairH, { backgroundColor: palette.sun }]} />
            <View style={[styles.crosshairV, { backgroundColor: palette.sun }]} />
          </View>
        )}

        {/* Success checkmark */}
        {success && (
          <View style={styles.successOverlay}>
            <Ionicons name="checkmark-circle" size={72} color="#3E9954" />
          </View>
        )}
      </View>

      {/* Torch button */}
      <TouchableOpacity
        style={[styles.torchBtn, torchOn && styles.torchActive]}
        onPress={() => setTorchOn(v => !v)}
      >
        <Ionicons
          name={torchOn ? 'flashlight' : 'flashlight-outline'}
          size={22}
          color={torchOn ? '#FFD700' : '#fff'}
        />
      </TouchableOpacity>

      {/* Barcode result card */}
      {scanResult && !foundDate && (
        <View style={styles.resultCard}>
          <Ionicons name="barcode-outline" size={28} color={palette.orange} />
          <Text style={styles.resultLabel}>{scanResult.type.toUpperCase()}</Text>
          <Text style={styles.resultValue} numberOfLines={2}>{scanResult.data}</Text>
          <Text style={styles.resultHint}>Navigating to Add Item…</Text>
          <TouchableOpacity style={[styles.actionBtn, styles.orangeBtn]} onPress={reset}>
            <Text style={styles.actionBtnText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OCR loading card */}
      {ocrLoading && (
        <View style={styles.resultCard}>
          <ActivityIndicator size="large" color={palette.orange} />
          <Text style={[styles.resultHint, { marginTop: 12 }]}>Reading text…</Text>
        </View>
      )}

      {/* Expiry date result card */}
      {foundDate && !ocrLoading && (
        <View style={styles.resultCard}>
          <Ionicons name="calendar-outline" size={28} color={palette.sun} />
          <Text style={styles.resultLabel}>Expiry Date Found</Text>
          <Text style={styles.resultValue}>{foundDate}</Text>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.actionBtn, styles.ghostBtn]} onPress={reset}>
              <Text style={styles.ghostBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.orangeBtn]}
              onPress={() =>
                router.push({ pathname: '/(tabs)/addToPantry', params: { expirationDate: foundDate } })
              }
            >
              <Text style={styles.actionBtnText}>Use This Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Shutter button — expiry mode idle */}
      {mode === 'expiry' && !foundDate && !ocrLoading && (
        <View style={styles.shutterWrap}>
          <TouchableOpacity style={styles.shutterBtn} onPress={handleCapture} activeOpacity={0.7}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      )}

      {/* Mode toggle pill */}
      <View style={styles.modeBar}>
        {[
          { key: 'barcode', label: 'Barcode', icon: 'barcode-outline' },
          { key: 'expiry', label: 'Expiry Date', icon: 'calendar-outline' },
        ].map(({ key, label, icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.modeChip, mode === key && styles.modeChipActive]}
            onPress={() => switchMode(key)}
          >
            <Ionicons
              name={icon}
              size={15}
              color={mode === key ? '#fff' : 'rgba(255,255,255,0.55)'}
            />
            <Text style={[styles.modeChipText, mode === key && styles.modeChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Permission screen
  permScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
    padding: 30,
    gap: 10,
  },
  permTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.greenDeep,
    marginTop: 10,
    textAlign: 'center',
  },
  permMsg: {
    fontSize: 15,
    color: palette.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    marginTop: 14,
    backgroundColor: palette.orange,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Scan frame
  bracket: {
    position: 'absolute',
    width: 26,
    height: 26,
  },
  scanLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 3,
    borderRadius: 2,
    opacity: 0.85,
  },
  crosshairWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairH: {
    width: 36,
    height: 2,
  },
  crosshairV: {
    width: 2,
    height: 36,
    position: 'absolute',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(62,153,84,0.12)',
  },

  // Torch
  torchBtn: {
    position: 'absolute',
    top: 52,
    right: 18,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  torchActive: {
    backgroundColor: 'rgba(60,50,0,0.7)',
    borderColor: '#FFD700',
  },

  // Result card
  resultCard: {
    position: 'absolute',
    bottom: 155,
    left: 20,
    right: 20,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    gap: 6,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
  resultHint: {
    fontSize: 13,
    color: palette.muted,
    marginTop: 2,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  orangeBtn: {
    backgroundColor: palette.orange,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  ghostBtnText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },

  // Shutter
  shutterWrap: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },

  // Mode toggle
  modeBar: {
    position: 'absolute',
    bottom: 78,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 26,
    padding: 4,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 6,
  },
  modeChipActive: {
    backgroundColor: palette.orange,
  },
  modeChipText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: '#fff',
  },
});
