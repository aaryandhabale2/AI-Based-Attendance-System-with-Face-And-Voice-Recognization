# AI-Based Attendance System with Face and Voice Recognition

An automated attendance system that identifies a student using **two biometric factors, face and voice**, marks attendance in real time, tracks attendance percentage over the semester, decides **MSE (Mid Semester Exam) eligibility**, and alerts parents by SMS when a student is at risk. Faculty get a dashboard with live analytics.

> Major Project, 5th Semester, B.Tech (Data Science)
> <!-- TODO: add college name, department, academic year, guide name -->

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Objectives](#2-objectives)
3. [Key Features](#3-key-features)
4. [System Architecture](#4-system-architecture)
5. [How It Works](#5-how-it-works)
6. [Tech Stack](#6-tech-stack)
7. [Database Design](#7-database-design)
8. [Attendance Rules and Eligibility Logic](#8-attendance-rules-and-eligibility-logic)
9. [Faculty Dashboard](#9-faculty-dashboard)
10. [Project Structure](#10-project-structure)
11. [Installation and Setup](#11-installation-and-setup)
12. [Configuration](#12-configuration)
13. [Usage and Demo Flow](#13-usage-and-demo-flow)
14. [Privacy and Security](#14-privacy-and-security)
15. [Limitations](#15-limitations)
16. [Future Scope](#16-future-scope)
17. [References](#17-references)
18. [Team](#18-team)

---

## 1. Problem Statement

Manual attendance in colleges has three recurring problems:

- **Time loss.** Roll calls take several minutes of every lecture.
- **Proxy attendance.** A student can answer for an absent friend. Face-only systems reduce this but can still be fooled by a photo or video shown to the camera.
- **No early warning.** Attendance is usually totted up only near the exam, when students and parents learn about a shortage too late to fix it.

This project addresses all three: attendance is captured automatically, a second biometric factor makes impersonation much harder, and the system continuously monitors each student against the eligibility cutoff and alerts parents early.

## 2. Objectives

- Automate attendance capture using face recognition.
- Add voice (speaker) verification as a second factor to reduce proxy and spoofing attempts.
- Compute weekly and cumulative attendance per student with a reproducible data pipeline.
- Determine MSE eligibility using a configurable attendance cutoff (default **55%**).
- Notify parents by SMS when a student is below the cutoff or close to it.
- Give faculty a clear dashboard for monitoring, filtering and exporting attendance data.

## 3. Key Features

| Area | What it does |
|---|---|
| Enrollment | Register a student with details, 5 to 10 face photos and 3 to 5 voice samples. Only numeric embeddings are stored. |
| Face recognition | Detects faces from the webcam feed and matches them against enrolled embeddings using cosine similarity. |
| Voice verification | Records a short mic sample and verifies the speaker against the enrolled voice embedding. |
| Two-factor decision | Attendance is marked **only if both face and voice match the same student**. Per-factor scores are shown on screen. |
| Duplicate protection | A student cannot be marked twice in the same session. |
| Unknown / mismatch flagging | Unrecognised faces and face-voice mismatches are logged for faculty review. |
| Data pipeline | Pandas-based cleaning and a scheduled weekly aggregation job. |
| Eligibility engine | Classifies each student as Eligible, At Risk or Not Eligible against the cutoff. |
| SMS alerts | Parents are alerted through a pluggable SMS provider (Mock, Fast2SMS, Twilio or MSG91). |
| Faculty dashboard | Stat cards, trend and class-wise charts, searchable student table, badges and CSV export. |

## 4. System Architecture

```
                    +-----------------------------+
                    |   Browser (React frontend)  |
                    |  webcam + mic + dashboard   |
                    +--------------+--------------+
                                   | HTTPS / REST (JSON, image, audio)
                                   v
                    +-----------------------------+
                    |      FastAPI backend        |
                    |-----------------------------|
                    |  Auth  | Enrollment | Attendance API
                    |  Eligibility engine | Alert service
                    +------+-----------+----------+
                           |           |
              +------------+           +--------------+
              v                                       v
   +---------------------+                 +----------------------+
   |   Recognition core  |                 |     Data layer       |
   |---------------------|                 |----------------------|
   | Face: OpenCV +      |                 | SQLite (prototype)   |
   |   InsightFace       |                 | Pandas cleaning      |
   | Voice: SpeechBrain  |                 | APScheduler weekly   |
   |   ECAPA-TDNN        |                 |   aggregation job    |
   +---------------------+                 +----------+-----------+
                                                      |
                                                      v
                                           +----------------------+
                                           |     SMS provider     |
                                           | Mock / Fast2SMS /    |
                                           | Twilio / MSG91       |
                                           +----------------------+
```

The design separates four concerns: **capture** (browser), **recognition** (ML core), **records** (database and pipeline) and **communication** (SMS). Each can be swapped without touching the others.

## 5. How It Works

### 5.1 Enrollment

1. Faculty or admin opens the enrollment page and enters the student's name, roll number, class and parent phone number.
2. The webcam captures several face images from slightly different angles. The mic records a few short voice samples.
3. The face model converts each image into a numeric vector (embedding). The voice model does the same for each audio sample.
4. Embeddings are averaged into one template per factor and saved against the student. **Raw photos and audio are not stored.**

### 5.2 Taking attendance

1. A session is started for a class and subject.
2. The webcam frame is processed: the face is detected, aligned, converted to an embedding and compared with every enrolled face template using cosine similarity.
3. The best match is accepted only if its score is above the **face threshold**.
4. The identified student is then asked to speak. The voice sample is converted to an embedding and compared with **that student's** voice template.
5. The final decision:

```
present  =  face_score >= FACE_THRESHOLD
        AND voice_score >= VOICE_THRESHOLD
        AND both factors point to the same student
        AND student not already marked in this session
```

6. The screen shows the face score, the voice score and the final decision, so the process is transparent during a demo.
7. Failed or mismatched attempts are stored as flagged events instead of being silently dropped.

### 5.3 Data pipeline

- Raw attendance events are cleaned with **Pandas** (duplicates removed, timestamps normalised, sessions mapped to classes).
- A **scheduled weekly job** (APScheduler) aggregates attendance per student: classes held, classes attended and attendance percentage.
- Cumulative percentage is recomputed after every aggregation and written to the eligibility table.

### 5.4 Alerts

After each aggregation the eligibility engine checks every student. If a student is **At Risk** or **Not Eligible**, an SMS is sent to the parent's number through the configured provider. Sent messages are logged and visible in the dashboard's alert panel.

## 6. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React (Vite), Tailwind CSS, Recharts, Lucide icons | Fast development, clean responsive UI, easy charts |
| Backend | Python, FastAPI | Async, automatic API docs, good fit for ML code in the same language |
| Face recognition | OpenCV, InsightFace (ArcFace embeddings) | Accurate embeddings and installs without C++ build tools |
| Voice verification | SpeechBrain ECAPA-TDNN (Resemblyzer as a lighter fallback) | Strong speaker embeddings |
| Data processing | Pandas | Cleaning and aggregation |
| Scheduling | APScheduler | Weekly aggregation job |
| Database | SQLite via SQLAlchemy (prototype) | Zero setup for demo |
| Notifications | Mock SMS, Fast2SMS, Twilio, MSG91 | Pluggable provider interface |

<!-- TODO: correct this table if the implemented stack differs -->

## 7. Database Design

Main tables:

| Table | Key columns | Purpose |
|---|---|---|
| `students` | id, name, roll_no, class, parent_phone | Student master record |
| `biometric_templates` | student_id, face_embedding, voice_embedding | Numeric templates only, no raw media |
| `sessions` | id, class, subject, date, start_time | One row per lecture or attendance session |
| `attendance` | id, session_id, student_id, face_score, voice_score, marked_at | Verified attendance records |
| `flagged_events` | id, session_id, reason, face_score, voice_score, timestamp | Unknown faces and face-voice mismatches |
| `weekly_summary` | student_id, week, held, attended, percentage | Output of the weekly aggregation job |
| `eligibility` | student_id, percentage, status, updated_at | Eligible / At Risk / Not Eligible |
| `alerts` | id, student_id, message, provider, status, sent_at | SMS log |
| `users` | id, username, password_hash, role | Faculty and admin login |

## 8. Attendance Rules and Eligibility Logic

```
attendance % = (classes attended / classes held) x 100
```

| Status | Condition (defaults) |
|---|---|
| **Eligible** | attendance % is at least the cutoff plus the at-risk margin |
| **At Risk** | attendance % is at least the cutoff but within the at-risk margin above it |
| **Not Eligible** | attendance % is below the cutoff |

- **Cutoff:** 55% for MSE eligibility (configurable through `ATTENDANCE_CUTOFF`).
- **At-risk margin:** 5 percentage points above the cutoff (configurable through `AT_RISK_MARGIN`).

Example: with a 55% cutoff, a student at 58% is At Risk, one at 72% is Eligible and one at 49% is Not Eligible.

## 9. Faculty Dashboard

- **Login** required for faculty and admin.
- **Stat cards:** total students, average attendance, eligible, at-risk and not-eligible counts.
- **Attendance trend:** weekly line chart.
- **Class-wise comparison:** bar chart.
- **Student table:** search, filters and coloured status badges.
- **Alerts panel:** SMS messages sent and their status.
- **Flagged events:** unknown faces and mismatches for review.
- **Export:** download attendance data as CSV.

<!-- TODO: add screenshots -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->
<!-- ![Live attendance](docs/screenshots/live-attendance.png) -->

## 10. Project Structure

```
AI-Based-Attendance-System-with-Face-And-Voice-Recognization/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── api/               # routes: auth, students, attendance, dashboard
│   │   ├── core/              # config, security
│   │   ├── models/            # SQLAlchemy models
│   │   ├── services/
│   │   │   ├── face.py        # face detection and embeddings
│   │   │   ├── voice.py       # speaker embeddings and verification
│   │   │   ├── eligibility.py # cutoff and status logic
│   │   │   ├── pipeline.py    # Pandas cleaning and weekly aggregation
│   │   │   └── sms/           # mock, fast2sms, twilio, msg91 providers
│   │   └── scheduler.py       # APScheduler jobs
│   ├── scripts/seed.py        # dummy data for demo
│   └── requirements.txt
├── frontend/
│   ├── src/                   # pages, components, charts
│   └── package.json
├── docs/                      # report, screenshots
├── .env.example
├── .gitignore
└── README.md
```

<!-- TODO: update the tree to match the actual repo -->

## 11. Installation and Setup

**Prerequisites:** Python 3.10 or newer, Node.js 18 or newer, a webcam and a microphone.

### Backend

```bash
git clone https://github.com/aaryandhabale2/AI-Based-Attendance-System-with-Face-And-Voice-Recognization.git
cd AI-Based-Attendance-System-with-Face-And-Voice-Recognization/backend

python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # then edit values
python scripts/seed.py        # loads demo data
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000` and interactive docs are at `http://localhost:8000/docs`.

### Frontend

```bash
cd ../frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

> The first run downloads the face and voice model weights, so it needs an internet connection and may take a few minutes.

## 12. Configuration

Copy `.env.example` to `.env` and set:

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./attendance.db` | Database connection |
| `SECRET_KEY` | none | Key used to sign login tokens |
| `FACE_THRESHOLD` | `0.45` | Minimum cosine similarity for a face match |
| `VOICE_THRESHOLD` | `0.60` | Minimum similarity for a voice match |
| `ATTENDANCE_CUTOFF` | `55` | MSE eligibility cutoff in percent |
| `AT_RISK_MARGIN` | `5` | Percentage points above cutoff treated as At Risk |
| `SMS_PROVIDER` | `mock` | `mock`, `fast2sms`, `twilio` or `msg91` |
| `SMS_API_KEY` | none | Provider credentials (not needed for `mock`) |

<!-- TODO: tune the two thresholds on your own test data and update the defaults -->

Never commit `.env`. Only `.env.example` belongs in the repo.

## 13. Usage and Demo Flow

A 5 minute walkthrough:

1. **Login** to the faculty dashboard and show the pre-loaded demo data (seeded students and weeks of attendance).
2. **Enroll** a new student live: enter details, capture face photos, record voice samples.
3. **Start a session** for a class and subject.
4. **Mark attendance:** show the face match, then the voice check, then the final decision with both scores.
5. **Show a rejection:** try a different person's voice with an enrolled face, and show the flagged event.
6. **Refresh the dashboard:** the new attendance appears in the charts and student table.
7. **Eligibility and alerts:** open a student below 55%, show the Not Eligible badge and the SMS in the alerts panel.
8. **Export** the data as CSV.

## 14. Privacy and Security

Face and voice are biometric data, so the project is designed to collect as little as possible.

- Only **embeddings** are stored, not raw photos or audio recordings.
- Embeddings and the database are excluded from version control through `.gitignore`.
- Faculty access is behind authentication, with hashed passwords.
- All secrets and API keys live in environment variables.
- Students should give informed consent before enrollment.
- In a real deployment, use HTTPS, encrypt the database at rest and define a data-retention policy.

## 15. Limitations

- Accuracy depends on lighting, camera angle and microphone quality. Noisy classrooms lower voice verification accuracy.
- Voice verification can be fooled by a high-quality recording. A random spoken phrase (challenge-response) would reduce this risk.
- The face pipeline does not yet include a dedicated liveness (anti-spoofing) model.
- The prototype uses SQLite and a single machine. It is not built for many simultaneous classrooms.
- Real SMS delivery in India needs provider setup and DLT registration, so the demo uses the mock provider by default.

## 16. Future Scope

- Random-phrase voice challenge and a liveness detection model against photo, video and replay attacks.
- Production architecture: PostgreSQL or MySQL with AWS RDS and S3, or Firebase (Firestore and Storage). Note that Firebase Cloud Functions need the Blaze pay-as-you-go plan.
- Multi-classroom support with edge devices at each room.
- Mobile app for students and parents.
- Automatic reports per subject and semester.
- Integration with the college ERP.

## 17. References

<!-- TODO: add the full paper titles and DOIs -->

1. Bangaru et al., *International Journal of Information Systems (IJIS)*, 2026.
2. Babitha et al., *JAAFR*, 2026.
3. Mulla et al., *IRJET*, 2025.

## 18. Team

<!-- TODO: add team members, roll numbers and roles -->

| Name | Role |
|---|---|
| Aaryan Dhabale | <!-- role --> |

**Guide:** <!-- TODO -->

---

## License

<!-- TODO: choose a license (for example MIT) and add a LICENSE file -->
