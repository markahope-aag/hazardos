# HazardOS

**The Operating System for Environmental Remediation Companies**

Mobile-first business management platform for asbestos, mold, lead paint, and hazardous material abatement services.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/markahope-aag/hazardos.git
cd hazardos
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## 📱 Testing on Mobile

The app is built mobile-first. To test:

1. Get your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Visit `http://YOUR_IP:3000` from your phone
3. Or use ngrok: `npx ngrok http 3000`

## 🗄️ Database Setup

See `docs/database-setup.md` for Supabase schema setup instructions.

## 📚 Documentation

- [Product Requirements Document](./docs/HazardOS-PRD.md)
- [Project Overview](./docs/HazardOS-Project-Overview.md)
- [API Documentation](./docs/api.md) (TODO)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **PWA**: next-pwa

## 📦 Project Structure

```
hazardos/
├── app/              # Next.js App Router
├── components/       # React components
├── lib/              # Utilities, hooks, Supabase clients
├── types/            # TypeScript types
├── public/           # Static assets
└── docs/             # Documentation
```

## 🚢 Deployment

Push to main branch to trigger Vercel deployment:

```bash
git push origin main
```

Production: https://hazardos.app

## 📄 License

Proprietary - Asymmetric Marketing LLC