import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXTERNAL_LINKS } from "@/const";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: username,
          password,
          passwordConfirm: password,
        }),
      });

      if (res.ok) {
        // Navigate to OTP verification page
        setLocation("/verify-otp");
        return;
      }

      const data = await res.json().catch(() => ({}));
      const message = data?.error || data?.message || "Registration failed";
      alert(message);
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Signup Panel */}
      <div className="relative w-full max-w-md">
        <div className="glow-border rounded-lg p-8 bg-background/80 backdrop-blur">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold neon-glow mb-2">OSMORA AI</h1>
            <p className="text-muted-foreground">Create a New Account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                type="text"
                placeholder="Choose your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
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
                  placeholder="Create a strong password"
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

            {/* Continue Button */}
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-background font-semibold py-2 rounded-lg transition-all"
            >
              Continue
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
            <Link href="/login" className="block">
              <Button
                variant="outline"
                className="w-full border-accent/30 hover:border-accent/50 text-foreground"
              >
                Sign In to Existing Account
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

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
