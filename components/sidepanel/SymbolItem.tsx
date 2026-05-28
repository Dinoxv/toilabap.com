'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import MiniPriceChart from '@/components/scanner/MiniPriceChart';

const FavouriteIcon = ({ isPinned }: { isPinned: boolean }) => (
  <span className="text-[9px] leading-none font-bold tracking-wide" aria-hidden="true">
    {isPinned ? 'DEL' : 'ADD'}
  </span>
);

interface SymbolItemProps {
  symbol: string;
  selectedSymbol: string;
  onSymbolSelect?: (symbol: string) => void;
  address: string;
  isPinned: boolean;
  isTop20: boolean;
  volumeInMillions: string | null;
  closePrices?: number[];
  onToggleFavourite: (symbol: string, isPinned: boolean) => void;
  SymbolPrice: React.ComponentType<{ symbol: string; pnlAnimationClass?: string; closePrices?: number[]; show24hChange?: boolean }>;
  SymbolVolume: React.ComponentType<{ symbol: string; volumeInMillions: string }>;
  invertedMode: boolean;
}

const SymbolItem = ({
  symbol,
  selectedSymbol,
  onSymbolSelect,
  address,
  isPinned,
  isTop20,
  volumeInMillions,
  closePrices,
  onToggleFavourite,
  SymbolPrice,
  SymbolVolume,
  invertedMode
}: SymbolItemProps) => {
  const router = useRouter();
  const isSelected = selectedSymbol === symbol;

  return (
    <div
      className={`${
        isSelected
          ? 'border-2 border-primary'
          : 'terminal-border hover:bg-primary/10'
      } w-full box-border transition-all duration-150 symbol-item-row`}
    >
      <div className="flex items-stretch">
        <div className="flex flex-col flex-1 min-w-0">
          <button
            onClick={() => {
              if (onSymbolSelect) {
                onSymbolSelect(symbol);
              } else {
                router.push(`/${address}/${symbol}`);
              }
            }}
            className="flex-1 min-w-0 text-left p-2 pb-0 cursor-pointer relative active:scale-[0.98] transition-transform duration-100"
          >
            {closePrices && closePrices.length > 0 && (
              <div className="absolute inset-y-0 left-0 right-[40%] opacity-50 pointer-events-none">
                <MiniPriceChart closePrices={closePrices} invertedMode={invertedMode} />
              </div>
            )}
            <div className="flex justify-between items-stretch gap-2 relative z-10">
              <div className="flex flex-col justify-between min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-primary font-bold flex-shrink-0 text-xs"
                    title={`${symbol}/USD trading pair`}
                  >
                    {symbol}/USD
                  </span>
                  {isPinned && (
                    <span
                      className="inline-flex items-center justify-center text-bullish"
                      title="In favourite list"
                    >
                      <span className="text-[9px] leading-none font-bold tracking-wide">FAV</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1">
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <SymbolPrice symbol={symbol} closePrices={closePrices} show24hChange={true} />
                {volumeInMillions && (
                  <SymbolVolume symbol={symbol} volumeInMillions={volumeInMillions} />
                )}
              </div>
            </div>
          </button>
        </div>
        <div className="w-[78px] shrink-0 flex items-center justify-end gap-1 pr-1 symbol-item-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavourite(symbol, isPinned);
            }}
            className={`w-[44px] h-[28px] rounded-md border active:scale-90 cursor-pointer transition-all duration-150 flex items-center justify-center ${
              isPinned
                ? 'text-black border-yellow-300 bg-yellow-300 hover:bg-yellow-200'
                : 'text-yellow-300 border-yellow-300 bg-yellow-300/10 hover:bg-yellow-300/20'
            }`}
            title={isPinned ? 'Remove from favourite list' : 'Add to favourite list'}
          >
            <FavouriteIcon isPinned={isPinned} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/${address}/chart-popup/${symbol}`, '_blank', 'width=1200,height=800');
            }}
            className="w-[28px] h-[28px] p-0 flex items-center justify-center text-primary-muted hover:text-primary active:scale-90 cursor-pointer transition-all duration-150"
            title="Open in new window"
          >
            <span className="text-lg">⧉</span>
          </button>
        </div>
      </div>
    </div>
  );
};

SymbolItem.displayName = 'SymbolItem';

function areEqual(prevProps: SymbolItemProps, nextProps: SymbolItemProps) {
  if (prevProps.symbol !== nextProps.symbol) return false;
  if (prevProps.selectedSymbol !== nextProps.selectedSymbol) return false;
  if (prevProps.isPinned !== nextProps.isPinned) return false;
  if (prevProps.isTop20 !== nextProps.isTop20) return false;
  if (prevProps.volumeInMillions !== nextProps.volumeInMillions) return false;
  if (prevProps.invertedMode !== nextProps.invertedMode) return false;
  if (prevProps.address !== nextProps.address) return false;

  if (prevProps.closePrices?.length !== nextProps.closePrices?.length) return false;
  if (prevProps.closePrices && nextProps.closePrices) {
    const prevLast = prevProps.closePrices[prevProps.closePrices.length - 1];
    const nextLast = nextProps.closePrices[nextProps.closePrices.length - 1];
    if (prevLast !== nextLast) return false;
  }

  return true;
}

export default memo(SymbolItem, areEqual);
