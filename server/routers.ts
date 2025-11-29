import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCryptoConfig, calculateCryptoAmount, getCryptoPrice, CryptoType } from "./crypto";
import { getDb } from "./db";
import { payments } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    sendPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        // TODO: Implement password reset email sending
        return { success: true, message: "Reset code sent to email" };
      }),
    verifyOTP: publicProcedure
      .input(z.object({ email: z.string().email(), otp: z.string().length(6) }))
      .mutation(async ({ input }) => {
        // TODO: Implement OTP verification
        return { success: true, message: "OTP verified" };
      }),
    resetPassword: publicProcedure
      .input(z.object({ email: z.string().email(), otp: z.string().length(6), newPassword: z.string().min(8) }))
      .mutation(async ({ input }) => {
        // TODO: Implement password reset
        return { success: true, message: "Password reset successfully" };
      }),
  }),

  // Crypto payment routes
  crypto: router({
    getQuote: publicProcedure
      .input(
        z.object({
          planName: z.string(),
          priceUsd: z.number().positive(),
          coin: z.enum(["BTC", "ETH", "USDT_TRC20", "USDT_ERC20", "USDT_SOL"]),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const config = getCryptoConfig(input.coin as CryptoType);
          const cryptoPrice = await getCryptoPrice(config.coingeckoId);
          const amountCrypto = calculateCryptoAmount(input.priceUsd, cryptoPrice);

          return {
            success: true,
            coin: input.coin,
            amount: amountCrypto,
            address: config.address,
            network: config.network,
            rateUsd: cryptoPrice,
          };
        } catch (error) {
          console.error("Failed to get crypto quote:", error);
          return {
            success: false,
            error: "Failed to fetch crypto price. Please try again.",
          };
        }
      }),

    submitPayment: publicProcedure
      .input(
        z.object({
          userEmail: z.string().email(),
          planName: z.string(),
          priceUsd: z.number().positive(),
          coin: z.enum(["BTC", "ETH", "USDT_TRC20", "USDT_ERC20", "USDT_SOL"]),
          amountCrypto: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const config = getCryptoConfig(input.coin as CryptoType);
          const db = await getDb();

          if (!db) {
            return {
              success: false,
              error: "Database connection failed",
            };
          }

          await db.insert(payments).values({
            userEmail: input.userEmail,
            planName: input.planName,
            priceUsd: input.priceUsd,
            coin: input.coin,
            network: config.network,
            amountCrypto: input.amountCrypto,
            address: config.address,
            status: "pending",
          });

          return {
            success: true,
            message: "Payment recorded. Please send your transaction hash to Telegram: https://t.me/OxProfTradez",
          };
        } catch (error) {
          console.error("Failed to submit payment:", error);
          return {
            success: false,
            error: "Failed to record payment. Please try again.",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
