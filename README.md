# 🟢 Green Power — Gantt Chart Editor

Next.js 14 · TypeScript · Tailwind CSS · PostgreSQL (Prisma)

All project data is stored in a PostgreSQL database. Changes save instantly and every team member sees the same live data.

---

## Setup Guide (no command line needed for deployment)

### Step 1 — GitHub

1. Go to [github.com](https://github.com) and sign up / log in.
2. Click **New repository** → name it `greenpower-gantt` → **Create repository**.
3. On the repo page click **Add file → Upload files**.
4. Drag in **all the contents** of this folder (not the folder itself — the files inside it).
5. Click **Commit changes**.

---

### Step 2 — Vercel (host the app)

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **Add New → Project** → select your `greenpower-gantt` repo → **Deploy**.
3. Vercel auto-detects Next.js — no config needed. Wait for the build to finish.

---

### Step 3 — Vercel Postgres (the database)

1. In your Vercel project, go to the **Storage** tab.
2. Click **Create Database** → choose **Postgres** → give it a name → **Create**.
3. Click **Connect to Project** and select your project.
4. Vercel automatically adds `DATABASE_URL` to your project's environment variables.
5. Go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**.

---

### Step 4 — Run the database migration

After redeploying, you need to create the tables once. The easiest way is:

1. In Vercel, go to **Storage → your DB → Query** tab.
2. Run this SQL to create the tables:

```sql
CREATE TABLE IF NOT EXISTS "Project" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "totalWeeks" INTEGER NOT NULL DEFAULT 16,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Task" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1a5c1a',
  cells BOOLEAN[] NOT NULL DEFAULT '{}',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

> **Alternatively**, if you have Node.js installed locally, clone the repo, copy `.env.example` to `.env`, fill in the `DATABASE_URL` from Vercel's Storage tab, then run:
> ```
> npm install
> npm run db:push
> ```

---

### Step 5 — Share the link

Vercel gives you a URL like `https://greenpower-gantt.vercel.app`.  
Send that to your team — everyone opens the same link, edits the same charts, and all changes save automatically to the database.

---

## Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL
npm run db:push        # create tables
npm run dev            # start at http://localhost:3000
```

## Tech stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Framework  | Next.js 14 (App Router)           |
| Language   | TypeScript                        |
| Styling    | Tailwind CSS                      |
| Database   | PostgreSQL via Vercel Postgres     |
| ORM        | Prisma                            |
| Excel      | ExcelJS                           |
| PDF        | jsPDF                             |
