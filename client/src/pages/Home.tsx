import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Link, useLocation } from "wouter";
import { ArrowRight, Zap, Shield, Rocket } from "lucide-react";
import DarkVeil from "@/DarkVeil";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background DarkVeil – HARUS di level paling belakang */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <DarkVeil
          speed={20}
          scale={1}
          color="#020B24"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>

      {/* Semua konten dibungkus di layer depan */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Hero Section */}
        <section className="flex-1 flex items-center justify-center py-6 md:py-10 px-4">

          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="mb-4 flex justify-center">
              <img
                src={APP_LOGO}
                alt={APP_TITLE}
                className="max-w-full h-auto logo-cyber"
              />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 neon-glow leading-tight">
              Unleash Unrestricted AI Power
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Osmora is your key to an AI without boundaries. Explore advanced capabilities,
              generate any content, and access information without limits or censorship.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                onClick={() => setLocation("/login")}
                className="bg-accent hover:bg-accent/90 text-background font-bold py-3 px-8 rounded-lg text-lg flex items-center justify-center gap-2 transition-all pulse-glow"
              >
                Get Started
                <ArrowRight size={20} />
              </Button>

              <Link href="/pricing">
                <Button
                  variant="outline"
                  className="border-accent/50 hover:border-accent text-foreground font-bold py-3 px-8 rounded-lg text-lg transition-all"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-32 px-4 bg-gradient-to-b from-background/20 to-background/60 backdrop-blur-sm">
          <div className="container max-w-6xl">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 neon-glow">
              Why Choose Osmora AI?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature Box */}
              <div className="glow-border rounded-lg p-8 bg-card/50 backdrop-blur">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-accent/20">
                  <Zap className="text-accent" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
                <p className="text-muted-foreground">
                  Experience blazing-fast AI responses powered by cutting-edge technology.
                </p>
              </div>

              <div className="glow-border rounded-lg p-8 bg-card/50 backdrop-blur">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-accent/20">
                  <Shield className="text-accent" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Secure & Private</h3>
                <p className="text-muted-foreground">
                  Your data is encrypted and protected with enterprise-grade security.
                </p>
              </div>

              <div className="glow-border rounded-lg p-8 bg-card/50 backdrop-blur">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-accent/20">
                  <Rocket className="text-accent" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Always Evolving</h3>
                <p className="text-muted-foreground">
                  Continuous improvements and new features added regularly.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
