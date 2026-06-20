# ODFE Backend

Production-ready REST API for the ODFE Cafe POS platform.

## Tech Stack

- Node.js + Express.js
- TypeScript
- Prisma ORM
- Supabase PostgreSQL
- JWT Authentication
- Zod Validation

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:studio` | Open Prisma Studio |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login to the system |
| GET | `/health` | Health check |

## Architecture

```
Routes → Controllers → Services → Repositories → Prisma
```

- **Routes**: Define API endpoints and apply middleware
- **Controllers**: Handle HTTP requests, validate input, return responses
- **Services**: Business logic layer
- **Repositories**: Database access layer (only layer that uses Prisma)
