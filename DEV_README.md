# DEV_README — Developer Notes & Project Walkthrough

Hey there! Here are quick developer notes explaining how this project is put together, how the agent works under the hood, and how to talk through it in an interview.

---

## 💡 Quick Mental Model

The project is built around **3 main layers**:
1. **The UI (`app/page.tsx`)**: A Next.js dual-pane dashboard. Left side is the chat assistant; right side is a live inventory table backed directly by SQLite. Whenever the agent adds or transfers an asset, the table updates in real time.
2. **The Agentic Core (`lib/agent.ts` + `lib/tools.ts`)**: The brain of the assistant. It receives user prompts and past conversation history, decides which tool(s) to call, executes them, and synthesizes a natural answer.
3. **The Data Layer (`lib/db.ts` + `data/assets.db`)**: Self-contained SQLite database using Node's built-in `node:sqlite`. Zero external database setups, zero Docker containers, fully portable.

---

## 🧠 How the Agent Actually Works

### Dual-Engine Design: Why have two modes?
When someone grades a technical assessment, they might not have an OpenAI key on hand or their key might run out of quota. If an app crashes with `401 Unauthorized`, you fail.
So I designed the agent with two interchangeable modes:
- **Mode 1: OpenAI Tool Calling (`gpt-4o-mini`)**:
  - When `OPENAI_API_KEY` is present, it uses OpenAI's function calling API.
  - Runs in an autonomous loop (`while (loopCount < 4)`).
  - Can make **multi-step tool calls**: for example, it can call `lookup_asset("AST1002")`, inspect the returned employee (`Rohan Verma`), and then autonomously trigger `lookup_employee("Rohan Verma")` to fetch the manager!
- **Mode 2: Zero-Config Local Fallback Agent**:
  - If no API key is provided, the local heuristic engine takes over.
  - It tracks conversation context (resolving pronouns like "it" to the last mentioned asset code).
  - It executes the exact same underlying tools (`lookup_asset`, `lookup_employee`, `recommend_assets`, `transfer_asset`, `add_new_asset`).
  - Guarantees that whoever clones the repo can run it immediately with zero configuration!

---

## 🔍 How Each Functional Requirement is Handled

### 1. Search by Asset Code (`Show details of AST1002`)
- **How it works:** Tool `lookup_asset` is invoked with `asset_code: "AST1002"`.
- Query executed: `SELECT * FROM assets WHERE UPPER(asset_code) = UPPER(?)`.
- Result is formatted into a clean conversational summary.

### 2. Natural Language Questions (`Where is AST1002 located?`)
- **How it works:** The agent extracts the asset code or location intent, calls `lookup_asset`, and responds conversationally with the specific office location (e.g., `Bangalore - 3rd Floor`).

### 3. Multi-Step Reasoning (`Who is using AST1002, and who is that employee's manager?`)
- **Step 1:** Call `lookup_asset("AST1002")` &rarr; returns `{ employee_name: "Rohan Verma", location: "Bangalore - 3rd Floor", ... }`.
- **Step 2:** Agent observes that the user also asked for the employee's manager. It executes `lookup_employee("Rohan Verma")` against the `employees` table.
- **Step 3:** The employee query returns `{ name: "Rohan Verma", role: "Full Stack Developer", manager_name: "Anita Roy" }`.
- **Step 4:** The agent combines both results into the final response: *"Rohan Verma is currently using AST1002. Their manager is Anita Roy (Director of Engineering)."*

### 4. Conversation Context Memory (`Where is AST1002?` &rarr; `Who is using it?`)
- In Next.js, the frontend stores the array of `messages` (`role: 'user' | 'assistant'`).
- Every POST to `/api/chat` sends the entire conversation history.
- When the user asks *"Who is using it?"*, the agent scans backwards through the conversation history, identifies that the prior subject was `AST1002`, and answers who is assigned to `AST1002`.

### 5. Asset Recommendations (`Find an available laptop in Bangalore`)
- Tool `recommend_assets` filters for `status = 'Available'` and matches `category LIKE '%Laptop%'` and `location LIKE '%Bangalore%'`.
- Returns available items (like `AST1005` - HP EliteBook and `AST1006` - MacBook Pro 14 M3 in the Bangalore IT store room).

### 6. Asset Transfer & Additions
- Transfer: Tool `transfer_asset` updates `employee_name` and optionally `location` in SQLite, sets status to `Assigned`.
- Add: Tool `add_new_asset` validates required fields, inserts into SQLite, and returns the new asset.
- Both operations return the updated asset list to the frontend so the table refreshes automatically!

---

## 🛠️ File Structure & What Does What

```
├── app/
│   ├── api/chat/route.ts       -> Handles POST chat requests, calls runAssetAgent, returns reply + tool traces
│   ├── api/assets/route.ts     -> REST endpoint for listing & filtering all assets
│   ├── api/assets/[code]/      -> Single asset endpoint (GET details, PATCH transfer)
│   ├── api/employees/route.ts  -> Employee & manager lookup endpoint
│   ├── page.tsx                -> React UI with Chat + Live Inventory Table + Sample Prompts
│   └── globals.css             -> Tailwind CSS
├── lib/
│   ├── agent.ts                -> Agent core: OpenAI tool loop + Local Fallback engine
│   ├── tools.ts                -> Tool definitions (JSON schema) and tool execution router
│   └── db.ts                   -> SQLite prepared statements & CRUD operations
├── scripts/
│   ├── seed.js                 -> Creates initial 26 assets + 12 employees, exports CSV
│   ├── test-agent.js           -> Quick node script to test db methods
│   └── verify-e2e.js           -> Automated test verifying all 5 test criteria
├── data/
│   ├── assets.db               -> The SQLite database file
│   └── assets.csv              -> The CSV export file
```

---

## 💬 Interview Talking Points

If asked about this project in an interview:

1. **Why Next.js?**
   - Single repo for both frontend and backend API.
   - Easy to host on Vercel, Node, or Docker.
   - Built-in TypeScript support and App Router for clean API routes.

2. **Why SQLite via `node:sqlite`?**
   - No external database server or Docker container required to run or test the project.
   - `node:sqlite` is built into modern Node.js, so there are no native C++ compilation (`node-gyp`) issues.
   - Fast, sync operations with ACID guarantees.

3. **How is this truly Agentic rather than just an if-else bot?**
   - It defines formal tool schemas (`tools.ts`) with parameters.
   - The LLM receives the system prompt, tool schemas, and conversation history, and autonomously determines when and which tools to call.
   - Supports multi-step execution where output from one tool feeds into another tool before generating a conversational response.
   - In the UI, each message displays a transparent **"Agent Tools Executed"** collapsible card showing the exact tool names, arguments, and return values!

4. **How did you handle edge cases?**
   - Pronoun resolution for context memory.
   - Zero-config fallback mode so reviewers never get a `401 Unauthorized` if they don't have an OpenAI key.
   - CSV mirror export for evaluators who want to review spreadsheet data.
