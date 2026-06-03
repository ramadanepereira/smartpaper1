import { useState, useEffect } from 'react';

/* ── Hook: useMediaQuery ──
 * Detecta se uma media query CSS corresponde ao ecrã actual.
 * Útil para renderização condicional com base no tamanho do ecrã.
 * Uso: const isMobile = useMediaQuery('(max-width: 768px)');
 * Retorna: boolean (true se a media query corresponder) */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') return window.matchMedia(query).matches;
    return false;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
