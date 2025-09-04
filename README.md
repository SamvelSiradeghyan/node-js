
# File Metadata Service

A simplified **File Metadata Service** that tracks file metadata for uploads to cloud storage and provides query APIs.

## Tech Stack

- **Node.js (LTS)** + **TypeScript**
- **NestJS** 
- **PostgreSQL** via the lightweight `pg` driver
- **Jest** + **supertest** for tests
- **Docker Compose** for local dev

The metadata table is named **`filemeta`**

---

## Data Model

Each record in `filemeta` has:

- `file_id` (UUID, PK)
- `user_id` (TEXT)
- `filename` (TEXT)
- `size_bytes` (BIGINT)
- `content_type` (TEXT)
- `upload_time` (TIMESTAMPTZ)
- `tags` (TEXT[])
- `checksum_sha256` (TEXT)

### Where `checksum_sha256` is populated

- **Server computes** the checksum if you send `content_base64` in `POST /files`. We hash the decoded bytes using SHA-256.
- Alternatively, **client may provide** `checksum_sha256` directly (e.g., calculated during/after upload by the client or gateway).
- If **both** are sent, the server **verifies** they match.
- If **neither** is sent, the request is rejected (`400`).

This mirrors a typical production flow where storage happens out-of-band (e.g., S3 signed upload) and the backend verifies a checksum supplied by the client or computes it on the blob stream.

---

## API

### Create
**`POST /files`** → create metadata record  
- Body:  
  ```json
  {
    "user_id": "user_123",
    "filename": "cat.jpg",
    "size_bytes": 12345,
    "content_type": "image/jpeg",
    "tags": ["pets", "images"],
    "content_base64": "aGVsbG8gd29ybGQ="
    // OR "checksum_sha256": "..." (if computed it client-side)
  }
  ```
- Returns `201 Created` with the record and `Location` header.

**Idempotency**: We enforce a unique constraint on `(user_id, checksum_sha256, filename)`. Retrying the same create is safe; it will return the existing row.

### Retrieve
**`GET /files/{id}`** → fetch by `file_id`  
- Returns `404` if not found.

### Query with filters + pagination
**`GET /files?user_id=...&tag=...&before=...&limit=...&cursor=...`**  
- Filters are optional; recommended to include `user_id` for scalability.
- Pagination is **cursor-based**. We return at most `limit` items (default 50, max 100) ordered by `upload_time DESC, file_id DESC`.
- Response:
  ```json
  {
    "data": [ /* records */ ],
    "page": {
      "limit": 50,
      "next_cursor": "eyJ1cGxvYWRfdGltZSI6IjIwMjUtMDktMDNUMDA6MDA6MDAuMDAwWiIsImZpbGVfaWQiOiIuLi4ifQ"
    }
  }
  ```
  Pass `next_cursor` back to fetch the next page.

### Update tags (JSON **Merge** Patch)
**`PATCH /files/{id}`**  
- **Content-Type must be** `application/merge-patch+json`.
- Only the `tags` field is patchable. Other fields are immutable in this exercise.
- Body examples:
  - Replace tags:
    ```json
    { "tags": ["archived", "pet"] }
    ```
  - Clear tags (`null` → we interpret as empty list):
    ```json
    { "tags": null }
    ```

---

## Pagination Trade-offs

We use **cursor pagination** keyed on `(upload_time DESC, file_id DESC)` with a tuple comparison in SQL and a compact base64 cursor.  
**Pros:** stable under insert churn; no offset drift; good for deep pagination.  
**Cons:** requires consistent sort key; not ideal for arbitrary sorting changes.

---

## Indexing Strategy

- `PRIMARY KEY (file_id)`
- `UNIQUE (user_id, checksum_sha256, filename)` — aids idempotency and deduplication per user+blob+filename.
- `INDEX (user_id, upload_time DESC)` — accelerates user-scoped, time-ranged listing.
- `INDEX (upload_time DESC)` — supports global listings (admin use, etc.).
- `GIN INDEX (tags)` — speeds up `tag` filter with `tags @> ARRAY['tag']`.

**Scaling to millions of rows:**  
- The above indexes keep lookups near logarithmic time.  
- For very large tenants, consider **table partitioning by hash(user_id)** or **time-range partitioning** (monthly) to constrain index sizes and vacuums.  
- Add **read-through cache** (e.g., Redis) for hot keys (recent lists per `user_id`).  
- In multi-region, colocate partitions with users or use read replicas.  
- If rows exceed tens of millions, GIN index memory could grow—monitor `shared_buffers` and consider `fastupdate` off/on trade-offs; or model tags in a side-table with inverted index if necessary.

---

## Why PostgreSQL (vs MongoDB)

- Strong schema & indexing for time-ordered queries + composite sorting required by cursor pagination.  
- ACID guarantees fit idempotent upserts and unique constraints.  
- Array + GIN for `tags` keeps schema simple without ORMs.  
- For MongoDB, we'd embed metadata in a single doc; tags as an array with a multikey index. We would **embed** (single owner, query by whole record), and **reference** only if cross-document relationships were needed (not here).

---

## Why not Event Sourcing

- We store current state only; history/event replay brings complexity with little benefit here.  
- Requirements focus on direct query/filter performance and simple updates.  
- Operational overhead (streams, consumers, projections) isn't justified.

---

## Run Locally

### Prereqs
- Docker + Docker Compose
- Node 20.x

### Start DB + App
```bash
docker compose up --build
# App on http://localhost:3000
```

### Dev Mode (hot reload)
```bash
# Start only DB via Compose, then run dev locally:
docker compose up -d db
npm install
npm run dev
```

### Tests
```bash
# Ensure DB is running locally (ports 5432).
docker compose up -d db
npm run test
```

---

## Example Requests

See [`requests.http`](./requests.http) for ready-to-run examples (use VSCode REST Client or copy/paste with curl).

---
