import { Button } from "@/components/ui/button";
import { APP_LOGO_HEADERS, APP_TITLE, EXTERNAL_LINKS } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-accent/30 bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img src={APP_LOGO_HEADERS} alt={APP_TITLE} className="h-8 w-8 logo-cyber" />
          <span className="text-xl font-bold neon-glow">{APP_TITLE}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/pricing" className="text-sm font-medium hover:text-accent transition">
            Pricing
          </Link>
          <a
            href={EXTERNAL_LINKS.WHATSAPP_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:text-accent transition"
          >
            Community
          </a>
          <a
            href={EXTERNAL_LINKS.TELEGRAM_SUPPORT}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:text-accent transition"
          >
            Support
          </a>
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
              <Button
                onClick={() => logout()}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setLocation("/login")}
              className="bg-accent hover:bg-accent/90"
              size="sm"
            >
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-accent/30 bg-background/95">
          <nav className="container py-4 flex flex-col gap-4">
            <Link href="/pricing" className="text-sm font-medium hover:text-accent transition">
              Pricing
            </Link>
            <a
              href={EXTERNAL_LINKS.WHATSAPP_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-accent transition"
            >
              Community
            </a>
            <a
              href={EXTERNAL_LINKS.TELEGRAM_SUPPORT}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-accent transition"
            >
              Support
            </a>
            <div className="pt-4 border-t border-accent/30 flex flex-col gap-2">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
                  <Button
                    onClick={() => logout()}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full bg-accent hover:bg-accent/90"
                >
                  Sign In
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
