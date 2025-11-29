import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, Copy, Check } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    name: string;
    priceUsd: number;
  };
}

type CryptoType = "BTC" | "ETH" | "USDT_TRC20" | "USDT_ERC20" | "USDT_SOL";

const CRYPTO_OPTIONS: Array<{ value: CryptoType; label: string }> = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH - ERC-20)" },
  { value: "USDT_TRC20", label: "USDT (TRC-20)" },
  { value: "USDT_ERC20", label: "USDT (ERC-20)" },
  { value: "USDT_SOL", label: "USDT (Solana)" },
];

export default function PaymentModal({ isOpen, onClose, plan }: PaymentModalProps) {
  const [selectedCoin, setSelectedCoin] = useState<CryptoType>("BTC");
  const [userEmail, setUserEmail] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const getQuote = trpc.crypto.getQuote.useMutation();
  const submitPayment = trpc.crypto.submitPayment.useMutation();

  const handleCoinChange = (coin: CryptoType) => {
    setSelectedCoin(coin);
    getQuote.mutate({
      planName: plan.name,
      priceUsd: plan.priceUsd,
      coin,
    });
  };

  const handleSubmitPayment = () => {
    if (!userEmail) {
      alert("Please enter your email address");
      return;
    }

    if (!getQuote.data?.success) {
      alert("Please wait for the price quote to load");
      return;
    }

    submitPayment.mutate(
      {
        userEmail,
        planName: plan.name,
        priceUsd: plan.priceUsd,
        coin: selectedCoin,
        amountCrypto: getQuote.data?.amount || "",
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setPaymentSubmitted(true);
            setTimeout(() => {
              onClose();
              setPaymentSubmitted(false);
              setUserEmail("");
            }, 3000);
          }
        },
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  onClick={onClose}
  >
      <div
  className="bg-background border border-accent/30 rounded-lg max-w-md w-full p-6 glow-border max-h-[90vh] overflow-y-auto"
  onClick={(e) => e.stopPropagation()}
>
        
        {/* Header (UPDATED) */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-accent hover:text-accent/80 text-xl font-bold"
            >
              &lt;
            </button>

            <h2 className="text-xl font-bold">
              Confirmation Payment Osmora-AI
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl"
          >
            ×
          </button>
        </div>

        {paymentSubmitted ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-bold mb-2">Payment Recorded!</h3>
            <p className="text-muted-foreground mb-4">
              Please send your transaction hash to Telegram:
            </p>
            <a
              href="https://t.me/OxProfTradez"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline font-semibold"
            >
              https://t.me/OxProfTradez
            </a>
          </div>
        ) : (
          <>
            {/* Plan Info */}
            <div className="mb-6 p-4 bg-card/50 rounded-lg border border-accent/20">
              <p className="text-muted-foreground text-sm">Plan</p>
              <p className="text-xl font-bold mb-2">{plan.name}</p>
              <p className="text-muted-foreground text-sm">Price</p>
              <p className="text-2xl font-bold text-accent">${plan.priceUsd}</p>
            </div>

            {/* Email Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Email Address</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="bg-input border-accent/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Crypto Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">Select Payment Method</label>
              <div className="space-y-2">
                {CRYPTO_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleCoinChange(option.value)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedCoin === option.value
                        ? "border-accent bg-accent/10"
                        : "border-accent/20 hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          selectedCoin === option.value
                            ? "border-accent bg-accent"
                            : "border-accent/50"
                        }`}
                      />
                      <span className="font-semibold">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quote Display */}
            {getQuote.isPending ? (
              <div className="mb-6 p-4 bg-card/50 rounded-lg border border-accent/20 flex items-center justify-center">
                <Loader2 className="animate-spin mr-2" size={20} />
                <span>Loading price...</span>
              </div>
            ) : getQuote.data?.success ? (
              <div className="mb-6 p-4 bg-card/50 rounded-lg border border-accent/20">
                <div className="mb-3">
                  <p className="text-muted-foreground text-sm">Amount to Send</p>
                  <p className="text-2xl font-bold text-accent">{getQuote.data.amount}</p>
                  {getQuote.data.rateUsd && (
                    <p className="text-muted-foreground text-xs">
                      @ ${getQuote.data.rateUsd.toFixed(2)} per {selectedCoin.split("_")[0]}
                    </p>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-muted-foreground text-sm mb-2">Send to Address</p>
                  <div className="flex items-center gap-2 bg-input p-2 rounded border border-accent/20">
                    <code className="text-xs font-mono text-accent flex-1 break-all">
                      {getQuote.data.address || ""}
                    </code>
                    <button
                      onClick={() => copyToClipboard(getQuote.data?.address || "")}
                      className="text-accent hover:text-accent/80 transition-colors"
                    >
                      {copiedAddress ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                {getQuote.data.network && (
                  <p className="text-muted-foreground text-xs">
                    Network: {getQuote.data.network}
                  </p>
                )}
              </div>
            ) : getQuote.data?.error ? (
              <div className="mb-6 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <p className="text-red-500 text-sm">{getQuote.data.error}</p>
              </div>
            ) : null}

            {/* Instructions */}
            <div className="mb-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm font-semibold mb-2">Instructions:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Send the exact amount shown above</li>
                <li>Copy the wallet address (click the copy icon)</li>
                <li>Send from your crypto wallet</li>
                <li>After sending, submit your transaction hash to Telegram</li>
              </ol>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitPayment}
              disabled={submitPayment.isPending || !getQuote.data?.success}
              className="w-full bg-accent hover:bg-accent/90 text-background font-bold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              {submitPayment.isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Processing...
                </>
              ) : (
                "I've Sent Payment"
              )}
            </Button>

            {/* Telegram Link */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Send transaction hash to:{" "}
              <a
                href="https://t.me/OxProfTradez"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                @OxProfTradez
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
