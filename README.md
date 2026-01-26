# Pitfal Solutions

Photography & Videography website for Pitfal Solutions based in Denver, CO.

**Website:** https://www.pitfal.solutions/

## Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- AWS CLI v2 (for deployment)
- Terraform CLI (for infrastructure)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy the example environment file and update values:

```bash
cp .env.example .env.local
```

For local development, the minimum required configuration:

```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-dev-secret-here
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

### 3. Start Development Server

```bash
pnpm dev
```

The site will be available at http://localhost:3000

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint issues |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm optimize:images` | Batch optimize images |

## Project Structure

```
website/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and helpers
│   └── styles/           # Global styles
├── content/              # Static content (testimonials, FAQ, blog)
├── public/               # Static assets
├── lambda/               # AWS Lambda functions
├── infrastructure/       # Terraform IaC
├── scripts/              # Build and utility scripts
└── tests/                # Test files
```

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS
- **Testing:** Vitest, Playwright
- **Backend:** AWS Lambda, API Gateway
- **Database:** DynamoDB
- **Storage:** S3 + CloudFront
- **IaC:** Terraform

## Deployment

Infrastructure is managed with Terraform. See `docs/DEPLOYMENT.md` for full deployment instructions.

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

## Documentation

- `docs/REQUIREMENTS.md` - Functional requirements
- `docs/ARCHITECTURE.md` - System design
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/PRD.md` - Product requirements
