import { useCallback, useEffect, useRef, useState } from 'react';

const SPEED = 0.065;
const TICK_MS = 130;

function makeDots(centerLat, centerLng) {
  const la = Number(centerLat);
  const ln = Number(centerLng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    return [];
  }
  return [
    {
      id: 'dot-1',
      label: 'Live tracker',
      anchorLat: la,
      anchorLng: ln,
      lat: la,
      lng: ln,
      moving: true,
      selected: true,
      phase: 0,
      orbitDeg: 0.011,
    },
  ];
}

/**
 * Animated “live” dots on a map: circular motion around anchors until stopped.
 * @param {number} mapCenterLat
 * @param {number} mapCenterLng
 */
export function useMovingDots(mapCenterLat, mapCenterLng) {
  const [dots, setDots] = useState(() => makeDots(mapCenterLat, mapCenterLng));
  const tRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tRef.current += SPEED;
      const t0 = tRef.current;
      setDots(prev =>
        prev.map(d => {
          if (!d.moving) return d;
          const r = d.orbitDeg ?? 0.01;
          const t = t0 + (d.phase ?? 0);
          return {
            ...d,
            lat: d.anchorLat + r * Math.sin(t),
            lng: d.anchorLng + r * Math.cos(t) * 1.12,
          };
        })
      );
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const stopDot = useCallback(dotId => {
    setDots(prev =>
      prev.map(d =>
        d.id !== dotId ? d : { ...d, moving: false, selected: true }
      )
    );
  }, []);

  const resumeDot = useCallback(dotId => {
    setDots(prev =>
      prev.map(d => {
        if (d.id !== dotId) return d;
        return {
          ...d,
          moving: true,
          selected: true,
          anchorLat: d.lat,
          anchorLng: d.lng,
          phase: Math.random() * Math.PI * 2,
        };
      })
    );
  }, []);

  const selectDot = useCallback(dotId => {
    setDots(prev => prev.map(d => ({ ...d, selected: d.id === dotId })));
  }, []);

  const recenterDots = useCallback((la, ln) => {
    setDots(makeDots(la, ln));
    tRef.current = 0;
  }, []);

  const selectedDot = dots.find(d => d.selected) || dots[0];

  return {
    dots,
    selectedDot,
    stopDot,
    resumeDot,
    selectDot,
    recenterDots,
  };
}
