export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "App";

export const APP_LOGO = "https://files.catbox.moe/g5hfhi.svg";

export const APP_LOGO_HEADERS = "https://files.catbox.moe/hpqq12.svg";

export const EXTERNAL_LINKS = {
  WHATSAPP_CHANNEL: "https://whatsapp.com/channel/0029VbBuN0jEVccHJcUE8k1R",
  TELEGRAM_SUPPORT: "https://t.me/OxProfTradez",
};

export const PRICING_PLANS = [
  {
    id: "1-month",
    name: "1 Month",
    price: 50,
    currency: "$",
    selected: false,
    badge: null,
    features: [
      "Unlimited Generations",
      "Standard Responses",
      "Full Access",
    ],
    buttonColor: "dark",
  },
  {
    id: "3-months",
    name: "3 Months",
    price: 110,
    currency: "$",
    selected: true,
    badge: "SELECTED",
    features: [
      "Unlimited Generations",
      "Standard Responses",
      "Full Access",
      "Priority Access",
    ],
    buttonColor: "neon",
  },
  {
    id: "1-year",
    name: "1 Year",
    price: 175,
    currency: "$",
    selected: false,
    badge: null,
    features: [
      "Unlimited Generations",
      "Full Access",
      "Priority Access",
      "Faster Response",
    ],
    buttonColor: "dark",
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: 50000,
    currency: "$",
    selected: false,
    badge: null,
    features: [
      "Unlimited Generations",
      "File & Web Search",
      "Desktop & Mobile Access",
      "Semua fitur premium",
    ],
    buttonColor: "dark",
  },
];

// Simplified login URL generator that uses the app's own login route.
// Removed Manus / external OAuth portal usage.
export const getLoginUrl = () => {
  // returns the app's login page URL (client-side route)
  return `${window.location.origin}/login`;
};
