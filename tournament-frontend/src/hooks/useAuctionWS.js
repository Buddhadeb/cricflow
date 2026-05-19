import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';

const WS_URL = `ws://${window.location.host}/ws/auction`;
const MAX_RETRIES = 8;
const BASE_DELAY_MS = 1000;

export function useAuctionWS() {
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);
  const [auctionState, setAuctionState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [timer, setTimer] = useState(null);
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef(null);
  const unmountedRef = useRef(false);

  const addEvent = (event) =>
    setEvents((prev) => [event, ...prev].slice(0, 50));

  const connect = useCallback(() => {
    if (!token || unmountedRef.current) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retriesRef.current = 0;
    };

    ws.onclose = () => {
      setConnected(false);
      if (unmountedRef.current) return;
      // Exponential backoff, capped at 30 s
      if (retriesRef.current < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY_MS * 2 ** retriesRef.current, 30_000);
        retriesRef.current += 1;
        timeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (e) => {
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }

      addEvent(data);

      switch (data.type) {
        case 'AUCTION_STATE':
          setAuctionState(data);
          if (data.player) setCurrentPlayer(data.player);
          if (data.timer_remaining != null) setTimer(data.timer_remaining);
          break;

        case 'AUCTION_STARTED':
        case 'AUCTION_RESUMED':
          setAuctionState(data);
          break;

        case 'AUCTION_PAUSED':
          setAuctionState((prev) => ({ ...prev, status: data.status }));
          break;

        case 'AUCTION_COMPLETED':
          setAuctionState((prev) => ({ ...prev, status: data.status }));
          setCurrentPlayer(null);
          setTimer(null);
          break;

        case 'PLAYER_UP':
          setCurrentPlayer(data.player);
          setTimer(data.timer_remaining);
          setAuctionState((prev) => ({ ...prev, ...data }));
          break;

        case 'BID_PLACED':
          setAuctionState((prev) => ({
            ...prev,
            current_bid: data.current_bid,
            current_bidder_id: data.current_bidder_id,
            timer_remaining: data.timer_remaining,
          }));
          setTimer(data.timer_remaining);
          break;

        case 'TIMER_TICK':
          setTimer(data.remaining);
          break;

        case 'PLAYER_SOLD':
        case 'PLAYER_UNSOLD':
          setCurrentPlayer(null);
          setTimer(null);
          setAuctionState((prev) => ({
            ...prev,
            current_player_id: null,
            current_bid: null,
            current_bidder_id: null,
          }));
          break;

        case 'BID_REJECTED':
        case 'ERROR':
          break;

        default:
          break;
      }
    };
  }, [token]);

  useEffect(() => {
    unmountedRef.current = false;
    if (!token) return;
    connect();
    return () => {
      unmountedRef.current = true;
      clearTimeout(timeoutRef.current);
      wsRef.current?.close();
    };
  }, [token, connect]);

  const sendBid = useCallback(
    (teamId, amount) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'BID', team_id: teamId, amount })
        );
      }
    },
    []
  );

  return { connected, auctionState, currentPlayer, timer, events, sendBid };
}
