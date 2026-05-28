import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  http,
  isAddressEqual,
  parseAbiItem,
  type Address,
  type Hex,
} from 'viem';

export const ARBITRUM_CHAIN_ID = 42161;
export const USDT_DECIMALS = 6;
export const ARBITRUM_USDT_CONTRACT = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9' as Address;

const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

export type VerifyTransferResult =
  | {
      state: 'pending';
      reason: string;
      confirmations?: number;
      requiredConfirmations?: number;
    }
  | {
      state: 'failed';
      reason: string;
    }
  | {
      state: 'confirmed';
      confirmations: number;
      txFrom: Address;
      amountMinor: bigint;
      amountUsdt: string;
    };

interface VerifyOptions {
  txHash: Hex;
  expectedTo: Address;
  minAmountMinor: bigint;
  requiredConfirmations: number;
  rpcUrl: string;
}

export async function verifyArbitrumUsdtTransfer(options: VerifyOptions): Promise<VerifyTransferResult> {
  const client = createPublicClient({
    transport: http(options.rpcUrl),
  });

  const chainId = await client.getChainId();
  if (chainId !== ARBITRUM_CHAIN_ID) {
    return {
      state: 'failed',
      reason: `Wrong chain id from RPC: expected ${ARBITRUM_CHAIN_ID}, got ${chainId}`,
    };
  }

  const receipt = await client.getTransactionReceipt({ hash: options.txHash }).catch(() => null);
  if (!receipt) {
    return {
      state: 'pending',
      reason: 'Transaction not found yet on Arbitrum.',
    };
  }

  if (receipt.status !== 'success') {
    return {
      state: 'failed',
      reason: 'Transaction reverted on-chain.',
    };
  }

  const latestBlock = await client.getBlockNumber();
  const confirmations = Number(latestBlock - receipt.blockNumber + BigInt(1));
  if (confirmations < options.requiredConfirmations) {
    return {
      state: 'pending',
      reason: 'Waiting for more confirmations.',
      confirmations,
      requiredConfirmations: options.requiredConfirmations,
    };
  }

  let matchedAmount = BigInt(0);
  for (const log of receipt.logs) {
    if (!isAddressEqual(log.address, ARBITRUM_USDT_CONTRACT)) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: [transferEvent],
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== 'Transfer') {
        continue;
      }

      const args = decoded.args as {
        from?: Address;
        to?: Address;
        value?: bigint;
      };

      if (!args.to || !args.value) {
        continue;
      }

      if (!isAddressEqual(args.to, options.expectedTo)) {
        continue;
      }

      matchedAmount += args.value;
    } catch {
      continue;
    }
  }

  if (matchedAmount < options.minAmountMinor) {
    return {
      state: 'failed',
      reason: `USDT transfer to receiver is too low. Required >= ${options.minAmountMinor.toString()}, got ${matchedAmount.toString()}.`,
    };
  }

  return {
    state: 'confirmed',
    confirmations,
    txFrom: receipt.from,
    amountMinor: matchedAmount,
    amountUsdt: formatUnits(matchedAmount, USDT_DECIMALS),
  };
}
