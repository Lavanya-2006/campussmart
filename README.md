# CampusCare — Smart Campus Complaint Management

A responsive campus complaint portal built with plain HTML, CSS, and JavaScript, an Express/Node.js REST API, and MongoDB. Students can report and track issues; campus staff can filter complaints, update their status, see live totals, and export the current view as CSV.

## Features

- Student complaint form with required-field and length validation.
- Server-generated tracking IDs in the `SC-YYYY-XXXXXX` format.
- Persistent complaint data stored in MongoDB.
- Track a complaint by its exact ID and see its current status.
- Admin dashboard with live total, pending, in-progress, and resolved counts.
- Filter the admin table by category and status; update status inline.
- Export the currently filtered complaints to CSV.
- Local, rule-based category and priority suggestions. No paid API or external AI service is used; suggestions are advisory and can be overridden.
- Responsive layouts for desktop, tablet, and mobile.
- Optional sample complaint data for demonstrations.

## Requirements

- Node.js 18 or later and npm.
- MongoDB Community Server running locally, or a MongoDB Atlas cluster.

## Run locally

1. Install dependencies from the project root:

   ```sh
   npm install
   ```

2. Create your private environment file by copying `.env.example` to `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Configure the MongoDB connection string in `.env`:

   ```dotenv
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/smart-campus-complaints
   ```

   The local example uses a MongoDB instance on the same computer. For MongoDB Atlas, replace the URI with the cluster connection string. URL-encode special characters in the database username or password. Keep `.env` private; it is excluded from Git.

4. (Optional) Add demo records. This inserts examples only when the database has no complaints:

   ```sh
   npm run seed
   ```

5. Start the server:

   ```sh
   npm start
   ```

   For development with Node's built-in watch mode:

   ```sh
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000). Use the Student Portal and Admin Dashboard navigation to switch between the two views.

The server checks MongoDB before listening. If it cannot connect, check that MongoDB is running and the `MONGODB_URI` in `.env` is correct.

## Project architecture

```text
Browser
  public/index.html, styles.css, app.js
       │ same-origin JSON requests (/api/*)
       ▼
Node.js + Express (server.js)
  ├─ request validation and REST routes
  ├─ local static-file hosting
  └─ Mongoose model (models/Complaint.js)
       │ MONGODB_URI from private .env
       ▼
MongoDB (smart-campus-complaints database)
```

- **Frontend:** `public/` contains the student and admin views. `app.js` calls the API and renders returned data; it does not store complaints in browser storage.
- **Backend:** `server.js` serves the UI and exposes the JSON API. It validates inputs, generates IDs, computes dashboard counts, and reports errors.
- **Data layer:** `models/Complaint.js` defines and validates the MongoDB complaint document. MongoDB persists records across browser refreshes and server restarts.
- **Configuration:** `dotenv` loads `PORT` and `MONGODB_URI` from `.env`. Only `.env.example` (without credentials) should be shared or committed.
- **Demo records:** `scripts/seed.js` inserts sample complaints once into an empty collection; it does not erase existing records.
- **Suggestions:** `public/app.js` uses local keyword rules for category and priority hints. This is lightweight, free, and does not send complaint text to an AI provider.

## API reference

All endpoints are served from the same origin as the UI.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check server and MongoDB connection state |
| `GET` | `/api/complaints` | List recent complaints; optional `category`, `status`, or exact `complaintId` query |
| `GET` | `/api/complaints/stats` | Get total and per-status counts |
| `POST` | `/api/complaints` | Create a complaint; ID and initial `Pending` status are assigned by the server |
| `PATCH` | `/api/complaints/:complaintId/status` | Set status to `Pending`, `In Progress`, or `Resolved` |

Example create request:

```json
{
  "studentName": "Alex Johnson",
  "department": "Computer Science",
  "category": "Wi-Fi",
  "description": "Wi-Fi is disconnecting repeatedly in the engineering block.",
  "priority": "Medium"
}
```

Allowed categories are `Classroom`, `Wi-Fi`, `Drinking Water`, `Laboratory Equipment`, `Washroom`, `Hostel Maintenance`, and `Other`. The API returns JSON and uses standard HTTP error codes for invalid input and missing records.

## Security and production notes

This is a functional local/demo application, not a production-ready public service. The admin view and write endpoints do **not** have authentication or authorization, and student records are visible to anyone who can reach the app. Before deploying with real student data, add administrator authentication and role-based API authorization, protect student privacy, configure HTTPS and appropriate database/network access controls, and add operational logging and backups. Do not treat the dashboard's frontend visibility as access control.

Never commit `.env` or paste a live MongoDB URI into source code.
