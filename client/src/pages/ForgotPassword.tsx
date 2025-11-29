import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXTERNAL_LINKS } from "@/const";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const sendReset = trpc.auth.sendPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to send reset code. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    sendReset.mutate({ email });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        {/* Background Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        </div>

        {/* Success Panel */}
        <div className="relative w-full max-w-md">
          <div className="glow-border rounded-lg p-8 bg-background/80 backdrop-blur text-center">
            <h1 className="text-3xl font-bold neon-glow mb-4">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset code to <strong>{email}</strong>. The code will expire in 5 minutes.
            </p>
            <Button
              onClick={() => navigate("/verify-otp")}
              className="w-full bg-accent hover:bg-accent/90 text-background font-semibold py-2 rounded-lg transition-all"
            >
              Enter Reset Code
            </Button>
            <Link href="/login" className="block mt-4">
              <span className="text-sm text-accent hover:text-accent/80 transition">
                Back to Login
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Reset Password Panel */}
      <div className="relative w-full max-w-md">
        <div className="glow-border rounded-lg p-8 bg-background/80 backdrop-blur">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold neon-glow mb-2">OSMORA AI</h1>
            <p className="text-muted-foreground">Reset Your Password</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Send Reset Code Button */}
            <Button
              type="submit"
              disabled={sendReset.isPending}
              className="w-full bg-accent hover:bg-accent/90 text-background font-semibold py-2 rounded-lg transition-all disabled:opacity-50"
            >
              {sendReset.isPending ? "Sending..." : "Send Reset Code"}
            </Button>
          </form>

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
