import type { CandleData } from '@/types';
import type { UTCTimestamp } from 'lightweight-charts';

export interface TrendMatrixOptions {
  msLen?: number;
  htfTF?: string;
  tradeTimeframe?: string;
  htfCandles?: CandleData[];
  debugBiasSource?: boolean;
  debugContext?: string;
  debugSymbol?: string;
  htfEmaLen?: number;
  atrLength?: number;
  atrMult?: number;
  targetStepMult?: number;
  riskPercent?: number;
  maxLossPercent?: number;
  partialTpPct?: number;
  bullColor?: string;
  bearColor?: string;
  showSig?: boolean;
  showTP?: boolean;
  showStop?: boolean;
  showHTF?: boolean;
  showPending?: boolean;
}

export interface TrendMatrixOverlayPoint {
  time: UTCTimestamp;
  value: number;
  color: string;
}

export interface TrendMatrixResult {
  biasZones: TrendMatrixOverlayPoint[];
  tpLines: TrendMatrixOverlayPoint[];
  slLines: TrendMatrixOverlayPoint[];
  entryMarkers: TrendMatrixOverlayPoint[];
  chochZones: TrendMatrixOverlayPoint[];
  buySellLabels: TrendMatrixOverlayPoint[];
  summary: {
    direction: 'long' | 'short' | 'flat';
    entry: number | null;
    stop: number | null;
    tps: [number, number, number, number] | null;
    biasSource: 'mapped-htf' | 'aggregated-htf' | 'fallback-same-tf';
    biasDebugSample: Array<{
      time: UTCTimestamp;
      close: number;
      biasRef: number;
      relation: 'bull' | 'bear' | 'flat';
    }>;
    pendingResistance: number | null;
    pendingSupport: number | null;
    breakoutLabel: string | null;
    breakoutPrice: number | null;
    breakoutTime: UTCTimestamp | null;
    reachedTp: number;
  };
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = new Array<number>(values.length);
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

function atr(candles: CandleData[], period: number): number[] {
  if (!candles.length) return [];
  const tr = new Array<number>(candles.length);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const pc = candles[i - 1].close;
    tr[i] = Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  }

  const out = new Array<number>(candles.length).fill(0);
  if (candles.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  out[period - 1] = sum / period;
  for (let i = period; i < candles.length; i++) {
    out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  }
  return out;
}

function pivotHigh(candles: CandleData[], idx: number, len: number): number | null {
  if (idx < len || idx + len >= candles.length) return null;
  const center = candles[idx].high;
  for (let j = 1; j <= len; j++) {
    if (candles[idx - j].high >= center || candles[idx + j].high >= center) return null;
  }
  return center;
}

function pivotLow(candles: CandleData[], idx: number, len: number): number | null {
  if (idx < len || idx + len >= candles.length) return null;
  const center = candles[idx].low;
  for (let j = 1; j <= len; j++) {
    if (candles[idx - j].low <= center || candles[idx + j].low <= center) return null;
  }
  return center;
}

function getForcedHtfTimeframe(tradeTimeframe?: string): '3m' | '15m' | null {
  if (tradeTimeframe === '1m') return '3m';
  if (tradeTimeframe === '5m') return '15m';
  return null;
}

function getTimeframeMinutes(tf: string): number | null {
  if (tf === '1m') return 1;
  if (tf === '3m') return 3;
  if (tf === '5m') return 5;
  if (tf === '15m') return 15;
  return null;
}

const biasDebugLastLogByKey = new Map<string, number>();

function aggregateCandlesByRatio(candles: CandleData[], sourceMinutes: number, ratio: number): CandleData[] {
  if (!candles.length || ratio <= 1) return candles;

  const sourceMs = sourceMinutes * 60 * 1000;
  const targetMs = sourceMs * ratio;
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const out: CandleData[] = [];

  let bucketStart = Math.floor(sorted[0].time / targetMs) * targetMs;
  let open = sorted[0].open;
  let high = sorted[0].high;
  let low = sorted[0].low;
  let close = sorted[0].close;
  let volume = sorted[0].volume;
  let lastTime = sorted[0].time;

  for (let i = 1; i < sorted.length; i++) {
    const c = sorted[i];
    const cBucketStart = Math.floor(c.time / targetMs) * targetMs;

    if (cBucketStart !== bucketStart) {
      out.push({
        time: lastTime,
        open,
        high,
        low,
        close,
        volume,
      } as CandleData);

      bucketStart = cBucketStart;
      open = c.open;
      high = c.high;
      low = c.low;
      close = c.close;
      volume = c.volume;
      lastTime = c.time;
      continue;
    }

    high = Math.max(high, c.high);
    low = Math.min(low, c.low);
    close = c.close;
    volume += c.volume;
    lastTime = c.time;
  }

  out.push({
    time: lastTime,
    open,
    high,
    low,
    close,
    volume,
  } as CandleData);

  return out;
}

function alignHtfEmaByTime(
  ltfCandles: CandleData[],
  htfCandles: CandleData[],
  htfEma: number[]
): Array<number | null> {
  const aligned = new Array<number | null>(ltfCandles.length).fill(null);
  if (!ltfCandles.length || !htfCandles.length || !htfEma.length) return aligned;

  const sortedHtf = htfCandles
    .map((c, i) => ({ time: c.time, ema: htfEma[i] }))
    .filter((x) => Number.isFinite(x.ema))
    .sort((a, b) => a.time - b.time);

  if (!sortedHtf.length) return aligned;

  let h = 0;
  let lastEma: number | null = null;
  for (let i = 0; i < ltfCandles.length; i++) {
    const t = ltfCandles[i].time;
    while (h < sortedHtf.length && sortedHtf[h].time <= t) {
      lastEma = sortedHtf[h].ema;
      h++;
    }
    aligned[i] = lastEma;
  }

  return aligned;
}

function resolveHtfCandles(
  candles: CandleData[],
  options: TrendMatrixOptions
): { candles: CandleData[] | null; source: 'mapped-htf' | 'aggregated-htf' | 'fallback-same-tf' } {
  const forcedHtf = getForcedHtfTimeframe(options.tradeTimeframe);
  const requestedHtf = !forcedHtf && options.htfTF ? options.htfTF : null;
  const targetTimeframe = forcedHtf ?? requestedHtf;

  if (!targetTimeframe) {
    return { candles: null, source: 'fallback-same-tf' };
  }

  if (options.htfCandles && options.htfCandles.length >= 10) {
    return { candles: options.htfCandles, source: forcedHtf ? 'mapped-htf' : 'mapped-htf' };
  }

  const sourceMinutes = getTimeframeMinutes(options.tradeTimeframe || '');
  const targetMinutes = getTimeframeMinutes(targetTimeframe);
  if (!sourceMinutes || !targetMinutes || targetMinutes <= sourceMinutes) {
    return { candles: null, source: 'fallback-same-tf' };
  }

  const ratio = Math.floor(targetMinutes / sourceMinutes);
  if (!Number.isFinite(ratio) || ratio <= 1) {
    return { candles: null, source: 'fallback-same-tf' };
  }

  const aggregated = aggregateCandlesByRatio(candles, sourceMinutes, ratio);
  if (!aggregated.length) {
    return { candles: null, source: 'fallback-same-tf' };
  }

  return { candles: aggregated, source: 'aggregated-htf' };
}

export function calculateTrendMatrix(
  candles: CandleData[],
  options: TrendMatrixOptions = {}
): TrendMatrixResult {
  if (!candles.length) {
    return {
      biasZones: [],
      tpLines: [],
      slLines: [],
      entryMarkers: [],
      chochZones: [],
      buySellLabels: [],
      summary: {
        direction: 'flat',
        entry: null,
        stop: null,
        tps: null,
        biasSource: 'fallback-same-tf',
        biasDebugSample: [],
        pendingResistance: null,
        pendingSupport: null,
        breakoutLabel: null,
        breakoutPrice: null,
        breakoutTime: null,
        reachedTp: 0,
      },
    };
  }

  const msLen = options.msLen ?? 10;
  const htfEmaLen = options.htfEmaLen ?? 50;
  const atrLength = options.atrLength ?? 14;
  const atrMult = options.atrMult ?? 4.0;
  const targetStepMult = options.targetStepMult ?? 2.0;
  const maxLossPercent = options.maxLossPercent ?? 3.0;
  const bullColor = options.bullColor ?? 'rgba(52, 230, 126, 0.85)';
  const bearColor = options.bearColor ?? 'rgba(255, 82, 241, 0.85)';
  const showSig = options.showSig ?? true;
  const showTP = options.showTP ?? true;
  const showStop = options.showStop ?? true;
  const showHTF = options.showHTF ?? true;
  const showPending = options.showPending ?? true;

  const closes = candles.map(c => c.close);
  const fallbackHtfEma = ema(closes, htfEmaLen);
  const htfResolution = resolveHtfCandles(candles, options);
  const effectiveHtfCandles = htfResolution.candles;
  const biasSource = htfResolution.source;
  const htfEma = effectiveHtfCandles && effectiveHtfCandles.length >= 2
    ? ema(effectiveHtfCandles.map((c) => c.close), htfEmaLen)
    : fallbackHtfEma;
  const alignedHtfEma = effectiveHtfCandles && effectiveHtfCandles.length >= 2
    ? alignHtfEmaByTime(candles, effectiveHtfCandles, htfEma)
    : null;
  const atrValues = atr(candles, atrLength);

  const biasZones: TrendMatrixOverlayPoint[] = [];
  const tpLines: TrendMatrixOverlayPoint[] = [];
  const slLines: TrendMatrixOverlayPoint[] = [];
  const entryMarkers: TrendMatrixOverlayPoint[] = [];
  const chochZones: TrendMatrixOverlayPoint[] = [];
  const buySellLabels: TrendMatrixOverlayPoint[] = [];
  const biasDebugSample: Array<{
    time: UTCTimestamp;
    close: number;
    biasRef: number;
    relation: 'bull' | 'bear' | 'flat';
  }> = [];

  let direction = false;
  let atrTS: number | null = null;
  let phVal: number | null = null;
  let plVal: number | null = null;
  let posDir = 0; // 1 long, -1 short, 0 flat
  let hardSL = 0;
  let entryPrice = 0;
  let liveSL = 0;
  let tp1 = 0;
  let tp2 = 0;
  let tp3 = 0;
  let tp4 = 0;
  let breakoutLabel: string | null = null;
  let breakoutPrice: number | null = null;
  let breakoutTime: UTCTimestamp | null = null;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const t = Math.floor(c.time / 1000) as UTCTimestamp;
    const a = atrValues[i] || 0;

    const ph = pivotHigh(candles, i, msLen);
    const pl = pivotLow(candles, i, msLen);
    if (ph != null) phVal = ph;
    if (pl != null) plVal = pl;

    const htfRef = alignedHtfEma?.[i] ?? fallbackHtfEma[i] ?? c.close;
    const htfBull = c.close > htfRef;
    const htfBear = c.close < htfRef;
    if (biasDebugSample.length < 5) {
      biasDebugSample.push({
        time: t,
        close: c.close,
        biasRef: htfRef,
        relation: htfBull ? 'bull' : htfBear ? 'bear' : 'flat',
      });
    }

    if (showHTF) {
      biasZones.push({
        time: t,
        value: c.close,
        color: htfBull ? 'rgba(52,230,126,0.20)' : 'rgba(255,82,241,0.20)',
      });
    }

    if (showPending) {
      if (phVal != null) chochZones.push({ time: t, value: phVal, color: 'rgba(52,230,126,0.28)' });
      if (plVal != null) chochZones.push({ time: t, value: plVal, color: 'rgba(255,82,241,0.28)' });
    }

    const bullCHoCH = phVal != null && c.close > phVal && !direction && htfBull;
    const bearCHoCH = plVal != null && c.close < plVal && direction && htfBear;

    if (bullCHoCH) {
      direction = true;
      posDir = 1;
      entryPrice = c.close;
      atrTS = c.close - a * atrMult;
      hardSL = c.close * (1 - maxLossPercent / 100);
      liveSL = Math.max(atrTS, hardSL);
      tp1 = c.close + a * targetStepMult;
      tp2 = c.close + a * targetStepMult * 2;
      tp3 = c.close + a * targetStepMult * 3;
      tp4 = c.close + a * targetStepMult * 4;
      breakoutLabel = 'Pha vo CT↑';
      breakoutPrice = c.close;
      breakoutTime = t;
      if (showSig) {
        entryMarkers.push({ time: t, value: c.low, color: bullColor });
        buySellLabels.push({ time: t, value: c.close, color: bullColor });
      }
    }

    if (bearCHoCH) {
      direction = false;
      posDir = -1;
      entryPrice = c.close;
      atrTS = c.close + a * atrMult;
      hardSL = c.close * (1 + maxLossPercent / 100);
      liveSL = Math.min(atrTS, hardSL);
      tp1 = c.close - a * targetStepMult;
      tp2 = c.close - a * targetStepMult * 2;
      tp3 = c.close - a * targetStepMult * 3;
      tp4 = c.close - a * targetStepMult * 4;
      breakoutLabel = 'Pha vo CT↓';
      breakoutPrice = c.close;
      breakoutTime = t;
      if (showSig) {
        entryMarkers.push({ time: t, value: c.high, color: bearColor });
        buySellLabels.push({ time: t, value: c.close, color: bearColor });
      }
    }

    if (posDir === 1) {
      atrTS = Math.max(atrTS ?? (c.close - a * atrMult), c.close - a * atrMult);
      liveSL = Math.max(atrTS, hardSL);
      if (showStop) slLines.push({ time: t, value: liveSL, color: 'rgba(255,82,82,0.85)' });
      if (showTP) {
        tpLines.push({ time: t, value: tp1, color: 'rgba(52,230,126,0.70)' });
        tpLines.push({ time: t, value: tp2, color: 'rgba(52,230,126,0.60)' });
        tpLines.push({ time: t, value: tp3, color: 'rgba(52,230,126,0.50)' });
        tpLines.push({ time: t, value: tp4, color: 'rgba(52,230,126,0.40)' });
      }
      if (c.low <= liveSL) {
        posDir = 0;
      }
    } else if (posDir === -1) {
      atrTS = Math.min(atrTS ?? (c.close + a * atrMult), c.close + a * atrMult);
      liveSL = Math.min(atrTS, hardSL);
      if (showStop) slLines.push({ time: t, value: liveSL, color: 'rgba(255,82,82,0.85)' });
      if (showTP) {
        tpLines.push({ time: t, value: tp1, color: 'rgba(255,82,241,0.70)' });
        tpLines.push({ time: t, value: tp2, color: 'rgba(255,82,241,0.60)' });
        tpLines.push({ time: t, value: tp3, color: 'rgba(255,82,241,0.50)' });
        tpLines.push({ time: t, value: tp4, color: 'rgba(255,82,241,0.40)' });
      }
      if (c.high >= liveSL) {
        posDir = 0;
      }
    }
  }

  if (options.debugBiasSource) {
    const lastTime = candles[candles.length - 1] ? Math.floor(candles[candles.length - 1].time / 1000) : 0;
    const context = options.debugContext ?? 'runtime';
    const symbol = options.debugSymbol ?? 'unknown';
    const key = `${context}:${symbol}:${options.tradeTimeframe ?? 'na'}:${biasSource}`;
    const prev = biasDebugLastLogByKey.get(key);
    if (prev !== lastTime) {
      biasDebugLastLogByKey.set(key, lastTime);
      console.info(
        `[TrendMatrix][BiasSource] ${context} ${symbol} tf=${options.tradeTimeframe ?? 'na'} source=${biasSource}`,
        biasDebugSample
      );
    }
  }

  const latestClose = candles[candles.length - 1]?.close ?? 0;
  let reachedTp = 0;
  if (posDir === 1) {
    if (latestClose >= tp1) reachedTp++;
    if (latestClose >= tp2) reachedTp++;
    if (latestClose >= tp3) reachedTp++;
    if (latestClose >= tp4) reachedTp++;
  } else if (posDir === -1) {
    if (latestClose <= tp1) reachedTp++;
    if (latestClose <= tp2) reachedTp++;
    if (latestClose <= tp3) reachedTp++;
    if (latestClose <= tp4) reachedTp++;
  }

  return {
    biasZones,
    tpLines,
    slLines,
    entryMarkers,
    chochZones,
    buySellLabels,
    summary: {
      direction: posDir === 1 ? 'long' : posDir === -1 ? 'short' : 'flat',
      entry: posDir !== 0 ? entryPrice : null,
      stop: posDir !== 0 ? liveSL : null,
      tps: posDir !== 0 ? [tp1, tp2, tp3, tp4] : null,
      biasSource,
      biasDebugSample,
      pendingResistance: phVal,
      pendingSupport: plVal,
      breakoutLabel,
      breakoutPrice,
      breakoutTime,
      reachedTp,
    },
  };
}
