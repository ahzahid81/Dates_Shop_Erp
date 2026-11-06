# Dates Shop ERP

A complete, modern, mobile-responsive Shop ERP built with the MERN stack. It ships with a bilingual (English / বাংলা) interface, role-based access, POS sales, stock and cash tracking, profit reports, statements, invoices, quotations, audit logs and printable/PDF documents.

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, lucide-react
- **UI languages:** English and Bangla (toggle in the header)
- **Currency / timezone:** SAR (Saudi Riyal) and `Asia/Riyadh` (`+03:00`, fixed for all dates, times and reports)
- **Payment method:** Cash only

---

## Features

| Area | Details |
| --- | --- |
| Authentication | Single login for admin and employee, JWT bearer tokens, bcrypt password hashing, rate-limited login |
| Employee portal | Large **Sell** and **Debit/Expense** actions, plus own-sales invoices |
| Products | Add, edit, delete/archive products with SKU, category, unit, cost/sell price and low-stock alerts |
| Stock | Stock-in entries automatically increase product quantity and record cash movement |
| Sales / POS | Multi-item cart, custom selling price, discount, paid/due handling, automatic stock deduction, rollback on failure |
| Expenses / Debit | Record expense title, category, amount, date and employee (cash payment) |
| Invoices | Professional printable invoice with due-payment collection and PDF download |
| Quotations | Create, edit, print, download and track quotation status |
| Cash management | Real-time cash balance, manual cash in/out adjustments and transaction history |
| Summaries | Daily and monthly sales, expenses, purchases, cash and profit with charts |
| Profit reports | Product-wise and overall revenue, cost, gross/net profit and margins |
| Statements | Date-range transaction statement with employee filter and CSV export |
| Audit logs | Immutable trail of logins, sales, payments, stock, expenses, quotations, user and cash changes |
| Users | Admin-only user management (create, edit, activate/deactivate, reset password) |

### Role permissions

- **Admin** – full access to every module.
- **Employee** – dashboard, new sale, expenses and viewing invoices they created. All other pages and APIs are admin-only.

---

## Project structure

```
Dates_Shop/
├─ package.json              # workspace scripts (install, dev, build, start, seed)
├─ .env.example              # server environment template
├─ server/
│  ├─ server.js              # Express entry + static client hosting
│  ├─ seed.js                # admin/employee/sample product seeding
│  ├─ config/db.js           # Mongoose connection
│  ├─ models/                # User, Product, Sale, StockEntry, Expense, CashTransaction, Quotation, AuditLog, Counter
│  ├─ controllers/           # business logic
│  ├─ routes/                # REST endpoints
│  ├─ middleware/            # auth, validation, error handling
│  └─ utils/                 # sequence, date range, CSV, audit helpers
└─ client/
   ├─ index.html
   ├─ vite.config.js
   ├─ tailwind.config.js
   └─ src/
      ├─ App.jsx             # routes and providers
      ├─ components/         # layout, tables, modals, charts, guards
      ├─ context/            # auth and i18n contexts
      ├─ i18n/translations.js
      ├─ lib/                # axios client and formatters
      └─ pages/              # dashboard, POS, products, reports, documents…
```

---

## Prerequisites

- Node.js **18 or newer** (tested on Node 24)
- npm 9+
- MongoDB **6+** locally, or a MongoDB Atlas connection string
- A Hostinger plan that supports Node.js (Node/VPS) for production

---

## Local setup

1. **Install dependencies**

   ```bash
   npm run install:all
   ```

2. **Create the server environment file**

   ```bash
   copy server\.env.example server\.env
   ```

   (On macOS/Linux use `cp server/.env.example server/.env`.)

3. **Edit `server/.env`**

   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/dates_shop
   JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173

   ADMIN_NAME=Shop Admin
   ADMIN_EMAIL=admin@datesshop.com
   ADMIN_PASSWORD=Admin@12345

   EMPLOYEE_NAME=Shop Employee
   EMPLOYEE_EMAIL=employee@datesshop.com
   EMPLOYEE_PASSWORD=Employee@12345

   SEED_SAMPLE_EMPLOYEE=true
   SEED_SAMPLE_PRODUCTS=true
   ```

   > `CLIENT_URL` accepts a comma-separated list of allowed origins. Use your production domain when deployed.

4. **Seed the database** (idempotent — safe to re-run)

   ```bash
   npm run seed
   ```

5. **Start development**

   ```bash
   npm run dev
   ```

   - API: <http://localhost:5000> (health check at `/api/health`)
   - Web: <http://localhost:5173>

### Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@datesshop.com` | `Admin@12345` |
| Employee | `employee@datesshop.com` | `Employee@12345` |

Change these before going live (edit `server/.env` and run the seed, or update the user in the Users page).

---

## Production build

```bash
npm run build     # builds client/dist
npm start         # starts the API on PORT
```

When `client/dist` exists, Express serves the SPA and falls back to `index.html` for non-API routes, so a single Node process can host both the API and the web app.

### Verify a deployment

```bash
npm run build
npm start
```

Then check:

```bash
curl http://localhost:5000/api/health
# {"status":"ok","service":"Dates Shop ERP", ...}
```

Open the site, sign in with a seeded account, create a product/stock entry and a test sale, and confirm the dashboard, cash balance and audit log update.

---

## Environment variables

### Server (`server/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | `development` or `production` (disables verbose logging/index creation in production) |
| `PORT` | No | API port, default `5000` |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Long random secret used to sign tokens (32+ characters) |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `7d` |
| `CLIENT_URL` | No | Allowed CORS origin(s), comma-separated |
| `ADMIN_*` / `EMPLOYEE_*` | No | Seed credentials and names |
| `SEED_SAMPLE_EMPLOYEE` | No | Set `false` to skip the demo employee |
| `SEED_SAMPLE_PRODUCTS` | No | Set `false` to skip demo products/opening stock |

### Client (build-time, optional)

The client reads these `VITE_*` values at build time. Create `client/.env` or export them before `npm run build`:

| Variable | Default |
| --- | --- |
| `VITE_API_URL` | `/api` |
| `VITE_SHOP_NAME` | `Dates Shop` |
| `VITE_SHOP_LEGAL_NAME` | `Dates Shop ERP` |
| `VITE_SHOP_ADDRESS` | `King Fahd Road, Riyadh 12211, Saudi Arabia` |
| `VITE_SHOP_PHONE` | `+966 50 000 0000` |
| `VITE_SHOP_EMAIL` | `hello@datesshop.com` |
| `VITE_SHOP_WEBSITE` | `www.datesshop.com` |
| `VITE_SHOP_BIN` | `BIN 000000000-0000` |

---

## API overview

All `/api` routes except health and login require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Login, returns token and user |
| `GET` | `/api/auth/me` | Any | Current profile |
| `PUT` | `/api/auth/password` | Any | Change own password |
| `GET` | `/api/auth/users` | Admin | List users |
| `POST` | `/api/auth/users` | Admin | Create user |
| `PUT` | `/api/auth/users/:id` | Admin | Update user / activate / reset password |

### Products & stock
| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/products` | Any |
| `GET` | `/api/products/:id` | Any |
| `GET` | `/api/products/categories/meta` | Any |
| `POST` | `/api/products` | Admin |
| `PUT` | `/api/products/:id` | Admin |
| `DELETE` | `/api/products/:id` | Admin |
| `GET` | `/api/stock` | Admin |
| `POST` | `/api/stock` | Admin |

### Sales, expenses, quotations
| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/sales` | Any (employees see their own) |
| `GET` | `/api/sales/:id` | Any (employees see their own) |
| `POST` | `/api/sales` | Any |
| `POST` | `/api/sales/:id/payments` | Admin |
| `POST` | `/api/sales/:id/void` | Admin |
| `GET` / `POST` | `/api/expenses` | Any |
| `DELETE` | `/api/expenses/:id` | Admin |
| `GET` / `POST` | `/api/quotations` | Admin |
| `GET` / `PUT` / `DELETE` | `/api/quotations/:id` | Admin |

### Reports & audit
| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/summary/dashboard` | Admin |
| `GET` | `/api/summary/daily?date=YYYY-MM-DD` | Admin |
| `GET` | `/api/summary/monthly?month=YYYY-MM` | Admin |
| `GET` | `/api/summary/cash` | Admin |
| `POST` | `/api/summary/cash/adjustment` | Admin |
| `GET` | `/api/summary/profit?from=&to=` | Admin |
| `GET` | `/api/summary/statement?from=&to=&type=&employee=&format=csv` | Admin |
| `GET` | `/api/audit-logs` | Admin |
| `GET` | `/api/health` | Public |

---

## Deploying to Hostinger

Hostinger offers two supported paths: **Node.js hosting (hPanel)** or a **VPS**. Both use MongoDB Atlas for the database because managed Hostinger MySQL is not compatible with Mongoose.

### 1. Create MongoDB Atlas

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Add a database user and allow your Hostinger server IP (or `0.0.0.0/0` during setup).
3. Copy the connection string, e.g.
   `mongodb+srv://user:password@cluster.mongodb.net/dates_shop?retryWrites=true&w=majority`.

### 2. Option A — Hostinger Node.js hosting (hPanel)

1. Upload the project (Git deployment or File Manager/ZIP). Keep `server/` and `client/` folders.
2. In **hPanel → Advanced → Node.js**:
   - Set the application root to the project root (or `server/` if using a split deployment).
   - Node version: 18+.
   - Application startup file: `server/server.js`.
   - Install dependencies with the `install:all` script, or run it from the terminal.
3. Add environment variables in hPanel or create `server/.env` with production values:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGO_URI=...
   JWT_SECRET=<long-random-secret>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://your-domain.com
   ```
4. Build the frontend and seed the database:
   ```bash
   npm run install:all
   npm run build
   npm run seed
   ```
5. Start the app and confirm `/api/health` and the login page load over HTTPS.

> Hostinger's Node.js environment may assign a different internal port. Use the `PORT` value shown in hPanel and keep the app listening on `process.env.PORT` (already implemented).

### 3. Option B — VPS (Ubuntu/Debian)

```bash
# 1. Install Node 20 and MongoDB tools (or use Atlas)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# 2. Clone and install
cd /var/www
git clone <your-repo-url> dates-shop
cd dates-shop
npm run install:all

# 3. Configure production env
cp server/.env.example server/.env
nano server/.env   # set MONGO_URI, JWT_SECRET, CLIENT_URL, NODE_ENV=production

# 4. Build and seed
npm run build
npm run seed
```

Install PM2 and start the API (Express also serves `client/dist`):

```bash
sudo npm i -g pm2
cd /var/www/dates-shop
pm2 start server/server.js --name dates-shop
pm2 save
pm2 startup
```

Reverse proxy with Nginx (`/etc/nginx/sites-available/dates-shop`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dates-shop /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 4. Split deployment (static client + API)

If the client is hosted on a static host/CDN and the API elsewhere:

1. Set `VITE_API_URL=https://api.your-domain.com/api` in `client/.env` and rebuild.
2. Upload `client/dist` to the static host.
3. Set `CLIENT_URL=https://your-domain.com` on the API server.
4. Enable HTTPS on both; the browser will block mixed content otherwise.

---

## Operational notes

- **Backups:** Schedule MongoDB Atlas snapshots or `mongodump` for self-hosted MongoDB.
- **Secrets:** Never commit `server/.env`; it is already in `.gitignore`. Rotate `JWT_SECRET` if leaked (all sessions are invalidated).
- **Demo data:** `SEED_SAMPLE_PRODUCTS=false` and `SEED_SAMPLE_EMPLOYEE=false` skip demo data for a clean production start.
- **Dates:** Sales, expenses, stock entries and all reports always use Saudi time (`Asia/Riyadh`, `+03:00`). The timezone is fixed in code and is not configurable.
- **Voiding a sale:** Stock is restored and any collected cash is recorded as a refund. Voided sales are excluded from reports.
- **Deleting products:** Products referenced by sales are archived instead of deleted so history stays intact.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `MONGO_URI is not configured` | Create `server/.env` from the example and set `MONGO_URI` |
| CORS error in the browser | Add the exact frontend origin to `CLIENT_URL` (no trailing slash) |
| Blank page after deployment | Run `npm run build` so `client/dist` exists, then restart the server |
| Login returns 429 | Wait 15 minutes or raise the limiter in `server/routes/auth.js` |
| Dates show an unexpected day | All dates are fixed to Saudi time (`Asia/Riyadh`, `+03:00`) |
| PDF download not working | Ensure the site is served over HTTPS; html2pdf runs in the browser |

---

## Scripts

| Command | Action |
| --- | --- |
| `npm run install:all` | Install root, server and client dependencies |
| `npm run dev` | Run API (`nodemon`) and Vite dev server together |
| `npm run build` | Build the React client into `client/dist` |
| `npm start` | Start the Express server (serves `client/dist` if built) |
| `npm run seed` | Create admin/employee users and optional sample products |
