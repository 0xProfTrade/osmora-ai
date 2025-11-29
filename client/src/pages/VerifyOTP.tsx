import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXTERNAL_LINKS } from "@/const";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function VerifyOTP() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !otp) {
      setError("Please enter email and OTP");
      return;
    }
    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        setError(data?.error || data?.message || "Verification failed");
        return;
      }

      // proceed to reset step (or success depending on flow)
      setStep("reset");
    } catch (err) {
      setLoading(false);
      console.error(err);
      setError("Verification failed");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          password: newPassword,
          passwordConfirm: confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        setError(data?.error || data?.message || "Reset failed");
        return;
      }

      // password reset success -> navigate to login
      navigate("/login");
    } catch (err) {
      setLoading(false);
      console.error(err);
      setError("Reset failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* OTP Panel */}
      <div className="relative w-full max-w-md">
        <div className="glow-border rounded-lg p-8 bg-background/80 backdrop-blur">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold neon-glow mb-2">OSMORA AI</h1>
            <p className="text-muted-foreground">
              {step === "verify" ? "Verify Your OTP" : "Set New Password"}
            </p>
          </div>

          {step === "verify" ? (
            /* OTP Verification Form */
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* OTP Field */}
              <div>
                <label className="block text-sm font-medium mb-2">6-Digit Code</label>
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground text-center text-2xl tracking-widest"
                />
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-background font-semibold py-2 rounded-lg transition-all"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>
          ) : (
            /* Password Reset Form */
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* New Password Field */}
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <Input
                  type="password"
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Reset Button */}
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-background font-semibold py-2 rounded-lg transition-all"
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}

          {/* Links */}
          <div className="mt-6 space-y-3">
            <Link href="/login" className="block">
              <Button
                variant="outline"
                className="w-full border-accent/30 hover:border-accent/50 text-foreground"
              >
                Back to Login
              </Button>
            </Link>

            <a href={EXTERNAL_LINKS.WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="w-full border-accent/30 hover:border-accent/50 text-foreground bg-cyan-950/20"
              >
                Join Our Channel
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
