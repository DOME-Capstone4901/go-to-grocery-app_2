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
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { palette } from '../../utils/theme';
import { lookupProductByBarcode } from '../../utils/barcodeLookup';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_SIZE = Math.min(Math.round(SCREEN_W * 0.72), 290);
const FRAME_TOP = Math.round((SCREEN_H - FRAME_SIZE) / 2) - 50;
const FRAME_LEFT = Math.round((SCREEN_W - FRAME_SIZE) / 2);
const THIS_YEAR = new Date().getFullYear();
const OCR_TIMEOUT_MS = 15000;

const BARCODE_TYPES = [
  'ean13', 'ean8', 'upc_a', 'upc_e',
  'code128', 'code39', 'code93', 'itf14',
  'qr', 'pdf417', 'aztec', 'datamatrix',
];

const MONTH_MAP = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const MONTH_WORDS = {
  JANUARY: 'JAN',
  FEBRUARY: 'FEB',
  MARCH: 'MAR',
  APRIL: 'APR',
  JUNE: 'JUN',
  JULY: 'JUL',
  AUGUST: 'AUG',
  SEPTEMBER: 'SEP',
  SEPT: 'SEP',
  OCTOBER: 'OCT',
  NOVEMBER: 'NOV',
  DECEMBER: 'DEC',
};

// Correct common OCR misreads in numeric contexts: O→0 and I→1.
// Patterns are constrained so month names (OCT, JAN, etc.) are not affected.
function fixOcrArtifacts(text) {
  return text
    .replace(/(\d)O(\d)/g,      (_, a, b) => `${a}0${b}`)
    .replace(/(\d)O([\/\-. ])/g, (_, a, b) => `${a}0${b}`)
    .replace(/([\/\-. ])O(\d)/g, (_, a, b) => `${a}0${b}`)
    .replace(/\bO(\d)/g,        (_, a) => `0${a}`)
    .replace(/(\d)I(\d)/g,      (_, a, b) => `${a}1${b}`)
    .replace(/([\/\-. ])I(\d)/g, (_, a, b) => `${a}1${b}`)
    .replace(/\bI(\d)/g,        (_, a) => `1${a}`);
}

function normalizeOcrYear(value) {
  const raw = String(value || '').trim();
  if (raw.length === 2) return `20${raw}`;
  return raw;
}

function formatNumericOcrDate(firstPart, secondPart, yearPart) {
  const first = Number(firstPart);
  const second = Number(secondPart);
  const year = Number(normalizeOcrYear(yearPart));

  if (!Number.isFinite(first) || !Number.isFinite(second) || !Number.isFinite(year)) {
    return null;
  }

  let month = first;
  let day = second;

  // Some labels use DD-MM-YYYY. If the first number cannot be a month, flip it.
  if (first > 12 && second <= 12) {
    month = second;
    day = first;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
}

function normalizeMonthWords(text) {
  let out = String(text || '').toUpperCase();
  for (const [word, shortName] of Object.entries(MONTH_WORDS)) {
    out = out.replace(new RegExp(`\\b${word}\\b`, 'g'), shortName);
  }
  return out;
}

function isValidOcrDate(dateStr) {
  if (!dateStr) return false;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  const realDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  return realDate && year >= THIS_YEAR - 1 && year <= THIS_YEAR + 15;
}

function _parseOcrDateRaw(text) {
  if (!text) return null;
  const up = normalizeMonthWords(text).replace(/\s+/g, ' ').trim();

  // Strip common prefixes
  const prefixed = up.match(
    /(?:BEST\s+(?:IF\s+)?(?:USED\s+)?BY|BEST\s+BEFORE(?:\s+END)?|USE\s+BY|USED\s+BY|SELL\s+BY|EXPIRES?(?:S|D)?|EXP\.?|BB[DE]?|MHD)\s*:?\s*(.+)/
  );
  const t = prefixed ? prefixed[1] : up;

  // Dot-matrix bakery labels can OCR as "11:18:23 AM 2026".
  // Use the first two numbers plus the final year as MM/DD/YYYY.
  const timeLikeWithYear = t.match(
    /\b(\d{1,2})\s*[:\-\/]\s*(\d{1,2})\s*[:\-\/]\s*\d{1,2}\s*(?:AM|PM)?\s*(20\d{2}|19\d{2})\b/
  );
  if (timeLikeWithYear) {
    const formatted = formatNumericOcrDate(
      timeLikeWithYear[1],
      timeLikeWithYear[2],
      timeLikeWithYear[3]
    );
    if (formatted) return formatted;
  }

  // Handles noisy OCR with an extra lot/time number before the year:
  // "11 18 23 AM 2026" -> 11/18/2026.
  const numericWithExtraCodeAndYear = t.match(
    /\b(\d{1,2})[\s.\-\/:]+(\d{1,2})[\s.\-\/:]+(?:\d{1,2}\s*(?:AM|PM)?\s*)?(20\d{2}|19\d{2})\b/
  );
  if (numericWithExtraCodeAndYear) {
    const formatted = formatNumericOcrDate(
      numericWithExtraCodeAndYear[1],
      numericWithExtraCodeAndYear[2],
      numericWithExtraCodeAndYear[3]
    );
    if (formatted) return formatted;
  }

  // Handles labels that OCR as plain spaced numbers: "11 18 2026".
  const spacedNumericDate = t.match(/\b(\d{1,2})\s+(\d{1,2})\s+(20\d{2}|19\d{2}|\d{2})\b/);
  if (spacedNumericDate) {
    const formatted = formatNumericOcrDate(
      spacedNumericDate[1],
      spacedNumericDate[2],
      spacedNumericDate[3]
    );
    if (formatted) return formatted;
  }

  // Handles compact numeric dates near expiry words: "11182026" or "111826".
  const compactNumeric = t.match(/\b(\d{2})(\d{2})(20\d{2}|19\d{2}|\d{2})\b/);
  if (compactNumeric) {
    const formatted = formatNumericOcrDate(
      compactNumeric[1],
      compactNumeric[2],
      compactNumeric[3]
    );
    if (formatted) return formatted;
  }

  // Compact printed format: 02SEP2026 or 02SEP26
  const compactDmyNamed = t.match(
    /\b(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2,4})\b/
  );
  if (compactDmyNamed) {
    const y =
      compactDmyNamed[3].length === 2
        ? `20${compactDmyNamed[3]}`
        : compactDmyNamed[3];
    return `${MONTH_MAP[compactDmyNamed[2]]}/${compactDmyNamed[1].padStart(2, '0')}/${y}`;
  }

  // DD MMM YYYY: 26 JUN 2026, 26-JUN-2026, 26.JUN.2026
  const dmyNamed = t.match(
    /(\d{1,2})[\s.\-]+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\s.\-]+(\d{2,4})/
  );
  if (dmyNamed) {
    const y = dmyNamed[3].length === 2 ? `20${dmyNamed[3]}` : dmyNamed[3];
    return `${MONTH_MAP[dmyNamed[2]]}/${dmyNamed[1].padStart(2, '0')}/${y}`;
  }

  // MMM DD YYYY: JUN 26 2026
  const mdy = t.match(
    /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[.,\s]+(\d{1,2})[.,\s]+(\d{2,4})/
  );
  if (mdy) {
    const y = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    return `${MONTH_MAP[mdy[1]]}/${mdy[2].padStart(2, '0')}/${y}`;
  }

  // MMM YYYY or MMM/YY: JUN 2026, JUN/26, JUN-26
  const my = t.match(
    /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\s.\-]+(\d{2,4})/
  );
  if (my) {
    const y = my[2].length === 2 ? `20${my[2]}` : my[2];
    return `${MONTH_MAP[my[1]]}/01/${y}`;
  }

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  const iso = t.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (iso) {
    return `${iso[2].padStart(2, '0')}/${iso[3].padStart(2, '0')}/${iso[1]}`;
  }

  // Dot-separated: DD.MM.YYYY or DD.MM.YY (European style)
  const dotFull = t.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (dotFull) {
    const y = dotFull[3].length === 2 ? `20${dotFull[3]}` : dotFull[3];
    const first = parseInt(dotFull[1], 10);
    if (first > 12) {
      return `${dotFull[2].padStart(2, '0')}/${dotFull[1].padStart(2, '0')}/${y}`;
    }
    return `${dotFull[1].padStart(2, '0')}/${dotFull[2].padStart(2, '0')}/${y}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY (flips to DD/MM when first part > 12)
  const full = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (full) {
    return formatNumericOcrDate(full[1], full[2], full[3]);
  }

  // MM/YYYY, MM-YYYY, MM YYYY, MM.YYYY (and 2-digit year variants)
  const myShort = t.match(/\b(\d{1,2})[\/\-\s.](\d{4}|\d{2})(?!\d)/);
  if (myShort) {
    const m = parseInt(myShort[1], 10);
    if (m >= 1 && m <= 12) {
      const y = myShort[2].length === 2 ? `20${myShort[2]}` : myShort[2];
      return `${myShort[1].padStart(2, '0')}/01/${y}`;
    }
  }

  return null;
}

function parseOcrDate(text) {
  const result = _parseOcrDateRaw(text);
  return result && isValidOcrDate(result) ? result : null;
}

// Try each OCR text pass in order, returning the first valid date found.
function extractDate(rawText) {
  if (!rawText) return null;

  // Pass 1: line by line on raw text
  for (const line of rawText.split('\n')) {
    const d = parseOcrDate(line);
    if (d) return d;
  }

  // Pass 2: all lines joined (catches dates split across line breaks)
  const collapsed = rawText.replace(/\n/g, ' ');
  const d2 = parseOcrDate(collapsed);
  if (d2) return d2;

  // Pass 3: same collapsed text with O/I artifact correction
  return parseOcrDate(fixOcrArtifacts(collapsed));
}

// Calls the OCR API. Uses Engine 2 by default (more accurate on printed labels).
// Races against a hard timeout so the spinner never hangs forever.
async function runOcr(base64, apiKey, signal, useEngine1 = false) {
  const form = new FormData();
  form.append('base64Image', `data:image/jpg;base64,${base64}`);
  form.append('apikey', apiKey);
  form.append('language', 'eng');
  form.append('isOverlayRequired', 'false');
  form.append('scale', 'true');
  form.append('OCREngine', useEngine1 ? '1' : '2');

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('OCR_TIMEOUT')), OCR_TIMEOUT_MS)
  );

  const fetchPromise = fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: form,
    signal,
  })
    .then(r => r.json())
    .then(j => j?.ParsedResults?.[0]?.ParsedText ?? '');

  return Promise.race([fetchPromise, timeoutPromise]);
}

export default function Scan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const scanLock = useRef(false);
  const abortRef = useRef(null);

  const [mode, setMode] = useState('barcode');
  const [torchOn, setTorchOn] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [foundDate, setFoundDate] = useState(null);
  const [success, setSuccess] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState(null);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [productLookupLoading, setProductLookupLoading] = useState(false);
  const [productLookupError, setProductLookupError] = useState('');

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
    // Cancel any in-flight OCR request so it can't update state after we've moved on
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    scanLock.current = false;
    setScanResult(null);
    setFoundDate(null);
    setSuccess(false);
    setOcrLoading(false);
    setPendingBarcode(null);
    setPendingProduct(null);
    setScannedProduct(null);
    setProductLookupLoading(false);
    setProductLookupError('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset])
  );

  const handleBarcodeScan = useCallback(async ({ type, data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setSuccess(true);
    setScanResult({ type, data });
    setScannedProduct(null);
    setProductLookupError('');
    Vibration.vibrate(100);

    setProductLookupLoading(true);
    try {
      const product = await lookupProductByBarcode(data);
      if (product) {
        setScannedProduct(product);
      } else {
        setProductLookupError('Product name not found. You can still add it manually.');
      }
    } catch {
      setProductLookupError('Product lookup failed. You can still add it manually.');
    } finally {
      setProductLookupLoading(false);
    }
  }, []);

  const handleScanExpiry = useCallback(() => {
    const barcode = scanResult?.data;
    scanLock.current = false;
    setScanResult(null);
    setSuccess(false);
    setPendingBarcode(barcode);
    setPendingProduct(scannedProduct);
    setMode('expiry');
  }, [scanResult, scannedProduct]);

  const addItemParams = useCallback(
    (extra = {}) => ({
      barcode: scanResult?.data || pendingBarcode || '',
      quantity: '1',
      ...(scannedProduct?.name ? { name: scannedProduct.name } : {}),
      ...(scannedProduct?.category ? { category: scannedProduct.category } : {}),
      ...(pendingProduct?.name ? { name: pendingProduct.name } : {}),
      ...(pendingProduct?.category ? { category: pendingProduct.category } : {}),
      ...extra,
    }),
    [pendingBarcode, pendingProduct, scanResult, scannedProduct]
  );

  const openManualExpiryAddItem = useCallback(() => {
    router.push({
      pathname: '/(tabs)/addToPantry',
      params: addItemParams({ manualExpiry: '1' }),
    });
  }, [addItemParams, router]);

  const showExpiryFallbackPrompt = useCallback(
    (message) => {
      Alert.alert(
        'Expiry date not detected',
        `${message}\n\nYou can still add the scanned item now and type the expiry date manually.`,
        [
          { text: 'Retry Scan', style: 'cancel' },
          { text: 'Add Manually', onPress: openManualExpiryAddItem },
        ]
      );
    },
    [openManualExpiryAddItem]
  );

  const handleCapture = async () => {
    if (!cameraRef.current || ocrLoading) return;
    const apiKey = process.env.EXPO_PUBLIC_OCR_KEY;
    if (!apiKey) {
      alert('OCR key missing. Add EXPO_PUBLIC_OCR_KEY to your .env file.');
      return;
    }

    // Cancel any previous request before starting a new one
    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setOcrLoading(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.9 });
      if (abort.signal.aborted) return;

      // First attempt: Engine 2 is more accurate on printed product labels
      let text = await runOcr(pic.base64, apiKey, abort.signal, false);
      let date = extractDate(text);

      // Auto-retry with Engine 1 if Engine 2 found nothing — different model, different results
      if (!date && !abort.signal.aborted) {
        text = await runOcr(pic.base64, apiKey, abort.signal, true);
        date = extractDate(text);
      }

      if (abort.signal.aborted) return;

      if (date) {
        Vibration.vibrate(100);
        setFoundDate(date);
        setSuccess(true);
      } else {
        showExpiryFallbackPrompt(
          'Try pointing directly at the "Best By", "Exp", or "Use By" date with the label centered and steady.'
        );
      }
    } catch (e) {
      if (abort.signal.aborted) return;
      if (e.message === 'OCR_TIMEOUT') {
        showExpiryFallbackPrompt('The expiry scan timed out. Check your internet connection and try again if you want.');
      } else {
        showExpiryFallbackPrompt(`Scan error: ${e.message}`);
      }
    } finally {
      if (!abort.signal.aborted) setOcrLoading(false);
      if (abortRef.current === abort) abortRef.current = null;
    }
  };

  const switchMode = (m) => { reset(); setMode(m); };

  const bracketColor = success ? '#3E9954' : mode === 'barcode' ? palette.orange : palette.sun;
  const guideTitle = mode === 'barcode' ? 'Step 1: Scan barcode' : 'Step 2: Scan expiry date';
  const guideText =
    mode === 'barcode'
      ? 'Point at the product barcode. After it finds the item, add it or scan the expiry date.'
      : 'Center the Best By, Exp, or Use By date. If it cannot read it, you can add the date manually.';

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

      {!scanResult && !foundDate && !ocrLoading && (
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>{guideTitle}</Text>
          <Text style={styles.guideText}>{guideText}</Text>
        </View>
      )}

      {/* Barcode result card */}
      {scanResult && !foundDate && (
        <View style={styles.resultCard}>
          <Ionicons name="barcode-outline" size={28} color={palette.orange} />
          <Text style={styles.resultLabel}>{scanResult.type.toUpperCase()}</Text>
          <Text style={styles.resultValue} numberOfLines={2}>{scanResult.data}</Text>
          {productLookupLoading ? (
            <Text style={styles.resultHint}>Looking up product name...</Text>
          ) : scannedProduct ? (
            <>
              <Text style={styles.productName} numberOfLines={2}>{scannedProduct.name}</Text>
              <Text style={styles.resultHint}>
                {scannedProduct.brand ? `${scannedProduct.brand} - ` : ''}
                {scannedProduct.category}
              </Text>
            </>
          ) : productLookupError ? (
            <Text style={styles.resultHint}>{productLookupError}</Text>
          ) : null}
          <Text style={styles.resultHint}>Add now or scan the expiry date first</Text>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.actionBtn, styles.ghostBtn]} onPress={handleScanExpiry}>
              <Text style={styles.ghostBtnText}>Scan Expiry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.orangeBtn]}
              onPress={() => router.push({ pathname: '/(tabs)/addToPantry', params: addItemParams() })}
            >
              <Text style={styles.actionBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
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
          {pendingBarcode && (
            <Text style={styles.resultHint}>Will be added with your scanned item</Text>
          )}
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.actionBtn, styles.ghostBtn]} onPress={reset}>
              <Text style={styles.ghostBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.orangeBtn]}
              onPress={() => {
                // Convert MM/DD/YYYY → YYYY-MM-DD so slashes don't break URL routing
                const [mm, dd, yyyy] = foundDate.split('/');
                const isoDate = `${yyyy}-${mm}-${dd}`;
                router.push({
                  pathname: '/(tabs)/addToPantry',
                  params: addItemParams({ expirationDate: isoDate }),
                });
              }}
            >
              <Text style={styles.actionBtnText}>Use This Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Shutter button — expiry mode idle */}
      {mode === 'expiry' && !foundDate && !ocrLoading && (
        <View style={styles.shutterWrap}>
          <Text style={styles.pendingHint}>
            {pendingBarcode
              ? 'Barcode scanned — now scan the expiry date'
              : 'Point at the Best By, Exp or Use By date'}
          </Text>
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

  guideCard: {
    position: 'absolute',
    top: 108,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  guideTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  guideText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
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
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.greenDeep,
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
    gap: 12,
  },
  pendingHint: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
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
