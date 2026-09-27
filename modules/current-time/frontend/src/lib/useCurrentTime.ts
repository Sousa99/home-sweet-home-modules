import { useEffect, useState } from 'react';

export function useCurrentTime(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const resync = () => setNow(new Date());
    const intervalId = window.setInterval(resync, 1000);
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, []);

  return now;
}
