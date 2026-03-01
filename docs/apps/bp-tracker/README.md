BP Tracker — System Architecture & Data Model

1. System Overview

BP Tracker is a lightweight full-stack web application.

Frontend:
	•	Static site (Netlify)
	•	Vanilla HTML / CSS / JavaScript
	•	No frameworks

Backend:
	•	Google Apps Script Web App
	•	Single /exec endpoint

Database:
	•	Google Sheets (BP Tracker Log)

All frontend data access occurs via Apps Script.
Frontend never accesses Sheets directly.

⸻

2. Sheet Structure (Authoritative Data Model)

Spreadsheet name: BP Tracker Log

Tab names must match exactly (lowercase):

raw (Morning Sessions)

Purpose: Store 3 raw readings.

Headers (fixed order required):

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

No averages stored here.

⸻

evening (Evening Sessions)

Purpose: Store 2 readings + computed averages.

Headers:

timestamp
date
time
systolic1
diastolic1
pulse1
systolic2
diastolic2
pulse2
sys_avg
dia_avg
pulse_avg
notes

Averages are computed in frontend before POST.

⸻

daily (Daily Aggregation)

Purpose:
	•	Source of truth for trend table
	•	Used for 7-day display and rolling average

Headers:

date
sys_avg
dia_avg
pulse_avg
notes

Each save (morning or evening) writes a daily row.

⸻

3. API Contract

All requests:

Content-Type: text/plain;charset=utf-8

Endpoint:
https://script.google.com/macros/s//exec

⸻

POST Types

type = “raw”
→ writes to raw

type = “evening”
→ writes to evening

type = “daily”
→ writes to daily

Frontend workflow:
	1.	Save session (raw or evening)
	2.	Save daily average

⸻

GET Parameters

?ping=1
→ health check

?list=raw&n=5
?list=evening&n=5
?list=daily&n=5
→ returns latest N rows (max 50)

?clear=1
→ clears all data rows (keeps headers)

⸻

4. Date Handling Rule (Critical Invariant)

Google Sheets returns date values as ISO strings:

2026-03-01T00:00:00.000Z

Frontend normalizes:

YYYY-MM-DD

Implementation rule:

String(r.date).slice(0, 10)

All map keys and comparisons use normalized YYYY-MM-DD.

Never use full ISO timestamp as lookup key.

⸻

5. Frontend Logic

Mode toggle:
	•	Morning → 3 readings
	•	Evening → 2 readings

On Save:
	1.	Validate inputs
	2.	Compute averages
	3.	POST session
	4.	POST daily
	5.	Refresh 7-day table

Trend Table:
	•	Uses daily tab only
	•	Generates last 7 calendar dates
	•	Matches via normalized YYYY-MM-DD
	•	Displays daily values
	•	Calculates rolling 7-day mean

⸻

6. Debugging Protocol (Layered Validation)

Always debug in this order:
	1.	Backend reachable
curl ?ping=1
	2.	Sheet state correct
curl ?list=daily&n=5
	3.	Date format normalized
Ensure YYYY-MM-DD matching
	4.	Frontend rendering

Never modify frontend until backend state is verified.

⸻

7. Current Stable Features
	•	Morning 3-reading save
	•	Evening 2-reading save
	•	Automatic daily write
	•	7-day trend table
	•	7-day rolling average
	•	Clear endpoint
	•	Date normalization enforced

⸻

8. Known Architectural Decisions
	•	Daily aggregation is written by frontend (not calculated in Apps Script)
	•	Multiple daily entries per date allowed
	•	Trend uses latest entry per date
	•	Sheets act as simple append-only log
	•	No historical editing logic

⸻

This version is:
	•	Precise
	•	Structured
	•	Future-proof
	•	LLM-context efficient
	•	Contract-driven