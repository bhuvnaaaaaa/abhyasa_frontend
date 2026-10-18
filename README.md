# Abhyasa (अभ्यास) — Full-Stack Digital Learning Platform

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B%20%7C%2022%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-5.3-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Cache-Redis%20%26%20Memory-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Payment Gateway](https://img.shields.io/badge/Payments-Razorpay%20UPI-0C2340?logo=razorpay&logoColor=white)](https://razorpay.com/)
[![Transactional Email](https://img.shields.io/badge/Email-Resend-000000?logo=resend&logoColor=white)](https://resend.com/)

Abhyasa is a production-grade, full-stack educational web application designed for K-12 students studying Indian school curricula (CBSE, ICSE, and State Boards). It delivers structured chapter notes, interactive learning materials, curriculum navigation, and a locked "Test Yourself" assessment engine backed by dynamic UPI subscriptions.

---

## 🏛️ System Architecture

```text
                               +-------------------------------------+
                               |         Client Application          |
                               |    React 19 SPA + Vite + Router     |
                               +------------------+------------------+
                                                  |
                                                  | HTTPS / REST
                                                  v
                               +-------------------------------------+
                               |          Express 5 Backend          |
                               |  TypeScript (tsx) / Node.js ESM     |
                               +---+--------------+--------------+---+
                                   |              |              |
         +-------------------------+              |              +--------------------------+
         |                                        |                                         |
         v                                        v                                         v
+-------------------+                   +-------------------+                    +--------------------+
|  MongoDB Cluster  |                   |   Two-Tier Cache  |                    | External Services  |
|  (Mongoose ODM)   |                   | Redis / In-Memory |                    |                    |
|                   |                   |                   |                    | * Razorpay Gateway |
| * Users & Admins  |                   | * Curriculums     |                    |   (UPI QR & Modal) |
| * Boards & Grades |                   | * Subjects/Grades |                    | * Resend Mail API  |
| * Chapters & Qs   |                   | * X-Cache Headers |                    |   (abhyasalearning)|
+-------------------+                   +-------------------+                    +--------------------+
```

---

## ✨ Key Features & Engineering Highlights

### 1. Curriculum & Content Engine
- **Hierarchical Taxonomy**: `Educational Board` &rarr; `Grade/Class (6–12)` &rarr; `Subject` &rarr; `Chapter` &rarr; `Topics / Questions`.
- **Chapter Explorer**: Markdown rendering with GFM support for textbook theory, summaries, and mathematical formulas.
- **"Test Yourself" Assessment**: Interactive practice quizzes with instant answer feedback, performance tracking, and step-by-step explanatory solutions.

### 2. Dual-Role Authentication & Anti-Bot Protection
- **Bot/Spam Prevention**: Registration requires 6-digit email OTP verification before account activation.
- **Bcrypt Password Hashing**: Zero plain-text credentials stored.
- **JWT Session Management**: Access token and refresh token rotation with HTTP-only cookies and bearer header fallbacks.
- **Rate-Limiting**: Strict endpoint throttling (`express-rate-limit`) on login, password resets, and OTP submissions to prevent brute-force attacks.

### 3. Dynamic UPI Payment & Subscription Engine
- **Dual Payment Pathways**:
  - **Dynamic UPI QR Code**: Instant single-use dynamic QR codes for scanning via Google Pay, PhonePe, Paytm, or BHIM.
  - **Razorpay Modal Checkout**: Direct card, netbanking, and wallet payments.
- **Server-Side QR Optimization**: Automatically crops and isolates the high-density 1:1 square matrix using `sharp` (427x427 px with compliant quiet zones), eliminating aspect-ratio distortion and allowing sub-second scanner detection.
- **Multi-Level Verification & Reconciliation**:
  - Live frontend polling (`/api/payment/subscription-status?qrCodeId=...`).
  - Direct Razorpay API reconciliation fallback (`fetchAllPayments` + `qrCode.fetch`).
  - Webhook listener (`/api/payment/webhook`) with HMAC SHA-256 signature validation.
- **Persistent Verification UI**: Keeps confirmation details and transaction IDs on screen with an explicit student acknowledgement flow before unmounting.

### 4. Transactional Email Infrastructure
- Powered by **Resend** using verified domain **`abhyasalearning.in`** (`Abhyasa <support@abhyasalearning.in>`).
- **Student Payment Receipts**: Detailed transaction breakdown (Plan, Amount ₹99, Reference ID, 30-day expiry date).
- **Admin Payment Alerts**: Real-time dispatch to administrator with student name, registered email, payer phone/VPA, and timestamp.
- **User Verification & Password Reset**: 10-minute expiring secure OTP notifications.

### 5. High-Performance Caching
- Middleware-driven caching for read-heavy curriculum endpoints (`/api/boards`, `/api/grades`, `/api/subjects`).
- Implemented with **Redis** (`ioredis`) with seamless, automatic fallback to an in-memory TTL store when running in standalone mode.
- Response telemetry provided via `X-Cache: HIT` and `X-Cache: MISS` HTTP headers.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 7, React Router 6, Framer Motion, FontAwesome |
| **Backend** | Express 5, Node.js (ESM), TypeScript (`tsx`) |
| **Database** | MongoDB Atlas, Mongoose 9 |
| **Caching** | Redis (`ioredis`), In-Memory LRU/TTL Cache |
| **Security & Auth** | JWT (`jsonwebtoken`), `bcryptjs`, `express-rate-limit`, `cookie-parser` |
| **Payments** | Razorpay Node SDK, Razorpay Webhooks, HMAC SHA-256 |
| **Image Processing** | `sharp` (High-density QR cropping & buffer manipulation) |
| **Email Service** | Resend SDK (Verified Domain: `abhyasalearning.in`) |
| **Testing** | Node / TypeScript Test Runner (`tsx tests/api.test.ts`) |

---

## 📂 Project Structure

```text
abhyasa/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & reconnect logic
│   ├── controllers/
│   │   ├── adminController.js    # Curriculum administration & management
│   │   ├── authController.js     # Auth, OTP generation, and verification
│   │   ├── chapterController.js  # Chapter content & question bank APIs
│   │   └── paymentController.js  # QR generation, webhooks, and activation
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & role validation (RBAC)
│   │   └── cacheMiddleware.js    # Redis / in-memory HTTP cache interceptor
│   ├── models/
│   │   ├── User.js               # Student model with subscription state
│   │   ├── adminModel.js         # Admin account schema
│   │   ├── Board.js              # Educational board schema
│   │   ├── Grade.js              # Grade / class level schema
│   │   ├── Subject.js            # Subject taxonomy schema
│   │   └── Chapter.js            # Chapter syllabus & questions schema
│   ├── routes/
│   │   ├── authRoutes.js         # Authentication & OTP route definitions
│   │   ├── adminRoutes.js        # Protected administrative routes
│   │   ├── chapterRoutes.js      # Curriculum & questions routes
│   │   └── paymentRoutes.js      # Orders, UPI QR, and subscription routes
│   └── utils/
│       └── emailService.js       # Resend transactional email templates
├── src/                          # React 19 Frontend SPA
│   ├── api/                      # Axios client instance & interceptors
│   ├── assets/                   # Global CSS, typography, and static imagery
│   ├── auth/                     # React Context for authentication state
│   ├── components/               # Modular UI components (SubscribeQR, Navbar, etc.)
│   ├── pages/                    # View controllers (Home, ChapterView, Signup, etc.)
│   └── utils/                    # Client-side session and auth utilities
├── tests/
│   └── api.test.ts               # Automated API test suite (12 suites)
├── server.ts                     # Full-stack server entry point (Express + Vite)
├── Dockerfile                    # Multi-stage production container build
├── vite.config.js                # Vite build & plugin configurations
└── package.json                  # Dependencies, scripts, and build metadata
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/abhyasa?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# Redis Cache (Optional: falls back to in-memory cache if omitted)
REDIS_URL=redis://localhost:6379

# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=Abhyasa <support@abhyasalearning.in>
ADMIN_EMAIL=bhuvanamallesh08@gmail.com

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_live_or_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_key
SUBSCRIPTION_PRICE_INR=99
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher (`v22.x` recommended)
- **npm**: `v10.x` or higher
- **MongoDB**: A running MongoDB instance or MongoDB Atlas URI

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/abhyasa.git
   cd abhyasa
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Launch development server**:
   ```bash
   npm run dev
   ```
   The application will start on **`http://localhost:3000`** with Express handling API routes and mounting Vite middleware for instant HMR.

---

## 🧪 Testing & Quality Assurance

The codebase includes an automated end-to-end integration test runner validating curriculum routes, Redis caching headers, authentication barriers, and payment protection.

To run the automated test suite:
```bash
# Run tests against local server
npm test
```

### Coverage Scope:
- **Curriculum API**: Board, grade, and subject retrieval.
- **Cache Engine**: Validates cache misses on first fetch and `X-Cache: HIT` on subsequent calls.
- **Authentication**: Validates 400 Bad Request on empty payloads, input normalization, and unverified account blocks.
- **Spam Control**: Validates contact form email validation and field constraints.
- **Payment Security**: Confirms 401 Unauthorized protection on unauthenticated order creation.
- **Static Asset Delivery**: Confirms SPA entry point serving.

---

## 🐳 Docker Deployment

The application utilizes a production-grade multi-stage Docker build separating frontend asset compilation from runtime execution:

```bash
# Build the Docker image
docker build -t abhyasa:latest .

# Run the container
docker run -p 3000:3000 --env-file .env abhyasa:latest
```

### Build Pipeline:
1. **`builder` stage**: Installs complete dependencies and compiles the React frontend via `npm run build` into `/dist`.
2. **`runner` stage**: Employs a slim Alpine/Debian Node image, installs strictly `--omit=dev` dependencies, copies static assets from `builder`, and runs `server.ts`.

---

## 🔒 Security & Payment Safeguards

- **No Stored Card Data**: All card and UPI transactions are tokenized and processed exclusively through Razorpay's PCI-DSS compliant infrastructure.
- **Cryptographic Signature Verification**: Razorpay checkout responses and webhooks are validated using HMAC-SHA256 signatures before activating subscriptions.
- **Payer Cross-Check**: Captured payment records log the UPI VPA and contact details directly into the audit record.
- **Double Activation Guard**: Prevents redundant charges by validating user subscription expiration timestamps prior to processing fresh payments.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
