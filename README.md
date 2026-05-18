## Section 1 - App Summary

This project is a real-time content analytics dashboard inspired by the Guardian's in-house analytics tool, Ophan. This analytics dashboard is called Ophan-lite.

Ophan-lite tracks article page views in real time, supports full-text article search, and displays aggregate traffic analytics by section.

Every 1.5 seconds the back-end simulates a live page view event and broadcasts it to all connected browsers via WebSocket, causing view counts on the dashboard to tick upward without any page refresh.

---

## Section 2 - Tech stack

Front-end 
-- React + TypeScript (Vite) for Dashboard UI and live updates
-- Chart.js + react-chartjs-2 for Bar chart visualisation

HTTP client
-- Axios for API calls from the browser

Back-end 
-- Node.js + Express + TypeScript for REST API and WebSocket server
-- PostgreSQL 16 for Relational database storing articles and page views
-- Elasticsearch 8.13  for Search engine with full-text article search enabled
-- WebSocket (ws) for real-time or live page view event stream

Containers 
-- Docker + Docker Compose for Local Elasticsearch and PostgreSQL

---

## Section 3 - Project structure

ophan-lite/
|
|---> backend/
|
|---|---> src/
|
|---|---|---> index.ts - Main Express server, REST routes, WebSocket
|---|---|---> db.ts - PostgreSQL connection pool and table setup
|---|---|---> search.ts - Elasticsearch client, indexing, search queries
|
|---|---> package.json
|
|---|---> tsconfig.json
|
|---> frontend/
|
|---|---> src/
|
|---|---|---> App.tsx - React dashboard — chart, search, live table
|---|---|---> main.tsx - React entry point
|---|---|---> App.css - Component styles (empty - inline styles used)
|---|---|---> index.css - Global CSS reset
|
|---|---> index.html
|
|---|---> package.json
|
|---> docker/
|
|---|---> docker-compose.yml - Elasticsearch and PostgreSQL containers

---

## Section 4 - Pre-requisite Installations

Required installations before running the project:

-- Node.js (20 or higher) - https://nodejs.org 
-- Docker Desktop (Latest version) -  https://docker.com 
-- Git (Latest version) - https://git-scm.com 
-- VS Code (Latest version) - https://code.visualstudio.com

### VS Code extensions (including publisher ID and extension purpose)

Install these from the VS Code Extensions panel (`Ctrl+Shift+X`). Copy and Paste the Publisher ID into the searchbar inside the VSCode extensions marketplace.

-- ESLint
Publisher ID - `dbaeumer.vscode-eslint`
Extension Purpose - TypeScript error detection


-- Prettier - Code Formatter
Publisher ID - `esbenp.prettier-vscode` 
Extension Purpose - Auto-format on save 

-- GitLens — Git Supercharged
Publisher ID -  `eamodio.gitlens` 
Extension Purpose - Git history and blame

-- Docker 
Publisher ID - `ms-azuretools.vscode-docker`
Extension Purpose - Manage containers from sidebar

-- Thunder Client
Publisher ID - `rangav.vscode-thunder-client`
Extension Purpose - Test API endpoints

---

## Section 5 - Getting started

First open a terminal to clone the repository and start the databases on Docker.
You will then need to open two additional terminals to run the frontend (Step 3) and backend (Step 4) seperately.

### Section 5 - Step 1 - Clone the repository

```bash
git clone <your-repo-url>
cd ophan-lite
```

### Section 5 - Step 2 - Start the databases

First make sure Docker Desktop is open and showing Engine running, then:

```bash
cd docker
docker compose up -d
```

Verify both containers are running:

```bash
docker compose ps
```

You should see `elasticsearch` and `postgres` both with status `running`.

### Section 5 - Step 3 - Start the back-end

Open a new terminal tab, then:

```bash
cd backend
npm install
npm run dev
```

When ready you will see:

```
Database tables ready
Elasticsearch index ready
Seeded sample articles
API running on http://localhost:3001
```

### Section 5 - Step 4 - Start the front-end

Open another new terminal tab, then:

```bash
cd frontend
npm install
npm run dev
```

When ready you will see:

```
VITE ready
→ Local: http://localhost:5173/
```

### Section 5 - Step 5 - Open the dashboard

Navigate to `http://localhost:5173` in your browser.

You should see the live dashboard with article view counts
updating every 1.5 seconds.

---

## Section 6 - Expose API endpoints and WerbSocket connection

The back-end exposes three REST endpoints for articles, analytics, and search, along with one WebSocket connection to receive live events and broadcast them every 1.5s.

### Section 6 - Step 1 - GET /api/articles

This returns all articles ordered by view count descending. Includes a real-time `view_count` from a SQL aggregate JOIN.

```bash
curl http://localhost:3001/api/articles
```

Example response:

```json
[
  {
    "id": 1,
    "title": "Climate summit reaches historic deal",
    "section": "environment",
    "url": "/environment/1",
    "view_count": 42
  }
]
```

### Section 6 - Step 2 - GET /api/analytics

Returns total views, unique countries, and last view time grouped by section. Mirrors the kind of BigQuery aggregate query the Guardian runs on Ophan data.

```bash
curl http://localhost:3001/api/analytics
```

Example response:

```json
[
  {
    "section": "sport",
    "total_views": 187,
    "unique_countries": 4,
    "last_view": "2025-05-15T20:44:00.000Z"
  }
]
```

### Section 6 - Step 3 - GET /api/search?q=\<query\>&section=\<optional\>

Full-text search powered by Elasticsearch. The `q` parameter is required. The `section` parameter is optional and filters results to a specific site section.

```bash
curl "http://localhost:3001/api/search?q=climate"
curl "http://localhost:3001/api/search?q=goal&section=sport"
```

### Section 6 - Step 4 - POST /api/articles

Creates a new article. Saves to PostgreSQL and indexes in Elasticsearch simultaneously so it is immediately searchable.

```bash
curl -X POST http://localhost:3001/api/articles \
  -H "Content-Type: application/json" \
  -d '{"title":"New article","section":"culture","url":"/culture/5"}'
```

### Section 6 - Step 5 - WebSocket ws://localhost:3001

Connect to receive live PAGE_VIEW events. A new event is broadcast every 1.5 seconds to all connected clients.

Example message received:

```json
{
  "type": "PAGE_VIEW",
  "data": {
    "id": 301,
    "article_id": 2,
    "referrer": "twitter.com",
    "country": "GB",
    "viewed_at": "2025-05-15T20:44:01.000Z"
  }
}
```

---

## Section 7 - Create Database Schema

### Section 7 - Step 1 - articles database schema

Column: id
Type: SERIAL PRIMARY KEY 
Description: Auto-incrementing unique identifier

Column: title 
Type: TEXT NOT NULL 
Description: Article headline

Column: section 
Type: TEXT NOT NULL 
Description: Site section e.g. politics, sport 

Column: url 
Type: TEXT UNIQUE NOT NULL 
Description: Article URL path 

Column: published_at 
Type: TIMESTAMPTZ  
Description: Publication timestamp, defaults to now



### Section 7 - Step 2 - page_views database schema

Column: id 
Type: SERIAL PRIMARY KEY
Description: Auto-incrementing unique identifier

Column: article_id 
Type: INTEGER 
Description: Foreign key referencing articles(id)

Column: viewed_at 
Type: TIMESTAMPTZ
Description: When the view occurred, defaults to now

Column: referrer 
Type: TEXT
Description: Traffic source e.g. google.com

Column: country 
Type: TEXT
Description: Visitor country code e.g. GB, US 

---

## Section 8 - Create Elasticsearch index

Index name: `articles`

Field: title
Type: text
Description: Tokenised for full-text search

Field: section
Type: keyword
Description: Exact-match filtering only

Field: url
Type: keyword
Description: Exact-match only

Field: published_at
Type: date
Description: Date range queries

Field: view_count
Type: integer 
Description: Sortable by popularity

---

## Section 9 - Stopping the dashboard app

Stop the front-end and back-end servers by pressing `Ctrl+C` in each terminal tab.

Stop the Docker containers:

```bash
cd docker
docker compose down
```

To stop and delete all stored data (articles, page views, search index):

```bash
docker compose down -v
```

The `-v` flag removes the named volumes. Omit it if you wantmto keep your data for next time.

---

# Recommended next steps
Additions to develop and strengthen the dashboard project:

-- Add a .env file and move all credentials out of the source code
-- Write Jest unit tests for the search and database functions
-- Add a Dockerfile for the back-end to make it fully containerised
-- Deploy the back-end to AWS EC2 or ECS and the front-end to S3
-- Add a line chart showing views over time using the viewed_at timestamps
-- Implement WebSocket reconnection logic in the front-end for resilience
