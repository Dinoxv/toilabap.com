import { create } from 'zustand';
import type { ExchangeTradingService } from '@/lib/services/types';
import { useDexStore } from './useDexStore';

const HALF_DAY_VOLUME_FACTOR = 12 / 24;
// Tuned for VPS: fewer symbols per refinement cycle and longer cache retention.
const EXACT_12H_CACHE_TTL_MS = 45 * 60 * 1000;
const EXACT_12H_TOP_SYMBOL_LIMIT = 24;
const EXACT_12H_MAX_CONCURRENCY = 4;

// Exchange metadata currently exposes dayNtlVlm (24h notional volume).
// Convert to a 12h estimate so Top Symbols can be ranked/displayed on 12h basis.
const toEstimated12hVolume = (dayNtlVlm: string | undefined): number => {
  return parseFloat(dayNtlVlm || '0') * HALF_DAY_VOLUME_FACTOR;
};

type Cached12hVolume = {
  volume: number;
  updatedAt: number;
};

const exact12hVolumeCache = new Map<string, Cached12hVolume>();

const getCachedExact12hVolume = (symbol: string, now: number): number | null => {
  const cached = exact12hVolumeCache.get(symbol);
  if (!cached) return null;
  if (now - cached.updatedAt > EXACT_12H_CACHE_TTL_MS) return null;
  return cached.volume;
};

const setCachedExact12hVolume = (symbol: string, volume: number, now: number): void => {
  exact12hVolumeCache.set(symbol, { volume, updatedAt: now });
};

const computeExact12hVolumeFromCandles = async (
  service: ExchangeTradingService,
  symbol: string,
  now: number
): Promise<number | null> => {
  const startTime = now - (12 * 60 * 60 * 1000);

  try {
    const candles = await service.getCandles({
      coin: symbol,
      interval: '1h',
      startTime,
      endTime: now,
    });

    if (!candles || candles.length === 0) {
      return null;
    }

    const notional12h = candles.reduce((sum, candle) => {
      const notional = Number(candle.volume) * Number(candle.close);
      return Number.isFinite(notional) && notional > 0 ? sum + notional : sum;
    }, 0);

    return Number.isFinite(notional12h) && notional12h > 0 ? notional12h : null;
  } catch {
    return null;
  }
};

const refineTopVolumesWithExact12h = async (
  service: ExchangeTradingService,
  baseSymbols: SymbolWithVolume[]
): Promise<SymbolWithVolume[]> => {
  const now = Date.now();
  const topTargets = baseSymbols.slice(0, EXACT_12H_TOP_SYMBOL_LIMIT);
  const pendingSymbols = topTargets
    .map((item) => item.name)
    .filter((symbol) => getCachedExact12hVolume(symbol, now) === null);

  if (pendingSymbols.length > 0) {
    let cursor = 0;
    const workerCount = Math.min(EXACT_12H_MAX_CONCURRENCY, pendingSymbols.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < pendingSymbols.length) {
        const symbol = pendingSymbols[cursor++];
        const exactVolume = await computeExact12hVolumeFromCandles(service, symbol, now);
        if (exactVolume !== null) {
          setCachedExact12hVolume(symbol, exactVolume, now);
        }
      }
    });
    await Promise.all(workers);
  }

  const merged = baseSymbols.map((item) => {
    const cached = getCachedExact12hVolume(item.name, now);
    return cached !== null ? { ...item, volume: cached } : item;
  });

  merged.sort((a, b) => b.volume - a.volume);
  return merged;
};

export interface SymbolWithVolume {
  name: string;
  volume: number;
}

interface TopSymbolsStore {
  symbols: SymbolWithVolume[];
  isLoading: boolean;
  error: string | null;
  service: ExchangeTradingService | null;
  setService: (service: ExchangeTradingService) => void;
  fetchTopSymbols: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  updateFromGlobalPoll: (data: { meta: any; assetCtxs: any[] }) => void;
}

export const useTopSymbolsStore = create<TopSymbolsStore>((set, get) => ({
  symbols: [],
  isLoading: false,
  error: null,
  service: null,

  setService: (service: ExchangeTradingService) => {
    set({ service });
  },

  fetchTopSymbols: async () => {
    const { service } = get();
    if (!service) {
      console.warn('Service not initialized yet, skipping top symbols fetch');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { marketType, selectedDex } = useDexStore.getState();

      let symbolsWithVolume: SymbolWithVolume[];

      if (marketType === 'spot') {
        const { meta, assetCtxs } = await service.getSpotMetaAndAssetCtxs();
        symbolsWithVolume = meta.universe
          .map((pair: any, index: number) => ({
            name: pair.name as string,
            volume: toEstimated12hVolume(assetCtxs[index]?.dayNtlVlm),
          }))
          .filter((s: SymbolWithVolume) => s.volume > 0)
          .sort((a: SymbolWithVolume, b: SymbolWithVolume) => b.volume - a.volume)
          .map(({ name, volume }: SymbolWithVolume) => ({ name, volume }));
      } else {
        const { meta, assetCtxs } = await service.getMetaAndAssetCtxs(selectedDex);
        symbolsWithVolume = meta.universe
          .map((u, index) => ({
            name: u.name,
            volume: toEstimated12hVolume(assetCtxs[index]?.dayNtlVlm),
            isDelisted: u.isDelisted,
          }))
          .filter((s) => !s.isDelisted)
          .sort((a, b) => b.volume - a.volume)
          .map(({ name, volume }) => ({ name, volume }));
      }

      // Refine top symbols with exact 12h notional from recent 1h candles (best effort).
      const refined = await refineTopVolumesWithExact12h(service, symbolsWithVolume);
      set({ symbols: refined, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  startAutoRefresh: () => {
    get().fetchTopSymbols();
  },

  stopAutoRefresh: () => {
  },

  updateFromGlobalPoll: (data: { meta: any; assetCtxs: any[] }) => {
    const { meta, assetCtxs } = data;

    const now = Date.now();
    const symbolsWithVolume: SymbolWithVolume[] = meta.universe
      .map((u: any, index: number) => ({
        name: u.name,
        volume: getCachedExact12hVolume(u.name, now) ?? toEstimated12hVolume(assetCtxs[index]?.dayNtlVlm),
        isDelisted: u.isDelisted,
      }))
      .filter((s: any) => !s.isDelisted)
      .sort((a: any, b: any) => b.volume - a.volume)
      .map(({ name, volume }: any) => ({ name, volume }));

    set({ symbols: symbolsWithVolume });
  },
}));
