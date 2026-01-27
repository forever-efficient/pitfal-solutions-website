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

## Testing

### Unit Tests (Vitest)

Unit tests are located in `tests/` and use Vitest with React Testing Library.

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run only tests matching a pattern
pnpm test -- --grep "Button"
```

### E2E Tests (Playwright)

End-to-end tests are located in `tests/e2e/` and test full user flows across browsers.

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run all E2E tests
pnpm test:e2e

# Run E2E tests with UI mode (interactive debugging)
pnpm test:e2e:ui

# Run tests for a specific browser
pnpm exec playwright test --project=chromium

# Run a specific test file
pnpm exec playwright test tests/e2e/homepage.spec.ts

# View test report after run
pnpm exec playwright show-report
```

### Test Structure

```
tests/
├── setup.ts                    # Vitest setup and mocks
├── lib/                        # Utility function tests
├── components/                 # Component unit tests
│   ├── ui/                     # UI component tests
│   ├── forms/                  # Form component tests
│   ├── faq/                    # FAQ component tests
│   ├── icons/                  # Icon component tests
│   └── layout/                 # Layout component tests
└── e2e/                        # Playwright E2E tests
    ├── homepage.spec.ts        # Homepage tests
    ├── navigation.spec.ts      # Navigation and routing tests
    ├── contact-form.spec.ts    # Contact form validation tests
    └── pages.spec.ts           # All pages rendering tests
```

## CI/CD

The project uses GitHub Actions for continuous integration. The workflow runs on every push to `main`/`develop` and on all pull requests.

### Pipeline Steps

1. **Lint** - ESLint checks for code quality issues
2. **Type Check** - TypeScript compiler validates types
3. **Unit Tests** - Vitest runs all component and utility tests
4. **Build** - Next.js production build (only runs if all above pass)
5. **Bundle Size** - Monitors JavaScript bundle size for regressions

### Running CI Checks Locally

Before pushing, run the full CI check locally:

```bash
# Run all checks (same as CI)
pnpm lint && pnpm type-check && pnpm test && pnpm build

# Or run individually
pnpm lint           # ESLint
pnpm type-check     # TypeScript
pnpm test           # Unit tests
pnpm build          # Production build
```

### Coverage Reports

Test coverage is uploaded to Codecov on CI runs. View coverage locally:

```bash
pnpm test:coverage
# Open coverage/index.html in browser
```

## Documentation

- `docs/REQUIREMENTS.md` - Functional requirements
- `docs/ARCHITECTURE.md` - System design
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/PRD.md` - Product requirements
