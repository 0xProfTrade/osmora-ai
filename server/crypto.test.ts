import { describe, it, expect, vi } from "vitest";
import {
  getCryptoConfig,
  getAvailableCryptos,
  calculateCryptoAmount,
  CRYPTO_WALLETS,
} from "./crypto";

describe("Crypto Utilities", () => {
  describe("getCryptoConfig", () => {
    it("should return config for BTC", () => {
      const config = getCryptoConfig("BTC");
      expect(config.symbol).toBe("BTC");
      expect(config.network).toBe("Bitcoin mainnet");
      expect(config.address).toBe("bc1pevk65wxl7cgan87ve2zdxf0y03hk6dnmjjalx34g379dqtdlgh4q3umq86");
    });

    it("should return config for ETH", () => {
      const config = getCryptoConfig("ETH");
      expect(config.symbol).toBe("ETH");
      expect(config.network).toBe("Ethereum / ERC-20");
      expect(config.address).toBe("0x9fe135eb7DFf3F57929d8a8585D80ca39dD1427d");
    });

    it("should return config for USDT_TRC20", () => {
      const config = getCryptoConfig("USDT_TRC20");
      expect(config.symbol).toBe("USDT");
      expect(config.network).toBe("USDT TRC-20");
      expect(config.address).toBe("TBgPfv3yWeaQ7MLwvN7Jz86TNCweVZsyo3");
    });

    it("should return config for USDT_ERC20", () => {
      const config = getCryptoConfig("USDT_ERC20");
      expect(config.symbol).toBe("USDT");
      expect(config.network).toBe("USDT ERC-20");
      expect(config.address).toBe("0x9fe135eb7DFf3F57929d8a8585D80ca39dD1427d");
    });

    it("should return config for USDT_SOL", () => {
      const config = getCryptoConfig("USDT_SOL");
      expect(config.symbol).toBe("USDT");
      expect(config.network).toBe("USDT SOL (Solana)");
      expect(config.address).toBe("U5FU5PqJnJ4ePqBCGbk8LC6WqJzSHBHZHT3PQQbVHAE");
    });

    it("should throw error for invalid crypto type", () => {
      expect(() => getCryptoConfig("INVALID" as any)).toThrow("Unknown crypto type");
    });
  });

  describe("getAvailableCryptos", () => {
    it("should return all 5 crypto options", () => {
      const cryptos = getAvailableCryptos();
      expect(cryptos).toHaveLength(5);
    });

    it("should include BTC, ETH, USDT_TRC20, USDT_ERC20, USDT_SOL", () => {
      const cryptos = getAvailableCryptos();
      const types = cryptos.map((c) => c.type);
      expect(types).toContain("BTC");
      expect(types).toContain("ETH");
      expect(types).toContain("USDT_TRC20");
      expect(types).toContain("USDT_ERC20");
      expect(types).toContain("USDT_SOL");
    });

    it("should have valid config for each crypto", () => {
      const cryptos = getAvailableCryptos();
      cryptos.forEach(({ config }) => {
        expect(config.name).toBeTruthy();
        expect(config.symbol).toBeTruthy();
        expect(config.network).toBeTruthy();
        expect(config.address).toBeTruthy();
        expect(config.coingeckoId).toBeTruthy();
      });
    });
  });

  describe("calculateCryptoAmount", () => {
    it("should calculate correct amount for BTC at $45000", () => {
      const amount = calculateCryptoAmount(110, 45000);
      const numAmount = parseFloat(amount);
      expect(numAmount).toBeCloseTo(110 / 45000, 8);
    });

    it("should calculate correct amount for ETH at $2500", () => {
      const amount = calculateCryptoAmount(110, 2500);
      const numAmount = parseFloat(amount);
      expect(numAmount).toBeCloseTo(110 / 2500, 8);
    });

    it("should format to 8 decimal places", () => {
      const amount = calculateCryptoAmount(100, 50000);
      const parts = amount.split(".");
      expect(parts[1]).toHaveLength(8);
    });

    it("should handle small amounts", () => {
      const amount = calculateCryptoAmount(10, 50000);
      const numAmount = parseFloat(amount);
      expect(numAmount).toBeGreaterThan(0);
      expect(numAmount).toBeLessThan(1);
    });

    it("should handle large amounts", () => {
      const amount = calculateCryptoAmount(50000, 50000);
      const numAmount = parseFloat(amount);
      expect(numAmount).toBeCloseTo(1, 8);
    });
  });

  describe("CRYPTO_WALLETS", () => {
    it("should not include BNB or BEP-20", () => {
      const walletKeys = Object.keys(CRYPTO_WALLETS);
      expect(walletKeys).not.toContain("BNB");
      expect(walletKeys).not.toContain("BEP20");
      walletKeys.forEach((key) => {
        const config = CRYPTO_WALLETS[key as any];
        expect(config.network).not.toContain("BNB");
        expect(config.network).not.toContain("BEP-20");
      });
    });

    it("should have exactly 5 wallet entries", () => {
      const keys = Object.keys(CRYPTO_WALLETS);
      expect(keys).toHaveLength(5);
    });
  });
});
