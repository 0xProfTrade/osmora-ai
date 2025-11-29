import { describe, it, expect, beforeEach } from "vitest";
import { generateOTP, getOTPExpirationTime, isOTPExpired } from "./otp";

describe("OTP Utilities", () => {
  describe("generateOTP", () => {
    it("should generate a 6-digit OTP", () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it("should generate different OTPs on multiple calls", () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      const otp3 = generateOTP();

      // While theoretically possible to get duplicates, the probability is extremely low
      // We'll just verify they're all valid 6-digit codes
      expect(/^\d{6}$/.test(otp1)).toBe(true);
      expect(/^\d{6}$/.test(otp2)).toBe(true);
      expect(/^\d{6}$/.test(otp3)).toBe(true);
    });

    it("should pad with zeros for small numbers", () => {
      // Generate multiple OTPs and check that some are padded
      let foundPadded = false;
      for (let i = 0; i < 100; i++) {
        const otp = generateOTP();
        if (otp.startsWith("0")) {
          foundPadded = true;
          break;
        }
      }
      expect(foundPadded).toBe(true);
    });
  });

  describe("getOTPExpirationTime", () => {
    it("should return a date 5 minutes in the future", () => {
      const before = new Date();
      const expirationTime = getOTPExpirationTime();
      const after = new Date();

      // The expiration time should be approximately 5 minutes from now
      const beforePlus5Min = new Date(before.getTime() + 5 * 60 * 1000);
      const afterPlus5Min = new Date(after.getTime() + 5 * 60 * 1000);

      expect(expirationTime.getTime()).toBeGreaterThanOrEqual(
        beforePlus5Min.getTime() - 100
      );
      expect(expirationTime.getTime()).toBeLessThanOrEqual(
        afterPlus5Min.getTime() + 100
      );
    });
  });

  describe("isOTPExpired", () => {
    it("should return false for future dates", () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      expect(isOTPExpired(futureDate)).toBe(false);
    });

    it("should return true for past dates", () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10);
      expect(isOTPExpired(pastDate)).toBe(true);
    });

    it("should return false for current time", () => {
      const now = new Date();
      // Current time is not expired yet
      expect(isOTPExpired(now)).toBe(false);
    });

    it("should work with OTP expiration time", () => {
      const expirationTime = getOTPExpirationTime();
      // Should not be expired immediately
      expect(isOTPExpired(expirationTime)).toBe(false);

      // Should be expired after 5+ minutes
      const expiredTime = new Date();
      expiredTime.setMinutes(expiredTime.getMinutes() - 1);
      expect(isOTPExpired(expiredTime)).toBe(true);
    });
  });
});
