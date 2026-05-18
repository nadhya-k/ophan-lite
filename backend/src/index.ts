import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import dotenv from "dotenv";
import { pool, initDb } from "./db";
import { esClient, initSearch, indexArticle, searchArticles } from "./search";

dotenv.config();

const app = express();
app.use(cors()); // Allow React frontend to call API
app.use(express.json()); //Parse JSON request bodies

// -----REST ROUTES-----

// 1 - GET /API/Articles - fetches all articles with their total view counts using a JOIN query

app.get("/api/articles", async (_req, res) => {
    const { rows } = await pool.query(`
        SELECT 
        a.id, a.title, a.section, a.url, a.published_at, 
            COUNT(pv.id)::int AS view_count
        FROM articles a
        LEFT JOIN page_views pv ON pv.article_id = a.id
        GROUP BY a.id
        ORDER BY view_count DESC
        LIMIT 50
    `);
    res.json(rows);
});

// 2 - GET /API/Analytics - returns aggregate data across all articles

app.get("/api/analytics", async(_req, res) => {
    const { rows } = await pool.query(`
        SELECT
            a.section,
            COUNT(pv.id)::int AS total_views,
            COUNT (DISTINCT pv.country) AS unique_countries
            MAX(pv.viewed_at) AS last_view
        FROM articles a
        JOIN page_views pv ON pv.article_id = a.id
        GROUP BY a.section
        ORDER BY total_views DESC
    `);
    res.json(rows);
});

// 3 - GET/API/Search - conduct full text search via Elasticsearch

app.get("/api/search", async (req, res) => {
    const { q, section } = req.query as { q: string; section?: string };
    if (!q) return res.status(400).json({ error: "query param 'q' required "});
    const results = await searchArticles(q, section);
    res.json(results);
});

// 4 - POST/API/Articles - create a new article using both PostgreSQL and Elasticsearch

app.post("/api/articles", async (req, res) => {
    const { title, section, url } = req.body;
    const { rows } = await pool.query(
        "INSERT INTO articles (title, section, url) VALUES ($1, $2, $3) RETURNING *", //parameterised query to prevent SQL injection
        [title, section, url]
    );
    await indexArticle(rows[0]); //Add Elasticsearch for search
    res.status(201).json(rows[0]);
})

// -----WEBSOCKET SERVER-----

// 1 - WebSockets push data to the browser in real time without the need for polling or user refresh.

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// 2 - Simulate live stream of page views arriving every 1-2 seconds

async function simulatePageView() {
    const { rows: articles } = await pool.query(
        "SELECT id FROM articles ORDER BY RANDOM() LIMIT 1"
    );
    if(!articles.length) return;

    const countries = ["GB", "US", "AU", "CA", "DE"];
    const referrers = ["twitter.com", "google.com", "facebook.com", "direct"];

    const { rows } = await pool.query(
        "INSERT INTO page_views (article_id, referrer, country) VALUES ($1, $2, $3) RETURNING *",
        [
            articles[0].id,
            referrers[Math.floor(Math.random() * referrers.length)],
            countries[Math.floor(Math.random() * countries.length)],
        ]
    );

// 3 - Broadcast the new view to all connected browser clients simultaneously

    const message = JSON.stringify({ type: "PAGE_VIEW", data: rows[0] });
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(message);
    });
}

// 4 - Trigger simulated view every 1.5 seconds

setInterval(simulatePageView, 1500);

// -----STARTUP-----
async function start() {
    await initDb();
    await initSearch();

    const { rows } = await pool.query("SELECT COUNT(*) FROM articles");
    if(parseInt(rows[0].count) === 0) {
        const seeds = [
            { title: "Climate summit reaches historic deal", section: "environment", url: "/environment/1" },
            { title: "Premier League: City win again",       section: "sport",        url: "/sport/1" },
            { title: "Budget 2025: what it means for you",  section: "politics",     url: "/politics/1" },
            { title: "Breakthrough in cancer research",     section: "science",      url: "/science/1" },
        ];
        for (const s of seeds) {
            const { rows: r } = await pool.query(
                "INSERT INTO articles (title, section, url) VALUES ($1,$2,$3) RETURNING *", [s.title, s.section, s.url]
            );
            await indexArticle(r[0]);
        }
        console.log("Seeded sample articles");
    }

    httpServer.listen(3001, () => console.log("API running on http://localhost:3001"));
}

start().catch(console.error);