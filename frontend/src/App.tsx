// Step 1 - Imports
// import useEffect, useState, and useRef hooks from react.
// `useEffect` - runs code when page loads.
// `useState` - stores data that can change.
// `useRef` - holds a value that persists without triggering re-renders.

import { useEffect, useState, useRef } from "react";

// import bar chart component.
// `react-chartjs-2` is a React wrapper around Chart.js.

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, 
  CategoryScale, // handles text labels on the axis
  LinearScale, // handles number values
  BarElement, // draws the bars
  Title, // add the chart title
  Tooltip // add hover popups
} from "chart.js";

import axios from "axios";

// import Axios, an HTTP client for calling the back-end API.
// Axios is cleaner than the browser's built-in fetch because it automatically parses JSON and has better error handling.


// Step 2 - Chart.js registration

// Register all chart components to be used that have been imported in Step 1.
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip);


// Step 3 - Define TypeScript interfaces

// interface defines the exact shape of the data object which TypeScript can use to catch mistakes before code runs.
// define the interface for article when it arrives from the API, with every field mapping to column in PostgreSQL articles table.

interface Article {
  id: number; // unique database number
  title: string; // headline of article
  section: string; // category of article
  url: string; // address of article
  view_count: number; // total from SQL count query
}

// define interface for WebSocket message

interface LiveEvent {
  type: "PAGE_VIEW";
  data: { 
    article_id: number; // identify which article was viewed
    country: string; // identify visitor country
    referrer: string; // identify visitor referrer
  }; 
}


// Step 4 - create API as constant to store backend API base.

const API = "http://localhost:3001/api";


// Step 5 - Declare main React component.

export default function App() {

  const [articles, setArticles] = useState<Article[]>([]);

  // Stores the full list of articles from the API. 
  // Starts as an empty array because no data has loaded yet. 
  // `Article[]` tells TypeScript this will always be an array of Article objects.

  const [searchQuery, setSearch] = useState("");

  // Stores whatever the user has typed in the search box. 
  // Starts as an empty string.

  const [searchResults, setResults] = useState<Article[]>([]);

  // Stores articles returned by a search. Starts empty and fills when the user performs a search.

  const [liveCount, setLiveCount] = useState(0);

  // Counts live WebSocket events since page load. Starts at 0 and goes up by 1 each time a PAGE_VIEW arrives.

  const wsRef = useRef<WebSocket | null>(null);

  // Holds the WebSocket connection. 
  // Unlike useState, updating a ref does not cause a re-render - only store connection to keep it open and close it later. 
  // `WebSocket | null` means it holds either a WebSocket object or nothing. 
  // Starts as null before connecting.



// Step 6 - create function to run code after component appears on screen.

// The empty array `[]` at the end means run this only once when the page first loads.
  useEffect(() => {

    axios
    .get<Article[]>(`${API}/articles`) // fetch article list from back-end API 
    .then(r => setArticles(r.data)); 
    
    // `r.data` contains the array that response arrives in
    // `setArticles` stores it in state, triggering a re-render to display the articles 

    // Open a WebSocket connection to the backend.
    // WebSocket stays open to allow server to push live page count data to browser without need for user refresh.
    wsRef.current = new WebSocket("ws://localhost:3001");

    
    wsRef.current.onmessage = (event) => { // create event handler for incoming messages.
      const msg: LiveEvent = JSON.parse(event.data); // `JSON.parse` converts the raw string into a JavaScript object.

      // if statement checks to confirm it is a PAGE_VIEW event before acting.
      if (msg.type === "PAGE_VIEW") {

      
        setArticles(prev => // create setArticles function to update the view count for the article that has just been viewed
          prev.map(a => // `prev.map()` loops through every article

            a.id === msg.data.article_id // if the article id matches

            // creates new object using the spread operator `...a` to increment `view_count` by 1 without changing the other fields. 
              ? { ...a, view_count: a.view_count + 1 } 
            
            // articles that do not match are returned unchanged.
              : a
          )
        ); // close setArticles function

        setLiveCount(c => c + 1); // create function to increment live event counter by 1.
      }
    };

    return () => wsRef.current?.close();  // React calls cleanup function upon page close.
  }, []);


// Step 7 - Run a full-text search against Elasticsearch via the back-end API

  async function handleSearch() { // create an asynchronous function to handle searches when user clicks search

    if (!searchQuery.trim()) return;

    const { data } = await axios.get(
      `${API}/search?q=${encodeURIComponent(searchQuery)}` // `encodeURIComponent` converts special characters to URL-safe format
    );
    setResults(data); // results are stored in state, triggering a re-render to display them.
  
  } // close handleSearch asynchronous function


// Step 8 - Prepare data structure needed by Chart.js to create bar charts on dashboard

  const chartData = {
    labels: // `labels` are the text labels on the axis

    // `slice(0, 10)` takes only the top 10 articles.
    // `slice(0, 30)` cuts titles to 30 characters and adds an ellipsis.
    articles.slice(0, 10).map(a => a.title.slice(0, 30) + "…"),

    datasets: [{
      label: "Page views",
      data: // `data` is the matching array of view counts.
      articles.slice(0, 10).map(a => a.view_count), // articles on x-axis, mapping onto view counts on y-axis
      
      // `backgroundColor` sets the Guardian teal colour for the bars.
      backgroundColor: "#5DCAA5",
    }],
  };


// Step 9 - Create JSX return
// JSX is the HTML-like syntax React uses to describe what appears on screen. 
// Use `className` not `class`.
// Use `style={{ }}` with camelCase properties.
// Wrap JavaScript values in `{ }` curly braces.
// Every tag must be self-closing.

  return (

    // The outer container. `margin: "0 auto"` centres the content horizontally. A component can only return one root element, so everything lives inside this single div.
    // The page title and live counter. `{liveCount}` inserts the current state value. Every time `setLiveCount` is called, React re-renders just this paragraph with the new number.
    // `data` receives the chartData object. `responsive: true` makes it resize automatically when the browser window changes width.
    // The search input and button. `value={searchQuery}` makes this a controlled input — React owns the value, not the browser. `onChange` fires on every keystroke and updates `searchQuery` state. `onClick` calls `handleSearch` when the button is pressed.

    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>       
    <h1>Ophan-lite — Live Content Analytics</h1>
      <p style={{ color: "#666" }}>Live events received: <strong>{liveCount}</strong>
      </p>

      {/* Bar chart showing top articles by view count */}
      <Bar data={chartData} options={{ responsive: true }} />

      {/* Full-text search powered by Elasticsearch */}
      <div style={{ marginTop: 32 }}>
        <h2>Search articles</h2>
        <input
          value={searchQuery} // `value={searchQuery}` makes this a controlled input — React owns the value, not the browser.
          onChange={e => setSearch(e.target.value)} // `onChange` fires on every keystroke and updates `searchQuery` state.
          placeholder="Try: climate, football, budget…"
          style={{ width: 300, padding: 8, marginRight: 8 }}
        />
        <button onClick={handleSearch}>Search</button> 


        {searchResults.map((r: Article) => ( 
          //`.map()` loops through the array and returns JSX for each item. 
          // `(r: Article)` explicitly types each result, removing the ESLint any warnings.
          // `key={r.url}` is required by React when rendering lists — it must be unique per item so React can track which items changed.
          
          <div key={r.url} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <strong>{r.title}</strong>
            <span style={{ marginLeft: 12, color: "#999" }}>{r.section}</span>
          </div>
        ))}
      </div>

      {/* Live article table */}
      <div style={{ marginTop: 32 }}>
        <h2>Articles (live)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Title</th>
              <th style={{ textAlign: "left", padding: 8 }}>Section</th>
              <th style={{ textAlign: "right", padding: 8 }}>Views</th>
            </tr>
          </thead>
          <tbody>

            {articles.map(a => ( 
              // `key={a.id}` uses the database ID as the unique identifier.
              <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
                
                <td style={{ padding: 8 }}>{a.title}</td>
                <td style={{ padding: 8, color: "#666" }}>{a.section}</td>
                <td style={{ padding: 8, textAlign: "right", fontWeight: "bold" }}>{a.view_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}