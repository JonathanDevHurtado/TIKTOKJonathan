import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [bp, setBp] = useState(() => getBreakpoint(window.innerWidth));

  function getBreakpoint(w) {
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  useEffect(() => {
    const handler = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return bp;
}
