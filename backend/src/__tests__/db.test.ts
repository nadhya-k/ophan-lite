// initDb() test
// Mock the entire 'pg' module before importing db.ts to prevent a real PostgreSQL connection being made during tests.

jest.mock("pg", () => {
    const mockQuery = jest.fn();
    const mockPool = { query: mockQuery };
    return { Pool: jest.fn(() => mockPool) };
});

import { initDb, pool } from "../db";

describe("initDb", () => {
    beforeEach(() => {
        (pool.query as jest.Mock).mockReset();
    });

    it("runs a CREATE TABLE query on call", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({});

        await initDb();

        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it("query contains CREATE TABLE IF NOT EXISTS articles", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({});

        await initDb();

        const queryArg = (pool.query as jest.Mock).mock.calls[0][0] as string;
        expect(queryArg).toContain("CREATE TABLE IF NOT EXISTS articles");
    });

    it("query contains CREATE TABLE IF NOT EXISTS page_views", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({});

        await initDb();

        const queryArg = (pool.query as jest.Mock).mock.calls[0][0] as string;
        expect(queryArg).toContain("CREATE TABLE IF NOT EXISTS page_views");
    });

    it("throws if the database query fails", async () => {
        (pool.query as jest.Mock).mockRejectedValueOnce(new Error("DB connection failed"));

        await expect(initDb()).rejects.toThrow("DB connection failed");
    });
});