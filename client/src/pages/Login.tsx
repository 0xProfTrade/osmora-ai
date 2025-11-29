import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXTERNAL_LINKS } from "@/const";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (res.ok) {
        // server sets auth cookie / returns user; navigate to dashboard or home
        setLocation("/");
        return;
      }

      const data = await res.json().catch(() => ({}));
      const message = data?.error || data?.message || "Login failed";
      toast.error(message);
    } catch (err) {
      console.error(err);
      toast.error("Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Login Panel */}
      <div className="relative w-full max-w-md">
        <div className="glow-border rounded-lg p-8 bg-background/80 backdrop-blur">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold neon-glow mb-2">OSMORA AI</h1>
            <p className="text-muted-foreground">Sign in to Your Osmora Account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Email or Username</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-background font-semibold py-2 rounded-lg transition-all"
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-accent/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">or</span>
            </div>
          </div>

          {/* Links */}
          <div className="mt-6 space-y-3">
            <Link href="/signup" className="block">
              <Button
                variant="outline"
                className="w-full border-accent/30 hover:border-accent/50 text-foreground"
              >
                Create a New Account
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

            <Link href="/forgot-password" className="block text-center">
              <span className="text-sm text-accent hover:text-accent/80 transition">
                Forgot Password?
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
