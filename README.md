# 💸 Walleto - Smart Group Expense & Wallet Management Platform

Walleto is a modern, real-time expense sharing and digital wallet application designed for roommates, friends, travel groups, and teams. Built with a Node.js + Express backend (MongoDB + Socket.io) and a React frontend.

---

## 🌟 Features

- **Group Management**: Create groups, invite members with unique 6-character alphanumeric codes, and track memberships.
- **Dynamic Expense Splitting (`calculateSplit.js`)**:
  - **Equal Split**: Automatically distributes costs evenly with exact cent/penny precision.
  - **Exact Amounts**: Custom per-person allocation with strict total matching.
  - **Percentage Split**: Custom proportional split ensuring 100% total allocation.
  - **Shares Split**: Weight-based distribution (e.g. 2 shares vs 1 share).
- **Expense Approval Workflow**: Require consensus or acknowledgment from members before an expense settles.
- **Digital Wallet**:
  - Personal digital wallet with balance tracking.
  - Fund deposit simulation with instant credit.
  - In-app settlement using wallet balance between members.
- **Realtime Notifications (Socket.io)**: Instant notifications for approvals, new expenses, and settlements.
- **Debt Simplification & Settlement**: Clear matrix of "Who Owes Whom" with one-click settle-up.

---

## 📁 Project Architecture

```
split-app/
├── package.json
├── README.md
├── .gitignore
│
├── client/                           # React Frontend
│   ├── package.json
│   ├── public/
│   │   ├── favicon.ico
│   │   └── index.html
│   └── src/
│       ├── assets/                   # Images, icons, static graphics
│       ├── components/               # Reusable UI Components
│       │   ├── common/               # Buttons, Inputs, Cards, Badges, Loader, Modal
│       │   ├── layout/               # Navbar, Sidebar, Footer, PageHeader
│       │   ├── auth/                 # LoginForm, SignupForm, ProtectedRoute
│       │   ├── group/                # GroupCard, CreateGroupModal, JoinGroupModal, MemberList
│       │   ├── wallet/               # BalanceCard, AddFundsModal, TransactionList
│       │   ├── expense/              # ExpenseForm, SplitSelector, ExpenseCard
│       │   └── notifications/        # NotificationCenter, ApprovalCard
│       ├── context/                  # React Context / State Management
│       │   ├── AuthContext.jsx
│       │   ├── GroupContext.jsx
│       │   └── NotificationContext.jsx
│       ├── hooks/                    # Custom React Hooks
│       │   ├── useAuth.js
│       │   ├── useWallet.js
│       │   └── useSocket.js
│       ├── pages/                    # Main Route Views
│       │   ├── AuthPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── GroupDetailPage.jsx
│       │   ├── WalletPage.jsx
│       │   ├── ApprovalsPage.jsx
│       │   └── SettingsPage.jsx
│       ├── services/                 # API client (Axios instances & endpoints)
│       │   ├── api.js
│       │   ├── authService.js
│       │   ├── groupService.js
│       │   ├── walletService.js
│       │   ├── expenseService.js
│       │   └── notificationService.js
│       ├── utils/                    # Helper functions, formatters, constants
│       │   ├── formatters.js         # Currency, date formatting
│       │   └── validators.js
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
│
└── server/                           # Node.js + Express Backend
    ├── package.json
    ├── .env.example
    ├── server.js                     # Entry point (Express + Socket.io server setup)
    └── src/
        ├── config/                   # Configuration files
        │   ├── db.js                 # MongoDB connection logic
        │   └── constants.js          # App-wide constants & enums
        ├── controllers/              # Business logic handlers
        │   ├── authController.js
        │   ├── groupController.js
        │   ├── walletController.js
        │   ├── expenseController.js
        │   ├── approvalController.js
        │   └── webhookController.js  # Payment provider webhooks
        ├── middleware/               # Express Middlewares
        │   ├── authMiddleware.js     # JWT verification & role checks
        │   ├── errorMiddleware.js    # Global error handler
        │   ├── groupMiddleware.js   # Verify group membership authorization
        │   └── validateMiddleware.js # Input request validation
        ├── models/                   # Mongoose Schemas
        │   ├── User.js
        │   ├── Group.js
        │   ├── GroupMembership.js
        │   ├── Wallet.js
        │   ├── WalletTransaction.js
        │   ├── Expense.js
        │   ├── ExpenseApproval.js
        │   └── Settlement.js
        │   └── Notification.js
        ├── routes/                   # REST API Express Router
        │   ├── authRoutes.js
        │   ├── groupRoutes.js
        │   ├── walletRoutes.js
        │   ├── expenseRoutes.js
        │   ├── approvalRoutes.js
        │   └── webhookRoutes.js
        ├── services/                 # Auxiliary services (Socket, Payment Gateway, Mailer)
        │   ├── socketService.js
        │   └── paymentService.js
        └── utils/                    # Server utilities & helper functions
            ├── generateCode.js       # Unique invitation code generator
            └── calculateSplit.js     # Dynamic split math helper
```

---

## 🌐 Deploy Walleto

Walleto is configured to host the React website on Vercel and the Express API on Render. MongoDB must be hosted separately (for example, with MongoDB Atlas).

1. Push this project to a GitHub repository.
2. Create a MongoDB Atlas database and copy its connection string. Keep the database username and password in the URI encoded if they contain special characters.
3. Deploy the frontend on Vercel with the project root set to `client`. Vercel uses `client/vercel.json` to build the Vite site and support direct links to app pages. Copy the deployed site origin, such as `https://walleto.vercel.app`.
4. Create a Render Blueprint from the repository root. The included `render.yaml` creates the `walleto-api` service from `server/`. Set `MONGO_URI` to the Atlas connection string and `CLIENT_URLS` to the exact Vercel origin. Add additional trusted frontend origins as comma-separated origins if needed. Do not use `*`.
5. Copy the Render service origin, such as `https://walleto-api.onrender.com`, into the Vercel project's environment variables:

   ```env
   VITE_API_BASE_URL=https://walleto-api.onrender.com/api
   VITE_SOCKET_URL=https://walleto-api.onrender.com
   ```

   Redeploy the Vercel project after saving these values. If you later add a custom domain, add that exact origin to Render's `CLIENT_URLS` and redeploy the API.

The Render Blueprint generates a production `JWT_SECRET`. Razorpay remains in test mode; to enable test checkout and QR payments, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the Render service's Environment settings. Never put secret values in Vercel variables or commit them to this repository. New production accounts start with a zero wallet balance, and demo accounts are not seeded.

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)

### 2. Installation
Run from root directory:
```bash
npm run install:all
```

### 3. Environment Setup
Configure server environment variables:
```bash
cp server/.env.example server/.env
```
Ensure your `server/.env` contains:
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/split_app
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:5173
```

### 4. Running the Application
To run both backend and frontend concurrently:
```bash
npm run dev
```
- **Backend API**: `http://localhost:5001`
- **Frontend App**: `http://localhost:5173`

---

## 🧮 Dynamic Split Math Engine (`calculateSplit.js`)
Supports four distinct split strategies:
- `EQUAL`: Distributes total rounded to 2 decimal places with remainder pennies distributed sequentially.
- `EXACT`: Verifies that sum of exact member contributions strictly equals total amount.
- `PERCENTAGE`: Converts percentages to currency amounts and verifies 100% distribution.
- `SHARES`: Dynamically calculates weighted ratios per user.

---

## 🛡️ License
MIT License.
