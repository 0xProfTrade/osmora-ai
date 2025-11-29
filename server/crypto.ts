/**
 * Crypto payment configuration and utilities
 */

export type CryptoType = "BTC" | "ETH" | "USDT_TRC20" | "USDT_ERC20" | "USDT_SOL";

export interface CryptoConfig {
  name: string;
  symbol: string;
  network: string;
  address: string;
  coingeckoId: string;
}

/**
 * Wallet address mapping for each crypto network
 */
export const CRYPTO_WALLETS: Record<CryptoType, CryptoConfig> = {
  BTC: {
    name: "Bitcoin",
    symbol: "BTC",
    network: "Bitcoin mainnet",
    address: "bc1pevk65wxl7cgan87ve2zdxf0y03hk6dnmjjalx34g379dqtdlgh4q3umq86",
    coingeckoId: "bitcoin",
  },
  ETH: {
    name: "Ethereum",
    symbol: "ETH",
    network: "Ethereum / ERC-20",
    address: "0x9fe135eb7DFf3F57929d8a8585D80ca39dD1427d",
    coingeckoId: "ethereum",
  },
  USDT_ERC20: {
    name: "USDT",
    symbol: "USDT",
    network: "USDT ERC-20",
    address: "0x9fe135eb7DFf3F57929d8a8585D80ca39dD1427d",
    coingeckoId: "tether",
  },
  USDT_TRC20: {
    name: "USDT",
    symbol: "USDT",
    network: "USDT TRC-20",
    address: "TBgPfv3yWeaQ7MLwvN7Jz86TNCweVZsyo3",
    coingeckoId: "tether",
  },
  USDT_SOL: {
    name: "USDT",
    symbol: "USDT",
    network: "USDT SOL (Solana)",
    address: "U5FU5PqJnJ4ePqBCGbk8LC6WqJzSHBHZHT3PQQbVHAE",
    coingeckoId: "tether",
  },
};

/**
 * Get crypto configuration by type
 */
export function getCryptoConfig(coin: CryptoType): CryptoConfig {
  const config = CRYPTO_WALLETS[coin];
  if (!config) {
    throw new Error(`Unknown crypto type: ${coin}`);
  }
  return config;
}

/**
 * Get all available crypto options
 */
export function getAvailableCryptos(): Array<{ type: CryptoType; config: CryptoConfig }> {
  return Object.entries(CRYPTO_WALLETS).map(([type, config]) => ({
    type: type as CryptoType,
    config,
  }));
}

/**
 * Fetch current crypto price from CoinGecko API
 */
export async function getCryptoPrice(coingeckoId: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data = await response.json();
    const price = data[coingeckoId]?.usd;

    if (!price) {
      throw new Error(`No price data for ${coingeckoId}`);
    }

    return price;
  } catch (error) {
    console.error("Failed to fetch crypto price:", error);
    throw error;
  }
}

/**
 * Calculate crypto amount from USD price
 */
export function calculateCryptoAmount(priceUsd: number, cryptoPrice: number): string {
  const amount = priceUsd / cryptoPrice;
  // Format to 8 decimal places for crypto precision
  return amount.toFixed(8);
}
