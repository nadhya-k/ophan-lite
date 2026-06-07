// initSearch(), indexArticle(), searchArticles() tests
// Mock the Elasticsearch client before importing search.ts to prevent a real Elasticsearch connection being made during tests.

jest.mock("@elastic/elasticsearch", () => {
    const mockIndicesExists = jest.fn();
    const mockIndicesCreate = jest.fn();
    const mockIndex = jest.fn();
    const mockSearch = jest.fn();

    return {
        Client: jest.fn(() => ({
            indices: {
                exists: mockIndicesExists,
                create: mockIndicesCreate,
            },
            index: mockIndex,
            search: mockSearch,
        })),
    };
});

import { esClient, initSearch, indexArticle, searchArticles } from "../search";

// Helper to access the mock functions cleanly.

const mockExists = esClient.indices.exists as jest.Mock;
const mockCreate = esClient.indices.create as jest.Mock;
const mockIndex = esClient.index as jest.Mock;
const mockSearch = esClient.search as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
});


// ----- initSearch -----

describe("initSearch", () => {
    it("creates the index if it does not exist", async () => {
        mockExists.mockResolvedValueOnce(false);
        mockCreate.mockResolvedValueOnce({});

        await initSearch();

        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ index: "articles" })
        );
    });

    it("does not create the index if it already exists", async () => {
        mockExists.mockResolvedValueOnce(true);

        await initSearch();

        expect(mockCreate).not.toHaveBeenCalled();
    });
});


// ----- indexArticle -----

describe("indexArticle", () => {
    const sampleArticle = {
        id: 1,
        title: "Climate Change Update",
        section: "Environment",
        url: "/environment/climate-change-update",
        published_at: "2025-01-01T00:00:00Z",
    };

    it("calls esClient.index with the correct index name", async () => {
        mockIndex.mockResolvedValueOnce({});

        await indexArticle(sampleArticle);

        expect(mockIndex).toHaveBeenCalledWith(
            expect.objectContaining({ index: "articles" })
        );
    });

    it("uses the article id as a string document id", async () => {
        mockIndex.mockResolvedValueOnce({});

        await indexArticle(sampleArticle);

        expect(mockIndex).toHaveBeenCalledWith(
            expect.objectContaining({ id: "1" })
        );
    });

    it("sets view_count to 0 on a new article", async () => {
        mockIndex.mockResolvedValueOnce({});

        await indexArticle(sampleArticle);

        expect(mockIndex).toHaveBeenCalledWith(
            expect.objectContaining({
                document: expect.objectContaining({ view_count: 0 }),
            })
        );
    });
});


// ----- searchArticles -----

describe("searchArticles", () => {
    it("returns article sources from Elasticsearch hits", async () => {
        mockSearch.mockResolvedValueOnce({
            hits: {
                hits: [
                    { _source: { title: "Climate Article", section: "Environment" } },
                    { _source: { title: "Budget Article", section: "Politics" } },
                ],
            },
        });

        const results = await searchArticles("Climate");

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({ title: "Climate Article", section: "Environment" });
    });

    it("returns an empty array when there are no hits", async () => {
        mockSearch.mockResolvedValueOnce({ hits: { hits: [] } });

        const results = await searchArticles("No Match");

        expect(results).toEqual([]);
    });

    it("includes a section filter when section is provided", async () => {
        mockSearch.mockResolvedValueOnce({ hits: { hits: [] } });

        await searchArticles("Climate", "Environment");

        const callArg = mockSearch.mock.calls[0][0];
        expect(callArg.query.bool.filter).toEqual([
            { term: { section: "environment" } },
        ]);
    });

    it("uses an empty filter when no section is provided", async () => {
        mockSearch.mockResolvedValueOnce({ hits: { hits: [] } });

        await searchArticles("Climate");

        const callArg = mockSearch.mock.calls[0][0];
        expect(callArg.query.bool.filter).toEqual([]);
    });
});