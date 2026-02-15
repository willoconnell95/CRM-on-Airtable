# RelationCRM - Relationship Intelligence CRM on Airtable

A full-featured relationship intelligence CRM web application built on Airtable, replicating Affinity's core capabilities.

## Features

- **Dashboard** - Activity feed, metrics, relationship strength trends, pipeline overview
- **Contact Management** - Full CRUD, search, filtering, tags, relationship strength scoring
- **Company Management** - Company profiles, domain enrichment, associated contacts/deals
- **Interaction Tracking** - Log emails, meetings, calls, notes with sentiment tracking
- **Pipeline/Kanban Board** - Drag-and-drop deal management with weighted pipeline calculations
- **Network Visualization** - D3.js-powered interactive graph showing contact relationships
- **Smart Lists** - Dynamic filtered lists with CSV export
- **Global Search** - Fuzzy search across contacts, companies, deals, and interactions
- **Data Enrichment** - Clearbit API integration for automatic contact/company enrichment
- **Relationship Strength Algorithm** - Scores 0-100 based on recency, frequency, interaction types
- **Team Collaboration** - User roles (admin/member/viewer), activity audit trail
- **Authentication** - JWT-based auth with bcrypt password hashing

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Query, Zustand, Recharts, D3.js
- **Backend**: Node.js, Express, Airtable SDK
- **Auth**: JWT + bcrypt
- **Enrichment**: Clearbit API
- **Deployment**: Docker

## Quick Start

### 1. Prerequisites

- Node.js 18+
- An Airtable account with API access
- (Optional) Clearbit API key for enrichment

### 2. Set up Airtable

Create a new Airtable base and add the required tables. Run the setup script for the full schema reference:

```bash
npm run setup:airtable
```

Required tables: Contacts, Companies, Interactions, Deals, Lists, Relationships, Activities, Users

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Airtable API key, base ID, and JWT secret
```

### 4. Install & Run

```bash
npm run install:all
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### 5. Register

Visit http://localhost:5173 and create an account to get started.

## Project Structure

```
├── server/                  # Express backend
│   └── src/
│       ├── index.ts         # Server entry point
│       ├── routes/          # API route handlers
│       │   ├── auth.ts      # Authentication
│       │   ├── contacts.ts  # Contact CRUD
│       │   ├── companies.ts # Company CRUD
│       │   ├── deals.ts     # Deal CRUD + pipeline
│       │   ├── interactions.ts
│       │   ├── lists.ts     # Smart lists + export
│       │   ├── relationships.ts # Network + pathfinding
│       │   ├── activities.ts
│       │   ├── search.ts    # Global search
│       │   └── dashboard.ts # Dashboard aggregations
│       ├── middleware/       # Auth + error handling
│       ├── services/        # Airtable client, enrichment
│       └── utils/           # Relationship strength algorithm
├── client/                  # React frontend
│   └── src/
│       ├── components/      # UI components
│       │   ├── ui/          # Base components (Button, Card, etc.)
│       │   ├── layout/      # App shell (Sidebar, Header)
│       │   └── common/      # Shared components
│       ├── hooks/           # React Query hooks
│       ├── pages/           # Page components
│       ├── store/           # Zustand auth store
│       ├── lib/             # API client, utilities
│       └── types/           # TypeScript types
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET/POST/PATCH/DELETE | /api/contacts | Contact CRUD |
| POST | /api/contacts/bulk-import | Bulk import |
| POST | /api/contacts/:id/enrich | Enrich contact |
| GET/POST/PATCH/DELETE | /api/companies | Company CRUD |
| GET/POST/PATCH/DELETE | /api/interactions | Interaction CRUD |
| GET/POST/PATCH/DELETE | /api/deals | Deal CRUD |
| GET | /api/deals/pipeline | Pipeline view |
| GET/POST/PATCH/DELETE | /api/lists | List CRUD |
| POST | /api/lists/:id/export | Export to CSV |
| GET | /api/relationships/network | Network graph data |
| GET | /api/relationships/path/:from/:to | Find path between contacts |
| GET | /api/search?q= | Global search |
| GET | /api/dashboard | Dashboard data |
| GET | /api/activities | Activity feed |

## Docker Deployment

```bash
docker-compose up -d
```

## Relationship Strength Algorithm

Scores are calculated from 0-100 based on:
- **Interaction recency**: Exponential decay with 30-day half-life
- **Interaction types**: Meeting (10pts) > Call (7pts) > Email (4pts) > Note (2pts)
- **Sentiment**: Positive (1.3x), Neutral (1.0x), Negative (0.7x)
- **Frequency**: Logarithmic bonus for interaction count
- **Mutual connections**: Up to 15 bonus points
