# Afya Links — Multi-Pharmacy Wholesale Ordering Platform

A multi-pharmacy wholesale ordering platform built for seamless integration between frontend user experience and backend automation.

## Tech Stack
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: Supabase PostgreSQL with RLS
- WhatsApp: Baileys (@whiskeysockets/baileys)
- Payments: PesaPal API 3.0
- Monorepo: pnpm workspaces + Turborepo

## Project Structure
- `apps/frontend`: Next.js web application
- `apps/backend`: Express.js backend API
- `packages/*`: Shared utilities, types, UI components

## Setup Instructions
1. **Prerequisites**: Node.js >=20.0.0, pnpm >=9.4.0
2. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd afya-links
   ```
3. **Install Dependencies**:
   ```bash
   pnpm install
   ```
4. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in the required values.
5. **Database Migrations**:
   Run Supabase migrations (if applicable).
6. **Run Development Server**:
   ```bash
   pnpm dev
   ```

## Architecture Diagram
```
Vercel (Frontend)
       |
       v
Railway (Backend) ---> Baileys (WhatsApp)
       |          ---> PesaPal (Payments)
       v
  Supabase
```
