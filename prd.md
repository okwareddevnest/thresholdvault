# **ThresholdVault Product Requirements Document (PRD)**
**Version 1.0 | Hackathon Edition**
**Document Owner:** Product Lead
**Last Updated:** November 9, 2025

---

## **1. Executive Summary**

ThresholdVault is a **mobile-first Progressive Web App (PWA)** that enables Bitcoin holders to create autonomous inheritance vaults secured by ICP's threshold cryptography. The product eliminates the $160B problem of lost Bitcoin by allowing users to designate guardians who can help recover funds if the owner becomes inactive—all without custodial risk, bridges, or intermediaries.

**Key Differentiators:**
- **Native Bitcoin:** Real BTC held via tECDSA, no wrapping
- **Mobile-First PWA:** Installs like native app, works offline for reads
- **Zero-Trust Execution:** Canister-controlled dead-man switch with immutable logic
- **Privacy-Preserving:** Guardians hold encrypted key fragments, never full keys

---

## **2. Problem Statement & Product Vision**

### **2.1 Problem**
- **4M BTC ($160B)** lost forever due to death/key loss
- Existing solutions require trusted third parties or complex multi-sig that fails when signers are unavailable
- No mobile-native, self-custodial solution exists for non-technical users

### **2.2 Vision**
Create the **de facto standard for Bitcoin inheritance**—a mobile app so intuitive that a 60-year-old Bitcoin holder can secure their family's future in 3 minutes, while leveraging ICP's unique capabilities to provide cryptographic guarantees impossible elsewhere.

---

## **3. User Personas**

### **3.1 Primary: "HODLer Dad"**
- **Name:** Michael Chen
- **Age:** 47
- **Tech Level:** Intermediate (uses Coinbase, owns Ledger but finds it stressful)
- **Goal:** Ensure his 3.5 BTC automatically goes to his two children if something happens
- **Frustration:** Lawyers don't understand Bitcoin; worried about hardware wallet backup
- **Device:** iPhone 14 Pro (primary), MacBook Air (occasional)

### **3.2 Secondary: "Crypto OG"**
- **Name:** Sarah Nakamoto
- **Age:** 34
- **Tech Level:** Advanced (runs node, uses CLI)
- **Goal:** Trustless solution for her 50 BTC without any custodian
- **Frustration:** Shamir backup is static; wants autonomous execution
- **Device:** Pixel 8 (primary), Linux desktop (secondary)

### **3.3 Tertiary: "DAO Treasurer"**
- **Name:** Alex Rivera
- **Age:** 29
- **Tech Level:** Expert (smart contract developer)
- **Goal:** Succession plan for DAO treasury where no single founder can rug
- **Frustration:** Multi-sig creates key-person risk; needs time-based execution
- **Device:** iPad Pro (primary), multi-monitor workstation (secondary)

---

## **4. User Journey Maps**

### **4.1 Happy Path: First-Time Vault Creation (Mobile PWA)**

| Step | User Action | App Response | Time | Technical Flow |
|------|-------------|--------------|------|----------------|
| 1 | Open PWA, tap "Create Vault" | Load Identity Provider (II) | 2s | II auth session initiated |
| 2 | Authenticate via Face ID | Redirect to Dashboard | 3s | Principal generated, canister deployed |
| 3 | Tap "Set Up Inheritance" | Show Setup Wizard (Step 1/3) | 1s | Wizard component mounts |
| 4 | Enter vault name: "Kids Fund" | Validate input (max 32 chars) | 0.2s | Client-side validation |
| 5 | Tap "Next" | Generate Bitcoin address | 5s | `ecdsa_public_key` call, derive P2TR |
| 6 | View QR code & address | Display with copy button | 1s | Address cached, QR rendered |
| 7 | Send 0.1 BTC to address | Show "Pending Deposit" screen | 10m | Poll `bitcoin_get_utxos` every 30s |
| 8 | Deposit confirmed | Animate shield icon, show success | 2s | UTXO detected, balance updated |
| 9 | Tap "Add Guardians" | Show contact picker/email field | 1s | Guardian form rendered |
| 10 | Add 3 guardians via email | Send encrypted invitations | 3s | `vetkd_encrypted_key_share` calls |
| 11 | Set heartbeat: 30 days | Show summary screen | 1s | Timer configured, `ic0.global_timer_set` |
| 12 | Tap "Activate Vault" | Show success animation | 2s | Vault status: ACTIVE, emit event |
| **Total** | | | **~11 minutes** | **8 canister calls, 1 Bitcoin TX** |

---

## **5. Functional Requirements (FR)**

### **FR-01: PWA Installation & Onboarding**
**Priority:** P0 (Critical)

| ID | Requirement | Acceptance Criteria | UI/UX Spec |
|----|-------------|---------------------|------------|
| FR-01.1 | App must be installable as PWA on iOS/Android | - Lighthouse PWA score ≥90%<br>- iOS Safari "Add to Home Screen" prompt<br>- Android Chrome A2HS banner triggers<br>- App icon uses `logo.png` (512x512px) | **Icon:** Full logo with shield + ₿<br>**Splash:** #0A0E27 background, centered logo (120px), "Secured by ICP" text (#29ABE2) |
| FR-01.2 | First launch shows value prop in 3 slides | - Swipeable carousel<br>- Slide 1: "Never Lose Bitcoin Again"<br>- Slide 2: "Your Guardians, Your Rules"<br>- Slide 3: "Autonomous & Trustless"<br>- "Get Started" button on slide 3 | **Slide Bg:** Gradient #0A0E27 → #1A1F3A<br>**Typography:** Space Grotesk Bold, 28sp, #FFFFFF<br>**CTA Button:** #29ABE2, 48px height, 12px radius |
| FR-01.3 | Authentication via Internet Identity | - II modal opens in-app (not redirect)<br>- Supports Face ID, Touch ID, Windows Hello<br>- Session persists for 30 days (renewable) | **Loading State:** Spinner on #0A0E27 background<br>**Error:** "Authentication failed. Please try again." (#FF6B6B) |

---

### **FR-02: Vault Creation & Bitcoin Address Generation**
**Priority:** P0

| ID | Requirement | Acceptance Criteria | UI/UX Spec |
|----|-------------|---------------------|------------|
| FR-02.1 | User can name vault (3-32 chars) | - Real-time validation<br>- Error: "Name too short" if <3<br>- Error: "Max 32 characters" if >32<br>- Allowed: Letters, numbers, spaces, emoji | **Input Field:** 56px height, #2A2F4A bg, #FFFFFF text, 16sp<br>**Cursor:** ICP cyan (#29ABE2) 2px width<br>**Counter:** "0/32" in top-right, #8B92B0 |
| FR-02.2 | Generate Taproot (P2TR) address | - Address starts with `tb1p` (testnet) or `bc1p` (mainnet)<br>- Derivation path: `m/86'/0'/0'/0/0`<br>- Show QR code (400x400px, 20px padding) | **QR Code:** Black modules on white background<br>**Address:** Space Grotesk Mono, 14sp, #FFFFFF, break-word<br>**Copy Btn:** #F7931A background, "Copy Address" label |
| FR-02.3 | Show deposit instructions | - Copyable address<br>- "Send from Exchange" button (opens exchange deep link)<br>- "I've Deposited" button to manually check | **Instruction Text:** Inter Regular, 14sp, #B0B8D1<br>**Link Color:** #29ABE2 (underlined) |

---

### **FR-03: Guardian Invitation & Key Sharing**
**Priority:** P0

| ID | Requirement | Acceptance Criteria | UI/UX Spec |
|----|-------------|---------------------|------------|
| FR-03.1 | Add guardians via email or ICP principal | - Validate email format<br>- ICP principal must be 63 chars, start with 2vxsx...<br>- Max 5 guardians, min 3 | **Input Mode Toggle:** Segmented control ("Email" | "Principal")<br>**Tag System:** Added guardians show as removable tags (#29ABE2 bg, #FFFFFF text) |
| FR-03.2 | Send encrypted key share to each guardian | - Guardian receives email with unique link<br>- Link contains encrypted blob (base64)<br>- Blob decryptable only with guardian's II | **Email Template:** "You've been chosen as a guardian..."<br>**CTA:** "Accept Guardian Role" button (#29ABE2) |
| FR-03.3 | Guardian accepts via PWA | - Opens guardian view (no install needed)<br>- Authenticates with II<br>- Shows vault name, owner alias, inheritance weight | **Guardian UI:** Minimalist, only "Accept" or "Decline"<br>**Trust Score:** Show "2 of 3 required" visualization with progress bars |

---

### **FR-04: Proof-of-Life Heartbeat System**
**Priority:** P0

| ID | Requirement | Acceptance Criteria | UI/UX Spec |
|----|-------------|---------------------|------------|
| FR-04.1 | Owner can send heartbeat signal | - Button: "I'm Alive" (pulses every 5s if inactive)<br>- Auto-heartbeat when opening app (if <30 days)<br>- Timestamp stored on-chain | **Heartbeat Btn:** #00C896, 64px diameter, heart icon ❤️<br>**Last Beat:** "Last check-in: 2 days ago" (#8B92B0, 12sp)<br>**Next Due:** "Next required: in 28 days" (#F7931A if <7 days) |
| FR-04.2 | Visual countdown timer | - Circular progress ring (SVG)<br>- 30-day cycle, resets on heartbeat<br>- Color transitions: Green → Yellow (#F7931A) → Red (#FF6B6B) | **Ring:** 120px diameter, 8px stroke<br>**Green:** #00C896 (>14 days)<br>**Yellow:** #F7931A (7-14 days)<br>**Red:** #FF6B6B (<7 days, pulsing animation) |
| FR-04.3 | Missed heartbeat alerts | - Push notification at day 28, 29, 30<br>- Email reminder if no response<br>- Final alert: "Vault will activate inheritance in 24h" | **Push Icon:** Logo shield with red dot<br>**Copy:** "Your ThresholdVault needs you!"<br>**Action:** "Open App" button |

---

### **FR-05: Inheritance Activation & Guardian Recovery**
**Priority:** P0

| ID | Requirement | Acceptance Criteria | UI/UX Spec |
|----|-------------|---------------------|------------|
| FR-05.1 | Inheritance triggers after 3 missed heartbeats | - Automatic, no manual initiation<br>- Canister timer executes `check_inheritance_status()`<br>- Status changes: ACTIVE → INHERITANCE_PENDING | **Status Badge:** Top-right of vault card<br>**ACTIVE:** Green dot + "Secure" (#00C896)<br>**PENDING:** Red dot + "Inheritance Active" (#FF6B6B) |
| FR-05.2 | Guardians submit encrypted shares | - Guardian receives push: "Vault needs your key share"<br>- Opens app, taps "Submit Share"<br>- II authentication decrypts share automatically | **Guardian View:** "Vault: Kids Fund" header<br>**Progress:** "1 of 3 shares submitted" (progress bar)<br>**CTA:** "Submit My Share" (#29ABE2) |
| FR-05.3 | Show inheritance TX before broadcast | - PSBT preview: inputs, outputs, fee<br>- Heir address displayed with identicon<br>- 24-hour timelock countdown visible | **TX Preview:** Monospace font, #FFFFFF on #1A1F3A bg<br>**Fee:** "Network fee: 0.0001 BTC" (#8B92B0)<br>**Countdown:** "Broadcasting in: 23:59:59" (red, monospaced) |

---

### **FR-06: Multi-Device Sync & PWA Lifecycle**
**Priority:** P1 (High)

| ID | Requirement | Acceptance Criteria | UI/UX Spec |
|----|-------------|---------------------|------------|
| FR-06.1 | PWA works offline for read-only | - Cache vault balance, guardian list<br>- Show "Offline Mode" banner<br>- Block write operations until online | **Banner:** #F7931A bg, #0A0E27 text, 40px height<br>**Icons:** Greyed out when offline |
| FR-06.2 | Sync across devices | - Real-time sync via canister queries<br>- Session persistence across mobile/desktop<br>- QR code login for desktop (scan with mobile) | **Desktop Login:** Show QR code (400x400px)<br>**Mobile:** "Scan to login" modal, camera viewfinder |
| FR-06.3 | Handle PWA updates gracefully | - Service worker detects new version<br>- Show "Update Available" toast<br>- Force refresh on critical updates | **Toast:** Bottom-fixed, #29ABE2 bg, "Update" button (white) |

---

## **6. Non-Functional Requirements (NFR)**

### **NFR-01: Performance & Speed**
| ID | Requirement | Metric | Method |
|----|-------------|--------|--------|
| NFR-01.1 | PWA load time | ≤2s on 3G | App shell architecture, code splitting |
| NFR-01.2 | Canister query response | ≤500ms (p95) | Aggressive caching, query vs update calls |
| NFR-01.3 | Bitcoin TX detection | ≤5 min after 1 confirmation | Poll every 30s, WebSocket for real-time (future) |
| NFR-01.4 | Guardian share submission | ≤3s end-to-end | vetKeys pre-computation, parallel calls |

---

### **NFR-02: Security & Cryptography**
| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR-02.1 | tECDSA key shares never reconstructed | Key generation via `tECDSA` API, signing via `sign_with_ecdsa` |
| NFR-02.2 | Guardian shares encrypted at rest | vetKeys derived from guardian principal, AES-256-GCM encryption |
| NFR-02.3 | Canister controller blackholed | After setup, set controller to `aaaaa-aa` (management canister) |
| NFR-02.4 | Heartbeats signed by owner principal | II session key signs timestamp, verified on-chain |
| NFR-02.5 | All transactions tamper-evident | Use ICP's certified variables, display certificate hash in advanced settings |

---

### **NFR-03: UI/UX & Design System**
**Priority:** P0 (Critical for adoption)

#### **Color Palette (Based on Logo)**

| Color Name | Hex | Usage | Accessibility |
|------------|-----|-------|---------------|
| **Deep Navy** | `#0A0E27` | Primary background, navbar | WCAG AAA (21:1 vs white) |
| **ICP Cyan** | `#29ABE2` | Primary actions, CTAs, links | WCAG AA (4.8:1) |
| **Bitcoin Gold** | `#F7931A` | Bitcoin-specific elements, alerts | WCAG AA (4.5:1) |
| **Success Green** | `#00C896` | Heartbeat active, success states | WCAG AA (4.7:1) |
| **Warning Amber** | `#F7931A` | <14 days to heartbeat due | WCAG AA (4.5:1) |
| **Error Red** | `#FF6B6B` | Critical alerts, inheritance active | WCAG AA (4.6:1) |
| **Text Primary** | `#FFFFFF` | Main content | WCAG AAA (21:1) |
| **Text Secondary** | `#B0B8D1` | Subtitles, metadata | WCAG AA (4.8:1) |
| **Text Disabled** | `#8B92B0` | Inactive states | WCAG AA (4.5:1) |
| **Card Background** | `#1A1F3A` | Vault cards, modals | WCAG AAA (18:1) |
| **Border Subtle** | `#2A2F4A` | Dividers, input borders | WCAG AA (5.2:1) |

#### **Typography Scale**

| Element | Mobile (320px) | Tablet (768px) | Desktop (1440px) | Font Family | Line Height | Letter Spacing |
|---------|----------------|----------------|------------------|-------------|-------------|----------------|
| **H1 (Vault Name)** | 28sp / 32px | 32sp / 36px | 40sp / 44px | Space Grotesk Bold | 1.2 | -0.5px |
| **H2 (Section)** | 22sp / 26px | 24sp / 28px | 28sp / 32px | Space Grotesk Bold | 1.3 | -0.25px |
| **H3 (Card Title)** | 18sp / 22px | 20sp / 24px | 22sp / 26px | Space Grotesk Medium | 1.4 | 0px |
| **Body** | 16sp / 20px | 16sp / 20px | 18sp / 22px | Inter Regular | 1.5 | 0px |
| **Caption** | 12sp / 16px | 12sp / 16px | 14sp / 18px | Inter Regular | 1.4 | 0.25px |
| **Button** | 16sp / 20px | 16sp / 20px | 16sp / 20px | Inter SemiBold | 1.2 | 0.5px |
| **Mono (Address)** | 14sp / 18px | 14sp / 18px | 14sp / 18px | JetBrains Mono | 1.4 | 0px |

**Font Loading:** Use `font-display: swap;` with fallback to system fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`).

#### **Spacing System (8px Grid)**

| Size | PX | Usage |
|------|----|-------|
| **xs** | 4px | Icon padding |
| **sm** | 8px | Tight spacing, tag gap |
| **md** | 16px | Card padding, button vertical |
| **lg** | 24px | Section gap |
| **xl** | 32px | Page margin (mobile) |
| **2xl** | 48px | Page margin (desktop) |
| **3xl** | 64px | Hero spacing |

---

### **NFR-04: Mobile PWA Specifications**
| ID | Requirement | Specification |
|----|-------------|---------------|
| NFR-04.1 | App icon | 512x512px PNG, masked for iOS, transparent for Android |
| NFR-04.2 | Splash screen | 2732x2732px PNG, centered logo (120px), #0A0E27 bg |
| NFR-04.3 | Status bar | iOS: `black-translucent`, Android: `theme-color:#0A0E27` |
| NFR-04.4 | Install prompt | Show after 30s of engagement, max 1x per user |
| NFR-04.5 | Offline mode | Cache: vault name, balance, guardians, TX history (last 10) |
| NFR-04.6 | Touch targets | Minimum 48x48px, 8px spacing between targets (WCAG) |
| NFR-04.7 | Gestures | Pull-to-refresh on balance, swipe-left on TX for details |
| NFR-04.8 | Push notifications | Request permission after vault creation, not before |

---

### **NFR-05: Desktop Web Scaling**
| ID | Requirement | Specification |
|----|-------------|---------------|
| NFR-05.1 | Responsive breakpoints | 320px, 768px, 1024px, 1440px, 1920px |
| NFR-05.2 | Layout grid | 12-col, 24px gutter, max-width 1440px |
| NFR-05.3 | Font scaling | Use `clamp(1rem, 1vw + 0.5rem, 2.5rem)` for H1 |
| NFR-05.4 | Hover states | CTA buttons: #29ABE2 → #1E8FBD (darken 15%)<br>Cards: #1A1F3A → #2A2F4A (lighten 10%) |
| NFR-05.5 | Keyboard nav | `Tab` order: logical flow, `Enter` activates, `Escape` closes modals |
| NFR-05.6 | Mouse interactions | Right-click on address → "Copy" context menu<br>Hover on TX → show full details tooltip |
| NFR-05.7 | Multi-monitor | Support 4K (scale 1.5x), ultrawide (21:9) |

---

### **NFR-06: Accessibility (WCAG 2.1 AA)**
| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR-06.1 | Screen reader | All buttons have `aria-label`, images have `alt`, live regions for status updates |
| NFR-06.2 | Color contrast | All text meets 4.5:1 minimum (tested with Stark plugin) |
| NFR-06.3 | Focus indicators | 2px solid #F7931A outline on focus, never use `outline:none` |
| NFR-06.4 | Motion | Respect `prefers-reduced-motion`, disable animations if set |
| NFR-06.5 | Font scaling | Support 200% zoom without horizontal scroll |
| NFR-06.6 | Voice control | All interactive elements have visible labels for voice commands |

---

### **NFR-07: Data Privacy & Compliance**
| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR-07.1 | Zero-knowledge design | No personal data stored (names are local, emails hashed) |
| NFR-07.2 | GDPR compliance | User can export all data (JSON), delete vault (burns canister) |
| NFR-07.3 | No tracking | No Google Analytics; use privacy-preserving canister metrics only |
| NFR-07.4 | Guardian privacy | Guardians see only vault alias, never owner identity |

---

## **7. UI Component Specifications**

### **7.1 Vault Card Component** (Home Screen)
```
┌─────────────────────────────────────────────────────┐
│  [Shield Icon]  Kids Fund                          │
│  Status: Secure (green dot)                        │
│                                                      │
│  Balance: 0.125 BTC ($5,234.56)                    │
│  Heartbeat: 23 days ago (yellow ring)              │
│                                                      │
│  [View Details] [Send Heartbeat]                   │
└─────────────────────────────────────────────────────┘

Specs:
- Width: 100% (mobile), 360px (desktop, grid item)
- Height: 180px
- Background: #1A1F3A
- Border: 1px solid #2A2F4A, 12px radius
- Shadow: 0px 8px 32px rgba(0,0,0,0.3)
- Padding: 24px (mobile), 32px (desktop)
- Interactions: Tap → slide transition to detail view
```

### **7.2 Heartbeat Ring Component**
```typescript
// SVG Spec
<svg width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="54" stroke="#2A2F4A" stroke-width="8" fill="none"/>
  <circle 
    cx="60" cy="60" r="54" 
    stroke={color} 
    stroke-width="8" 
    fill="none"
    stroke-dasharray={dashArray} // Based on days remaining
    stroke-linecap="round"
    transform="rotate(-90 60 60)"
  />
  <text x="60" y="65" text-anchor="middle" fill="#FFFFFF" font-size="18" font-weight="bold">23d</text>
</svg>

Color Logic:
> 14 days: #00C896
7-14 days: #F7931A (pulse animation 2s ease-in-out)
< 7 days: #FF6B6B (rapid pulse 0.8s)
```

---

## **8. Technical Architecture (No-Code)**

### **8.1 Canister Modules**

```
┌─────────────────────────────────────────────────────────────┐
│                     THRESHOLDVAULT CANISTER                 │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │  VaultMgr    │─────▶│  GuardianMgr │─────▶│  Bitcoin │ │
│  │  (Motoko)    │      │  (Rust)      │      │  Wallet  │ │
│  └──────────────┘      └──────────────┘      │ (tECDSA) │ │
│         │                       │              └──────────┘ │
│         │                       │              ┌──────────┐ │
│         ▼                       ▼              │  Timer   │ │
│  ┌──────────────┐      ┌──────────┐           │  Engine  │ │
│  │  Heartbeat   │─────▶│  vetKeys │           └──────────┘ │
│  │  Tracker     │      │  Encrypt │                           │
│  └──────────────┘      └──────────┘                           │
└─────────────────────────────────────────────────────────────┘

Data Flow:
1. VaultMgr: CRUD vaults, owner authentication, heir registration
2. GuardianMgr: Invite flow, share encryption, recovery protocol
3. Bitcoin Wallet: tECDSA keygen, PSBT assembly, TX broadcast
4. Timer Engine: Global timer, heartbeat checks, inheritance trigger
5. vetKeys: Identity-based encryption for guardian shares
```

### **8.2 PWA Tech Stack**

```yaml
Frontend:
  Framework: React 18 (Next.js 14 App Router)
  Styling: Tailwind CSS 3.4 + custom CSS variables for colors
  State: Zustand (lightweight) + SWR for canister queries
  PWA: next-pwa, workbox service worker
  Icons: react-icons (Fi* family for consistency)
  QR: qrcode.react with SVG rendering
  Forms: react-hook-form + zod validation
  Animations: Framer Motion (reduced motion respected)

Backend (ICP):
  Language: Motoko (vault logic) + Rust (cryptographic heavy lifting)
  CDK: ic-cdk v0.13, ic-Principal management
  Bitcoin: ic-btc-interface v0.1
  vetKeys: ic-vetkd-utils v0.5
  Timers: ic0.global_timer_set(interval_ns)

Deployment:
  PWA: Vercel (edge caching), custom domain thresholdvault.xyz
  Canisters: dfx deploy to ICP mainnet (13-node subnet)
  CI/CD: GitHub Actions, automated tests on testnet
```

---

## **9. Security & Risk Management**

### **9.1 Pre-Launch Checklist**
- [ ] Canister controller blackholed post-setup
- [ ] tECDSA key generation audited (formal verification)
- [ ] Guardian share encryption uses fresh vetKey per vault
- [ ] Timer logic cannot be paused by owner after activation
- [ ] Emergency override requires 2-of-3 guardians + owner proof-of-life
- [ ] All update calls rate-limited (10 calls/min per principal)
- [ ] Canister cycles auto-top-up via cycles wallet

### **9.2 Incident Response**
| Scenario | Detection | Response Time | User Notification |
|----------|-----------|---------------|-------------------|
| **Subnet outage** | Canister stops responding | 1 hour | Push: "Vault is safe, inheritance paused" |
| **Guardian compromised** | Unusual share submission | Real-time | Email to owner: "Guardian X submitted share" |
| **Owner reappears during inheritance** | Heartbeat received in PENDING state | 30s | Cancel inheritance, emit OwnerReturned event |

---

## **10. Success Metrics & KPIs**

### **10.1 Hackathon Demo Goals**
- **Setup Time:** <5 minutes (stopwatch test)
- **Success Rate:** 100% of judges can create vault + deposit testnet BTC
- **UX Score:** SUS (System Usability Scale) ≥85/100
- **Technical Wow:** Execute inheritance TX in <2 min after trigger

### **10.2 Post-Hackathon Growth Metrics**
| Metric | Month 1 | Month 6 | Method |
|--------|---------|---------|--------|
| Vaults Created | 500 | 10,000 | Canister counter |
| BTC Locked (Testnet) | 50 BTC | 1,000 BTC | `bitcoin_get_utxos` sum |
| Guardian Acceptance Rate | 70% | 85% | Invitation tracking |
| Inheritance Triggers | 0 | 5 | Timer events |
| NPS Score | 50 | 70 | In-app survey |
| PWA Install Rate | 40% | 60% | `beforeinstallprompt` analytics |

---

## **11. Go-to-Market Strategy**

### **11.1 Hackathon Pitch**
- **30-sec elevator:** "4M Bitcoin are lost forever because there's no way to inherit crypto without trusting someone. ThresholdVault uses ICP's superpowers to make Bitcoin immortal—automatically transferring to your heirs when you're gone, no middleman."
- **Demo flow:** Create vault → Add guardians → Simulate death (skip heartbeat) → Show inheritance TX in mempool
- **Slides:** 5 slides max, dark theme matching app UI

### **11.2 Post-Hackathon Launch**
- **Week 1:** Publish open-source GitHub, tweet thread with demo video
- **Week 2:** Guest post on ICP.blogs, Bitcoin Magazine
- **Week 3:** Partner with Bitcoin custody providers (e.g., Casa) for B2B API
- **Week 4:** Submit to ICP Grant Program for $50K funding

---

## **12. Appendices**

### **Appendix A: Logo Asset Specifications**
```
File: logo.png
Format: PNG (transparent)
Sizes: 512x512, 192x192, 144x144, 96x96, 72x72, 48x48
Colors: #0A0E27 (shield), #29ABE2 (nodes), #F7931A (₿)
Typography: Space Grotesk Bold (for wordmark)
Safe Zone: 20% padding around logo
```

### **Appendix B: Canister API Endpoints (High-Level)**
```
create_vault(name: Text) -> VaultId
add_guardian(vault_id: VaultId, email: Text) -> GuardianId
submit_heartbeat(vault_id: VaultId) -> Timestamp
get_vault_status(vault_id: VaultId) -> { status: Text, balance: Nat, heartbeat_due: Int }
execute_inheritance(vault_id: VaultId) -> TxHash
```

### **Appendix C: PWA Manifest**
```json
{
  "name": "ThresholdVault",
  "short_name": "Vault",
  "start_url": "/?utm_source=pwa",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#0A0E27",
  "background_color": "#0A0E27",
  "icons": [...],
  "categories": ["finance", "security"],
  "lang": "en-US"
}
```

---
