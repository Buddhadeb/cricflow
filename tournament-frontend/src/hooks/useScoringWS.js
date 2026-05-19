import { useEffect, useRef, useState } from 'react';

const WS_BASE = import.meta.env.VITE_API_URL.replace(/^http/, 'ws');

export function useScoringWS(matchId) {
  const [lastEvent, setLastEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!matchId) return;
    const url = `${WS_BASE}/ws/scores/${matchId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastEvent(data);
      } catch {}
    };

    return () => {
      ws.close();
    };
  }, [matchId]);

  return { lastEvent, connected };
}
