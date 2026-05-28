import type {
  ExchangeWebSocketService,
  CandleSubscriptionParams,
  TradeSubscriptionParams,
  CandleCallback,
  TradeCallback,
  AllMidsCallback,
  CandleData,
  TradeData,
  AllMidsData,
} from './exchange-websocket.interface';
import { useWebSocketStatusStore, type WebSocketStreamType } from '@/stores/useWebSocketStatusStore';
import { useSymbolMetaStore } from '@/stores/useSymbolMetaStore';
import { formatPrice, formatSize } from '@/lib/format-utils';

interface SubRecord {
  id: string;
  type: 'candle' | 'trade' | 'allMids';
  stream: string;
  callback: CandleCallback | TradeCallback | AllMidsCallback;
}

function toStreamSymbol(coin: string): string {
  const c = coin.toLowerCase();
  return c.endsWith('usdt') ? c : `${c}usdt`;
}

function fromStreamSymbol(symbol: string): string {
  const up = symbol.toUpperCase();
  return up.endsWith('USDT') ? up.slice(0, -4) : up;
}

export class BinanceWebSocketService implements ExchangeWebSocketService {
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private isReady = false;
  private nextId = 1;
  private subscriptions = new Map<string, SubRecord>();
  private streamRefs = new Map<string, number>();
  private streamTypes = new Map<string, WebSocketStreamType>();
  private streamLastEventAt = new Map<string, number>();
  private streamLastResubscribeAt = new Map<string, number>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;

  private static readonly STALE_CHECK_INTERVAL_MS = 5000;
  private static readonly RESUBSCRIBE_COOLDOWN_MS = 10000;
  private static readonly STALE_THRESHOLDS: Record<WebSocketStreamType, number> = {
    candles: 20000,
    trades: 20000,
    orderbook: 10000,
    prices: 15000,
  };

  constructor(isTestnet: boolean = false) {
    // USDⓈ-M Futures WebSocket (2026 routed endpoints): use /market for kline/trade/mark streams.
    // Unrouted /ws may not receive market/private-class streams anymore.
    this.wsUrl = isTestnet
      ? 'wss://fstream.binancefuture.com/market/ws'
      : 'wss://fstream.binance.com/market/ws';
  }

  private ensureConnected(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.clearReconnectTimer();
    useWebSocketStatusStore.getState().setOverallStatus('connecting');
    this.ws = new WebSocket(this.wsUrl);
    this.ensureStaleChecker();

    this.ws.onopen = () => {
      this.isReady = true;
      this.reconnectAttempts = 0;
      useWebSocketStatusStore.getState().setOverallStatus('connected');

      // Resubscribe all streams after reconnect
      const allStreams = Array.from(this.streamRefs.keys());
      if (allStreams.length > 0) {
        this.send({ method: 'SUBSCRIBE', params: allStreams, id: this.nextId++ });
        const now = Date.now();
        allStreams.forEach((stream) => {
          this.streamLastEventAt.set(stream, now);
        });
      }
    };

    this.ws.onclose = () => {
      this.isReady = false;
      useWebSocketStatusStore.getState().setOverallStatus('disconnected');
      if (this.streamRefs.size > 0) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      useWebSocketStatusStore.getState().setOverallStatus('error');
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private getStoreStreamType(type: SubRecord['type']): WebSocketStreamType {
    if (type === 'candle') return 'candles';
    if (type === 'trade') return 'trades';
    return 'prices';
  }

  private getStaleThresholdMs(streamType: WebSocketStreamType): number {
    return BinanceWebSocketService.STALE_THRESHOLDS[streamType] || 20000;
  }

  private ensureStaleChecker(): void {
    if (this.staleCheckTimer) {
      return;
    }

    this.staleCheckTimer = setInterval(() => {
      if (this.streamRefs.size === 0) {
        return;
      }

      if (!this.isReady) {
        this.scheduleReconnect();
        return;
      }

      const now = Date.now();
      this.streamRefs.forEach((_, stream) => {
        const streamType = this.streamTypes.get(stream) || 'candles';
        const thresholdMs = this.getStaleThresholdMs(streamType);
        const lastEventAt = this.streamLastEventAt.get(stream) || 0;

        if (now - lastEventAt <= thresholdMs) {
          return;
        }

        const warning = `No updates for ${stream} in ${Math.round((now - lastEventAt) / 1000)}s`;
        useWebSocketStatusStore.getState().markStreamStale(stream, warning);
        useWebSocketStatusStore.getState().setStreamStatus(streamType, 'error', warning);

        const lastResubAt = this.streamLastResubscribeAt.get(stream) || 0;
        if (now - lastResubAt < BinanceWebSocketService.RESUBSCRIBE_COOLDOWN_MS) {
          return;
        }

        this.streamLastResubscribeAt.set(stream, now);
        this.resubscribeStream(stream, streamType);
      });
    }, BinanceWebSocketService.STALE_CHECK_INTERVAL_MS);
  }

  private clearStaleChecker(): void {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.streamRefs.size === 0) {
      return;
    }
    const delay = Math.min(1000 * (2 ** this.reconnectAttempts), 15000);
    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, delay);
  }

  private resubscribeStream(stream: string, streamType: WebSocketStreamType): void {
    if (!this.isReady || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.scheduleReconnect();
      return;
    }

    useWebSocketStatusStore.getState().incrementStreamAutoResubscribe(stream);
    this.send({ method: 'UNSUBSCRIBE', params: [stream], id: this.nextId++ });
    this.send({ method: 'SUBSCRIBE', params: [stream], id: this.nextId++ });
    this.streamLastEventAt.set(stream, Date.now());
    useWebSocketStatusStore.getState().setStreamStatus(streamType, 'connecting');
  }

  private markStreamActivity(stream: string): void {
    this.streamLastEventAt.set(stream, Date.now());
    const streamType = this.streamTypes.get(stream);
    if (!streamType) return;

    useWebSocketStatusStore.getState().markStreamHeartbeat(stream);
    useWebSocketStatusStore.getState().setStreamStatus(streamType, 'connected');
  }

  private addStreamRef(stream: string, type: SubRecord['type']): void {
    const current = this.streamRefs.get(stream) || 0;
    this.streamRefs.set(stream, current + 1);

    const streamType = this.getStoreStreamType(type);
    this.streamTypes.set(stream, streamType);
    const thresholdMs = this.getStaleThresholdMs(streamType);
    useWebSocketStatusStore.getState().registerStreamHealth(stream, streamType, thresholdMs);

    if (!this.streamLastEventAt.has(stream)) {
      this.streamLastEventAt.set(stream, Date.now());
    }

    if (current === 0 && this.isReady) {
      this.send({ method: 'SUBSCRIBE', params: [stream], id: this.nextId++ });
    }
  }

  private removeStreamRef(stream: string): void {
    const current = this.streamRefs.get(stream) || 0;
    if (current <= 1) {
      this.streamRefs.delete(stream);
      if (this.isReady) {
        this.send({ method: 'UNSUBSCRIBE', params: [stream], id: this.nextId++ });
      }
      this.streamTypes.delete(stream);
      this.streamLastEventAt.delete(stream);
      this.streamLastResubscribeAt.delete(stream);
      useWebSocketStatusStore.getState().clearStreamHealth(stream);

      if (this.streamRefs.size === 0) {
        this.clearReconnectTimer();
      }
      return;
    }

    this.streamRefs.set(stream, current - 1);
  }

  private processBulkMarkPriceArray(arr: unknown[]): void {
    const mids: AllMidsData = {};
    arr.forEach((it) => {
      if (!it || typeof it !== 'object') {
        return;
      }
      const payload = it as { s?: string; p?: string };
      // Only USDT-margined futures mark prices; 'p' = mark price on Futures WS
      if (payload.s && payload.p && String(payload.s).endsWith('USDT')) {
        mids[fromStreamSymbol(payload.s)] = parseFloat(payload.p);
      }
    });
    if (Object.keys(mids).length > 0) {
      this.markStreamActivity('!markPrice@arr');
      this.subscriptions.forEach((sub) => {
        if (sub.type !== 'allMids' || sub.stream !== '!markPrice@arr') return;
        (sub.callback as AllMidsCallback)(mids);
      });
    }
  }

  private handleMessage(raw: string): void {
    try {
      if (typeof raw !== 'string') return;
      const msg = JSON.parse(raw);

      // Case 1: Direct JSON array — rare, only when connecting via combined stream URL
      if (Array.isArray(msg)) {
        this.processBulkMarkPriceArray(msg);
        return;
      }

      // Case 2: SUBSCRIBE method on fstream.binance.com wraps !markPrice@arr as:
      //   {"stream": "!markPrice@arr", "data": [{e: "markPriceUpdate", s: "BTCUSDT", p: "..."}, ...]}
      // msg.data is an ARRAY here — must check BEFORE the `msg?.data?.e` logic below
      if (Array.isArray(msg?.data)) {
        this.processBulkMarkPriceArray(msg.data);
        return;
      }

      // Case 3: Single-stream events (kline, aggTrade, individual markPriceUpdate)
      // SUBSCRIBE method: {"stream": "btcusdt@kline_1m", "data": {"e": "kline", ...}}
      // Raw format:        {"e": "kline", ...}
      const normalizedMsg = msg?.data?.e ? msg.data : msg;

      // Skip non-event messages (subscription confirmation: {"result": null, "id": 1})
      if (!normalizedMsg.e) {
        return;
      }

      if (normalizedMsg.e === 'kline') {
        const symbol = fromStreamSymbol(normalizedMsg.s || '');
        const stream = `${toStreamSymbol(symbol)}@kline_${normalizedMsg.k?.i || '1m'}`;
        this.markStreamActivity(stream);

        this.subscriptions.forEach((sub) => {
          if (sub.type !== 'candle' || sub.stream !== stream) return;

          const k = normalizedMsg.k;
          if (!k) return;

          const open = parseFloat(k.o);
          const high = parseFloat(k.h);
          const low = parseFloat(k.l);
          const close = parseFloat(k.c);
          // k.v = base asset volume (e.g. BTC), matches /fapi/v1/klines k[5]
          const volume = parseFloat(k.v || '0');

          const decimals = useSymbolMetaStore.getState().getDecimals(symbol);

          const candle: CandleData = {
            time: Number(k.t),
            open,
            high,
            low,
            close,
            volume,
            openFormatted: formatPrice(open, decimals.price),
            highFormatted: formatPrice(high, decimals.price),
            lowFormatted: formatPrice(low, decimals.price),
            closeFormatted: formatPrice(close, decimals.price),
            volumeFormatted: formatSize(volume, decimals.size),
          };

          (sub.callback as CandleCallback)(candle);
        });
        return;
      }

      if (normalizedMsg.e === 'aggTrade') {
        const symbol = fromStreamSymbol(normalizedMsg.s || '');
        const stream = `${toStreamSymbol(symbol)}@aggTrade`;
        this.markStreamActivity(stream);

        this.subscriptions.forEach((sub) => {
          if (sub.type !== 'trade' || sub.stream !== stream) return;

          const price = parseFloat(normalizedMsg.p || '0');
          const size = parseFloat(normalizedMsg.q || '0');
          // m = is the buyer the market maker → buyer is maker → seller is aggressor → 'sell'
          const side: 'buy' | 'sell' = normalizedMsg.m ? 'sell' : 'buy';
          const decimals = useSymbolMetaStore.getState().getDecimals(symbol);

          const trade: TradeData = {
            time: Number(normalizedMsg.T || Date.now()),
            price,
            size,
            side,
            priceFormatted: formatPrice(price, decimals.price),
            sizeFormatted: formatSize(size, decimals.size),
          };

          (sub.callback as TradeCallback)(trade);
        });
        return;
      }

      // Single-symbol mark price update (e.g. from btcusdt@markPrice stream, not !markPrice@arr)
      if (normalizedMsg.e === 'markPriceUpdate' && normalizedMsg.s) {
        if (!String(normalizedMsg.s).endsWith('USDT')) return;
        const mids: AllMidsData = {};
        // 'p' = mark price (USDⓈ-M Futures mark price, NOT spot price)
        mids[fromStreamSymbol(normalizedMsg.s)] = parseFloat(normalizedMsg.p || '0');
        this.markStreamActivity('!markPrice@arr');

        this.subscriptions.forEach((sub) => {
          if (sub.type !== 'allMids' || sub.stream !== '!markPrice@arr') return;
          (sub.callback as AllMidsCallback)(mids);
        });
      }
    } catch {
      // Ignore malformed message
    }
  }

  subscribeToCandles(params: CandleSubscriptionParams, callback: CandleCallback): string {
    this.ensureConnected();

    const stream = `${toStreamSymbol(params.coin)}@kline_${params.interval}`;
    const id = `candle_${params.coin}_${params.interval}_${Date.now()}_${Math.random()}`;

    this.subscriptions.set(id, {
      id,
      type: 'candle',
      stream,
      callback,
    });

    this.addStreamRef(stream, 'candle');
    return id;
  }

  subscribeToTrades(params: TradeSubscriptionParams, callback: TradeCallback): string {
    this.ensureConnected();

    const stream = `${toStreamSymbol(params.coin)}@aggTrade`;
    const id = `trade_${params.coin}_${Date.now()}_${Math.random()}`;

    this.subscriptions.set(id, {
      id,
      type: 'trade',
      stream,
      callback,
    });

    this.addStreamRef(stream, 'trade');
    return id;
  }

  subscribeToAllMids(callback: AllMidsCallback): string {
    this.ensureConnected();

    const stream = '!markPrice@arr';
    const id = `allMids_${Date.now()}_${Math.random()}`;

    this.subscriptions.set(id, {
      id,
      type: 'allMids',
      stream,
      callback,
    });

    this.addStreamRef(stream, 'allMids');
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return;

    this.removeStreamRef(sub.stream);
    this.subscriptions.delete(subscriptionId);
  }

  disconnect(): void {
    this.subscriptions.clear();
    this.streamRefs.clear();
    this.streamTypes.clear();
    this.streamLastEventAt.clear();
    this.streamLastResubscribeAt.clear();
    this.isReady = false;
    this.clearReconnectTimer();
    this.clearStaleChecker();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    useWebSocketStatusStore.getState().setOverallStatus('disconnected');
  }

  isConnected(): boolean {
    return this.isReady;
  }
}
