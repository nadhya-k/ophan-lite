// search.ts file connects to Elasticsearch instance running in Docker.
// search.ts also creates a search index, adds articles to this index once created, and runs full-text search queries.

// Step 1 - import the Class object called Client from Node.js Software Development Kit (SDK).
// The client class object communicates with Elasticsearch to send index requests and search queries, as well as receive results.

import { Client } from "@elastic/elasticsearch"; // Connect to the local Elasticsearch instance in Docker.


// Step 2 - create a  newClass object called Client that can be exported.
// `node` is the URL of the Elasticsearch instance. 
// Port 9200 is Elasticsearch's default HTTP port — the same port mapped in `docker-compose.yml`.

export const esClient = new Client({ node: "http://localhost:9200" });


// Step 3 - // Stores the index name as a constant. An index in Elasticsearch is roughly equivalent to a table in PostgreSQL — it holds a collection of documents of the same type. 
const INDEX = "articles"; 


// Step 4 - create an asynchronous function to set up Elasticsearch index on server start-up that can be exported.

export async function initSearch() {
    const exists = await esClient.indices.exists({ index: INDEX}); // First check whether the `articles` index already exists because creating an existing index will generate an error. Returns boolean true or false.
    if (!exists) {
        await esClient.indices.create({
            index: INDEX,
            mappings: { // A mapping defines the schema of documents in this index, equivalent to a CREATE TABLE defining columns in SQL. Explicit mappings improve search performance and increase control.
                properties: {
                    title: { type: "text" }, // this field is tokenised in search index for full-text search.
                    section: { type: "keyword" }, // this field is stores this category of data in search index exactly as-is, so is used for exact match filtering and is not tokenised.
                    url: { type: "keyword" },
                    published_at: { type: "date" }, // this field enables date range queries in search index and sorting by date values.
                    view_count: { type: "integer" }, // this field stores view count as a whole number in search index to allow for optional popularity sort.
                },
            }, // close mappings object
        }); // close await create call

        console.log("Elasticsearch index ready");
    } // close if statement block
} // close initSearch asynchronous function


// Step 5 - create an asynchronous function to add a single article into Elasticsearch index that can be exported.

export async function indexArticle(article: {
    id: number; 
    title: string; 
    section: string; 
    url: string; 
    published_at: string;
}) {
    await esClient.index({
        index: INDEX,
        id: String(article.id), // Use PostgreSQL article ID as the Elasticsearch document ID.
        // Use string to convert integer to string because Elasticsearch document IDs must be a string.

        document: { ...article, view_count: 0}, // Use spread operator to copy all fields from article object into new object.
    }); // close await index call
} // close asynchronous indexArticles function


// Step 6 - create exportable async function that can run full text search query in Elasticsearch to return matching articles.
// `query` is the search term typed by the user.
// `section?` has a question mark meaning it is optional. If provided, results are filtered to that section. If omitted, all sections are searched.
// `multi_match` can search across multiple fields but in this example only title is used.
// An article whose title contains the search term ranks higher than one where it only appears in metadata.

export async function searchArticles(query: string, section?: string) {
    const must: object[] = [
        { multi_match: { query, fields: ["title^2"] } } // ^2 is a relevance boost to match the title field to count x2 as much towards relevance score.
    ];


// Step 7 - inside searchArticles function create an optional section filter using ternary operator so that if section is provided a term filter is created, but if section is not provided then an empty array is used to mean no filter is applied.

    const filter = section ? [{ term: { section } }] : [];

    // { section } is Elasticsearch shorthad for `{ section: section }`.


// Step 8 - inside searchArticles function create a constant to execute the search.
// `bool` is Elasticsearch's compound query type that combines multiple conditions. 
// `must` contains conditions that must match (the search term). 
// `filter` contains conditions that must match but do not affect relevance scoring (the section filter).


    const result = await esClient.search({
        index: INDEX,
        query: { bool: { must, filter } },
        size: 20, // limits results to 20 articles which is important for performance.
    });

// `result.hits.hits` is Elasticsearch's array of matching documents. Each hit contains metadata (score, index, id) and `_source` which is the actual document data that was stored. 
// `.map(h => h._source)` extracts just the document data, giving us a clean array of article objects.

    return result.hits.hits.map(h => h._source);

} // close searchArticles asynchronous function