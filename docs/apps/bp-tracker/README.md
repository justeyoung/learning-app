# BP Tracker

A lightweight blood pressure tracking web app that:

- Collects 3 readings (systolic / diastolic / pulse)
- Automatically calculates daily averages
- Writes data to Google Sheets via Apps Script
- Displays a 7-day trend chart
- Works as a static site (GitHub + Netlify)

---

## Architecture

Frontend:
- HTML (index.html, info.html)
- Vanilla JavaScript (app.js)
- CSS (style.css)
- Canvas-based chart rendering
- Service worker (offline support)

Backend:
- Google Apps Script Web App
- Connected to Google Sheet: "BP Tracker Log"

---

## Google Sheet Structure

Spreadsheet name: **BP Tracker Log**

Tabs (lowercase only):
- `raw`
- `daily`
- `iso_sessions`

### raw (horizontal headers)
timestamp  
date  
time  
systolic1  
diastolic1  
pulse1  
systolic2  
diastolic2  
pulse2  
systolic3  
diastolic3  
pulse3  

### daily (horizontal headers)
date  
sys_avg  
dia_avg  
pulse_avg  
notes  

### iso_sessions (horizontal headers)
timestamp_iso  
date  
time  
session_id  
level  
hold_sec  
rest_sec  
rounds_completed  
steps_completed  
total_sec_actual  
completed  
notes  

---

## API Contract

Apps Script accepts:

type = "raw" | "daily" | "iso_sessions"

GET:
?list=daily&n=10

POST:
Content-Type: text/plain;charset=utf-8  
Body: JSON

---

## Deployment

Hosted via:
- GitHub
- Netlify (auto-deploy from main branch)

Service worker versioning is used to invalidate cache on major updates.

---

## Current Features

- Automatic 3-reading averaging
- Raw + daily write in single save action
- 7-day rolling chart
- Mobile responsive layout
- Informational guidance page

---

## Future Ideas

- Monthly view
- CSV export
- Editable past entries
- Statistical summaries
- ISO session integration with BP

---

Author: Yung C