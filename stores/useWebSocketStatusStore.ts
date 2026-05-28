import { create } from 'zustand';

export type WebSocketStreamType = 'candles' | 'trades' | 'orderbook' | 'prices';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface StreamStatus {
  status: ConnectionStatus;
  lastConnected: number | null;
  errorMessage: string | null;
  subscriptionCount: number;
}

interface StreamHealthStatus {
  streamKey: string;
  streamType: WebSocketStreamType;
  staleThresholdMs: number;
  lastMessageAt: number | null;
  staleSince: number | null;
  isStale: boolean;
  warning: string | null;
  autoResubscribeCount: number;
}

interface WebSocketStatusStore {
  overallStatus: ConnectionStatus;
  streams: Record<WebSocketStreamType, StreamStatus>;
  streamHealth: Record<string, StreamHealthStatus>;

  setOverallStatus: (status: ConnectionStatus) => void;
  setStreamStatus: (stream: WebSocketStreamType, status: ConnectionStatus, errorMessage?: string) => void;
  setStreamSubscriptionCount: (stream: WebSocketStreamType, count: number) => void;
  registerStreamHealth: (streamKey: string, streamType: WebSocketStreamType, staleThresholdMs: number) => void;
  markStreamHeartbeat: (streamKey: string) => void;
  markStreamStale: (streamKey: string, warning: string) => void;
  incrementStreamAutoResubscribe: (streamKey: string) => void;
  clearStreamHealth: (streamKey: string) => void;
  resetStreamStatus: (stream: WebSocketStreamType) => void;
  getStreamStatus: (stream: WebSocketStreamType) => StreamStatus;
}

const initialStreamStatus: StreamStatus = {
  status: 'disconnected',
  lastConnected: null,
  errorMessage: null,
  subscriptionCount: 0,
};

export const useWebSocketStatusStore = create<WebSocketStatusStore>((set, get) => ({
  overallStatus: 'disconnected',
  streams: {
    candles: { ...initialStreamStatus },
    trades: { ...initialStreamStatus },
    orderbook: { ...initialStreamStatus },
    prices: { ...initialStreamStatus },
  },
  streamHealth: {},

  setOverallStatus: (status: ConnectionStatus) => {
    set({ overallStatus: status });
  },

  setStreamStatus: (stream: WebSocketStreamType, status: ConnectionStatus, errorMessage?: string) => {
    set((state) => ({
      streams: {
        ...state.streams,
        [stream]: {
          ...state.streams[stream],
          status,
          lastConnected: status === 'connected' ? Date.now() : state.streams[stream].lastConnected,
          errorMessage: errorMessage || null,
        },
      },
    }));
  },

  setStreamSubscriptionCount: (stream: WebSocketStreamType, count: number) => {
    set((state) => ({
      streams: {
        ...state.streams,
        [stream]: {
          ...state.streams[stream],
          subscriptionCount: count,
          status: count > 0 ? 'connected' : 'disconnected',
        },
      },
    }));
  },

  registerStreamHealth: (streamKey, streamType, staleThresholdMs) => {
    set((state) => {
      const existing = state.streamHealth[streamKey];
      return {
        streamHealth: {
          ...state.streamHealth,
          [streamKey]: existing
            ? {
                ...existing,
                streamType,
                staleThresholdMs,
              }
            : {
                streamKey,
                streamType,
                staleThresholdMs,
                lastMessageAt: Date.now(),
                staleSince: null,
                isStale: false,
                warning: null,
                autoResubscribeCount: 0,
              },
        },
      };
    });
  },

  markStreamHeartbeat: (streamKey) => {
    set((state) => {
      const current = state.streamHealth[streamKey];
      if (!current) return state;
      return {
        streamHealth: {
          ...state.streamHealth,
          [streamKey]: {
            ...current,
            lastMessageAt: Date.now(),
            staleSince: null,
            isStale: false,
            warning: null,
          },
        },
      };
    });
  },

  markStreamStale: (streamKey, warning) => {
    set((state) => {
      const current = state.streamHealth[streamKey];
      if (!current) return state;
      return {
        streamHealth: {
          ...state.streamHealth,
          [streamKey]: {
            ...current,
            staleSince: current.staleSince || Date.now(),
            isStale: true,
            warning,
          },
        },
      };
    });
  },

  incrementStreamAutoResubscribe: (streamKey) => {
    set((state) => {
      const current = state.streamHealth[streamKey];
      if (!current) return state;
      return {
        streamHealth: {
          ...state.streamHealth,
          [streamKey]: {
            ...current,
            autoResubscribeCount: current.autoResubscribeCount + 1,
          },
        },
      };
    });
  },

  clearStreamHealth: (streamKey) => {
    set((state) => {
      if (!state.streamHealth[streamKey]) {
        return state;
      }
      const next = { ...state.streamHealth };
      delete next[streamKey];
      return { streamHealth: next };
    });
  },

  resetStreamStatus: (stream: WebSocketStreamType) => {
    set((state) => ({
      streams: {
        ...state.streams,
        [stream]: { ...initialStreamStatus },
      },
    }));
  },

  getStreamStatus: (stream: WebSocketStreamType) => {
    return get().streams[stream];
  },
}));
