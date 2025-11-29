import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@/const";
import { Check, Zap } from "lucide-react";
import PaymentModal from "@/components/PaymentModal";

interface SelectedPlan {
  name: string;
  priceUsd: number;
}

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleChoosePlan = (plan: (typeof PRICING_PLANS)[0]) => {
    setSelectedPlan({
      name: plan.name,
      priceUsd: plan.price,
    });
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background py-12 md:py-20">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 neon-glow">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_PLANS.map((plan) => {
            const isSelected = selectedPlan?.name === plan.name;
            return (
              <div
                key={plan.id}
                className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
                  isSelected
                    ? "glow-border lg:scale-105 shadow-2xl"
                    : "border border-accent/20 hover:border-accent/50"
                }`}
              >
                {/* Card Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />

                {/* Content */}
                <div className="relative p-6 flex flex-col h-full">
                  {/* Badge */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-accent text-background px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      SELECTED
                    </div>
                  )}

                  {/* Plan Name */}
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.currency}{plan.price.toLocaleString()}</span>
                    {plan.id !== "lifetime" && (
                      <span className="text-muted-foreground text-sm ml-2">/month</span>
                    )}
                  </div>

                  {/* Features */}
                  <div className="mb-8 flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          {plan.id === "1-year" && feature === "Faster Response" ? (
                            <Zap size={18} className="text-accent flex-shrink-0 mt-0.5" />
                          ) : (
                            <Check size={18} className="text-accent flex-shrink-0 mt-0.5" />
                          )}
                          <span className="text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Button */}
                  <Button
                    onClick={() => handleChoosePlan(plan)}
                    className={`w-full font-semibold transition-all ${
                      isSelected
                        ? "bg-accent hover:bg-accent/90 text-background pulse-glow"
                        : plan.buttonColor === "dark"
                        ? "bg-secondary hover:bg-secondary/80 text-foreground border border-accent/30"
                        : "bg-accent hover:bg-accent/90 text-background"
                    }`}
                    size="lg"
                  >
                    Choose Plan
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="border border-accent/20 rounded-lg p-6">
              <h3 className="font-bold mb-2">Can I change my plan later?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
            <div className="border border-accent/20 rounded-lg p-6">
              <h3 className="font-bold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept cryptocurrency payments including Bitcoin (BTC), Ethereum (ETH), and USDT on multiple networks (ERC-20, TRC-20, Solana).
              </p>
            </div>
            <div className="border border-accent/20 rounded-lg p-6">
              <h3 className="font-bold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground">
                Contact our support team to learn about trial options for your specific needs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
        />
      )}
    </div>
  );
}
