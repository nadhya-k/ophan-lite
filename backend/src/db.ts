// db.ts file contains the database connection and database table setup.

// Step 1 - use import to import the class `Pool` from the `pg` package - the PostgreSQL driver for Node.js.

import { Pool } from "pg";

// Pool simultaneous manages multiple database connections efficiently, by keeping connections open and ready to lend them out to queries and be returned, which saves the need for opening and closing a new connection for every query.
// Managing multiple databse connections this way is a critical pattern in high-traffic systems where thousands of requests need to be managed simultaneously.

// Step 2 - use export to create a new Pool instance to export so that other files such as `index.ts` can import it and use it to run queries.
// using export makes the instance and query available to other files.
// using const means the pool variable has been set as a constant so that it cannot be re-assigned.

export const pool = new Pool({
    host: process.env.PG_HOST || "localhost", //hostname of PostgreSQL server.

    // process.env.PG_HOST reads environmental variable.
    // localhost is fallback set if environment variable does not exist.
    // OR || statement is useful because it works identically in both local environment and production environment.

    database: process.env.PG_DB || "ophan-lite",

    // process.env.PG_DB reads PostgreSQL username which must match `POSTGRES_USER` in `docker-compose.yml` file.
    // ophan-lite is fallback set if environment variable does not exist.
    // OR || statement is useful because it works identically in both local environment and production environment.

    user: process.env.PG_USER || "guardian",

    // process.env.PG_USER reads PostgreSQL password which must match `POSTGRES_USER` in `docker-compose.yml`.
    // guardian is fallback set if environment variable does not exist.
    // OR || statement is useful because it works identically in both local environment and production environment.

    password: process.env.PG_PASSWORD || "secret",

    // process.env.PG_PASSWORD reads PostgreSQL password which must match `POSTGRES_PASSWORD` in `docker-compose.yml`.
    // secret is fallback set if environment variable does not exist.
    // OR || statement is useful because it works identically in both local environment and production environment.

    port: 5432, // match the left side of the port mapping in `docker-compose.yml`.
    max: 10, // Set limit of the maximum simultaneous connections the pool instance can hold. Production systems set this limit to a higher value in practice.
    idleTimeoutMillis: 30000, // time that a connection sits in idle before it is released. 30000ms = 30s.

}); // Pool instance closed here.

// Step 3 - create an asynchronous function (with await calls) to initialise database and export the function.
// Create table for articles and page_views, if they don't exist yet which will run safely on every startup when server starts.

// Column names in article table are id, title, section, url, published_at.
// Column names in page_views table are id, article_id, viewed_at, referrer, country, 

// PRIMARY KEY - uniquely identifies each row and cannot be null or duplicated.
// NOT NULL - must always have a value.
// TIMESTAMPTZ - timestamp with time zone. In PostgreSQL this is stored in UTC which can be converted to any timezone. 
// INTEGER - data holds a whole number.
// REFERENCES - used to reference a foreign key constraint to ensure referential integrity.

export async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS articles ( 
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            section TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            published_at TIMESTAMPTZ DEFAULT NOW()
            );

        CREATE TABLE IF NOT EXISTS page_views (
            id SERIAL PRIMARY KEY,
            article_id INTEGER REFERENCES articles(id),
            viewed_at TIMESTAMPTZ DEFAULT NOW(),
            referrer TEXT,
            country TEXT
            );
        `);

        console.log("Database tables ready");
    }; // asynchronous database initialising function initDb closed here.