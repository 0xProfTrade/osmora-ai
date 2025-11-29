# OSMORA AI Website - Project TODO

## Design & Branding
- [x] Implement neon pink/red color theme with dark cosmic background
- [x] Create glowing text effects and pulse animations
- [x] Add floating red particles animation in background
- [x] Design header with navigation (Pricing, Community, Support)

## Pages & Features
- [x] Hero landing page with "The Future of Intelligence, in Your Hands" title
- [x] Pricing page with 4 pricing cards (1 Month, 3 Months, 1 Year, Lifetime)
- [x] Login page with email/password fields
- [x] Sign up page with username/email/password fields
- [x] Forgot password page with email field
- [x] OTP verification page

## Authentication System
- [x] Create password_reset_tokens table in database
- [x] Generate OTP 6 digit
- [ ] Implement password reset with OTP flow
- [ ] Send OTP email via SMTP/Resend

## Backend Features
- [x] Create database schema for users and password reset tokens
- [x] Implement OTP generation and verification logic
- [ ] Set up email service for OTP delivery
- [x] Create tRPC procedures for auth flows
- [x] Add password reset procedures

## UI Components
- [x] Create reusable auth form components
- [x] Design pricing card components
- [x] Build header/navigation component
- [x] Create button components with neon glow effects
- [x] Design input fields with neon borders

## Testing
- [x] Write vitest tests for OTP generation
- [ ] Write vitest tests for password reset flow
- [ ] Test email sending functionality
- [ ] Test OTP verification logic

## Deployment & Finalization
- [ ] Verify all links (WhatsApp, Telegram)
- [ ] Test responsive design
- [ ] Create checkpoint for deployment


## Crypto Payment System
- [x] Create payments table in database schema
- [x] Build backend API for crypto price conversion (/api/crypto-quote)
- [x] Integrate CoinGecko API for real-time crypto prices
- [x] Create payment modal component with crypto selection
- [x] Implement plan selection logic with dynamic SELECTED badge
- [x] Add wallet address mapping for BTC, ETH, USDT networks
- [x] Integrate Telegram notification for payment submissions
- [x] Test all crypto payment flows
- [x] Verify real-time price calculations
