# AttendAI — AI-Based Attendance System with Face & Voice Recognition

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-SQLAlchemy_ORM-003B57.svg?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![InsightFace](https://img.shields.io/badge/Face_Model-ArcFace_InsightFace-FF6F00.svg?style=flat)](https://github.com/deepinsight/insightface)
[![SpeechBrain](https://img.shields.io/badge/Voice_Model-ECAPA--TDNN_SpeechBrain-E91E63.svg?style=flat)](https://speechbrain.github.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **College Major Project**: An end-to-end, production-ready attendance automation platform combining computer vision (facial recognition + liveness detection) and audio biometric processing (voiceprint speaker verification + anti-replay dynamic challenges) with a modern reactive web dashboard, automated low-attendance alerts, and historical trend analytics.

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Biometric Verification Pipeline](#-biometric-verification-pipeline)
3. [Key Features](#-key-features)
4. [Anti-Spoofing & Security Safeguards](#-anti-spoofing--security-safeguards)
5. [Tech Stack](#-tech-stack)
6. [Quick Start (One-Click Launch)](#-quick-start-one-click-launch)
7. [Manual Installation & Setup](#-manual-installation--setup)
8. [Faculty Default Credentials](#-faculty-default-credentials)
9. [Teacher Live Demo Script (5-Minute Walkthrough)](#-teacher-live-demo-script-5-minute-walkthrough)
10. [REST API Reference](#-rest-api-reference)
11. [Configuration & Environment Variables](#-configuration--environment-variables)
12. [Project Structure](#-project-structure)

---

## 🏛 System Architecture

```
                                  BROWSER CLIENT (React + Vite)
      ┌─────────────────────────────────┬────────────────────────────────┐
      │  Student Mode: /attendance     │   Faculty Mode: /dashboard     │
      │  • WebRTC Camera Stream        │   • Real-Time Statistics       │
      │  • MediaRecorder Audio Capture │   • Attendance Distribution    │
      │  • Anti-Replay Challenge Code  │   • Defaulter (<75%) Alerts    │
      │  • Instant 2FA Score Gauges    │   • CSV Report Export          │
      └────────────────┬────────────────┴────────────────┬───────────────┘
                       │ HTTP Multipart (Image + WAV)     │ Bearer JWT Auth
                       ▼                                 ▼
                    ┌───────────────────────────────────────┐
                    │       FastAPI Backend (:8000)         │
                    │ • CORS Middleware & Request Validation│
                    │ • APScheduler Background Defaulters   │
                    └──────────────────┬────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
 ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
 │   Face Service       │  │   Voice Service      │  │  Attendance Service  │
 │ • OpenCV Detection   │  │ • SpeechBrain ECAPA  │  │ • Weighted Score Fusion│
 │ • ArcFace 512-d      │  │ • Acoustic Resemblyzer│ │ • Decision Engine    │
 │ • Cosine Similarity  │  │ • Voiceprint Cosine  │  │ • Defaulter Analyzer │
 └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │    SQLite DB (SQLAlchemy)     │
                      │ • students (512-d + 192-d JSON│
                      │ • attendance (scores + status)│
                      │ • faculty (bcrypt credentials)│
                      │ • alerts (SMS audit trail)    │
                      └───────────────────────────────┘
```

---

## 🔬 Biometric Verification Pipeline

### 1. Two-Factor Score Fusion Equation
Attendance verification computes an individual cosine similarity metric against stored reference vector profiles:

$$\text{Cosine Similarity}(u, v) = \frac{u \cdot v}{\|u\|_2 \|v\|_2}$$

The combined confidence score is calculated as a weighted linear combination:

$$\text{Score}_{\text{combined}} = w_{\text{face}} \cdot \text{Score}_{\text{face}} + w_{\text{voice}} \cdot \text{Score}_{\text{voice}}$$

*Default Weights*: $w_{\text{face}} = 0.60$, $w_{\text{voice}} = 0.40$

### 2. Decision Logic Matrix
| Face Match ($\ge 0.50$) | Voice Match ($\ge 0.65$) | Combined Score ($\ge 0.60$) | Decision | Flag Reason |
|:---:|:---:|:---:|:---:|:---|
| ✅ **PASS** | ✅ **PASS** | ✅ **PASS** | **PRESENT** | None |
| ✅ **PASS** | ❌ **FAIL** | — | **FLAGGED / DENIED** | Voice verification failed |
| ❌ **FAIL** | ✅ **PASS** | — | **FLAGGED / DENIED** | Face verification failed |
| ❌ **FAIL** | ❌ **FAIL** | — | **ABSENT / DENIED** | Both biometric factors failed |

> **Biometric Privacy Safeguard**: Raw photos and audio recordings are **never** persisted to disk or database. Only normalized numerical embedding vectors (512-d float arrays) are stored in the SQLite database.

---

## ✨ Key Features

### 1. Public Kiosk Two-Factor Attendance (`/attendance`)
- Zero login required for students: simply stand in front of the kiosk webcam.
- Real-time video preview with an animated biometric target bounding frame.
- Browser audio capture using Web Audio / MediaRecorder API into 16kHz standard audio PCM.
- Dual visual meters showing exact Face Score %, Voice Score %, and combined confidence.
- Live sidebar displaying today's verified attendee roster with timestamps.

### 2. Seamless Student Biometric Enrollment (`/enroll`)
- Capture high-resolution face image directly from webcam stream with live face detection guidance.
- 4-second audio recording to extract voiceprint acoustic features.
- Metadata collection: Student Full Name, Roll Number, Class/Batch (e.g. `CS-A`, `IT-B`), and Parent Contact Number.
- Instant model inference saving mathematical representations to database.

### 3. Faculty Executive Dashboard (`/dashboard`)
- Authenticated portal with JWT token exchange and automatic session renewal.
- Metric cards: **Total Enrolled Students**, **Today's Attendance %**, **Total Flagged Spoof Attempts**, and **Critical Defaulters (<75%)**.
- Attendance Trend Area/Line chart across calendar weeks powered by Recharts.
- Today's Present vs. Absent status distribution pie chart.
- Searchable, filterable student roster with direct attendance badges.
- **One-Click CSV Export**: Download attendance reports containing roll number, parent phone, attendance count, and percentage.

### 4. Automated Defaulter & Absentee Alerts (`/dashboard` & `/api/alerts`)
- Students with cumulative attendance below **75%** are automatically highlighted with high-visibility red badges.
- **One-Click Defaulter Blast**: Dispatches immediate notification alerts to parents of all students below the attendance threshold.
- Integrated SMS Gateway Architecture: Supports modular **Fast2SMS** / **Twilio** drivers with an automatic fallback to an interactive **Mock SMS Service** with complete audit history.

---

## 🛡 Anti-Spoofing & Security Safeguards

1. **Dynamic Anti-Replay Voice Challenge**:
   - The attendance interface generates a random 4-digit verification code or dynamic passphrase on every attempt.
   - Prevents attackers from holding a smartphone playing a pre-recorded voice sample.
2. **OpenCV Facial Liveness & Quality Assurance**:
   - Laplacian variance blur detection rejects blurry screenshots or low-quality printed photos.
   - Face size ratio check ensures student is physically present within the webcam focal zone.
3. **Session Replay Protection**:
   - Attendance timestamps are bound to daily active sessions (`{class}_{YYYY-MM-DD}_{period}`). Duplicate attendance check-ins within the same period are prevented with clear user feedback.

---

## 💻 Tech Stack

| Layer | Technologies Used |
|---|---|
| **Backend Framework** | **Python 3.10+**, **FastAPI**, **Uvicorn**, **Pydantic v2** |
| **Database & ORM** | **SQLite3**, **SQLAlchemy 2.0**, **Alembic-ready schema** |
| **Computer Vision** | **OpenCV (cv2)**, **InsightFace (ArcFace 512-d)**, NumPy |
| **Audio & Speech ML** | **SpeechBrain (ECAPA-TDNN 192-d)**, **Resemblyzer**, SoundFile, PyTorch |
| **Data Analytics** | **Pandas**, **NumPy**, **APScheduler** |
| **Frontend Framework** | **React 18**, **Vite**, **Vanilla CSS Custom Design System** |
| **Charts & Icons** | **Recharts**, **Lucide React**, Canvas API |
| **Security & Auth** | **OAuth2 Password Bearer**, **Python-Jose (JWT)**, **Passlib (Bcrypt)** |

---

## 🚀 Quick Start (One-Click Launch)

### On Windows
Double-click `start.bat` or run:
```cmd
start.bat
```
*`start.bat` will automatically verify your Python & Node installations, apply database migrations/seeds if missing, start both servers in separate windows, and open your browser to `http://localhost:5173`.*

### On Linux / macOS
Grant executable permission and run:
```bash
chmod +x start.sh
./start.sh
```

---

## 🛠 Manual Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/aaryandhabale2/AI-Based-Attendance-System-with-Face-And-Voice-Recognization.git
cd "AI Based Attendace System"
```

### 2. Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env
```
*(The defaults are preconfigured for local offline demonstration!)*

### 3. Setup Python Backend
```bash
# Create and activate virtual environment (optional but recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install Python requirements
pip install -r backend/requirements.txt

# Populate realistic seed data (35 students, 8 weeks of historical records, faculty account)
python -m backend.seed
```

### 4. Setup React Frontend
```bash
cd frontend
npm install
cd ..
```

### 5. Launch Servers
**Terminal 1 — Backend:**
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in Chrome, Edge, or Firefox.

---

## 🔑 Faculty Default Credentials

| Portal | URL | Username | Password | Role |
|---|---|---|---|---|
| **Faculty Login** | `http://localhost:5173/login` | `admin` | `admin123` | Head Faculty / Administrator |
| **Student Kiosk** | `http://localhost:5173/attendance` | *(Public)* | *(Public)* | Live Attendance Kiosk |
| **FastAPI Swagger** | `http://localhost:8000/docs` | — | — | Interactive API Docs |

---

## 🎓 Teacher Live Demo Script (5-Minute Walkthrough)

Follow this exact sequence when demonstrating your major project to your college professor or external evaluator:

### Minute 1: System Overview & Architecture
1. Open the browser at `http://localhost:5173/login`.
2. Explain the core motivation: traditional RFID cards suffer from proxy punching, and single-biometric systems can be easily spoofed using a static photo.
3. Highlight your solution: **True Two-Factor Multimodal Biometrics** combining **ArcFace Face Embeddings** + **ECAPA-TDNN Voiceprints**.

### Minute 2: Faculty Analytics Dashboard & Defaulter Detection
1. Log in using `admin` / `admin123`.
2. Show the **Executive Dashboard**:
   - Point to the **35 Enrolled Students** and **3,850 Historical Attendance Records**.
   - Show the 8-Week Attendance Trend Graph and status distribution.
3. Scroll to the **Defaulter List (< 75% Attendance)**:
   - Point out students highlighted in **red badges** (e.g. 52%, 61%).
   - Click **"Send Defaulter SMS"**: demonstrate how the automated alert system triggers warning notices to the student's parents.
   - Click **"Export CSV"** to demonstrate instant Excel report generation.

### Minute 3: Live Student Enrollment
1. Click **"Enroll New Student"** in the navigation bar (`/enroll`).
2. Fill out test details:
   - Name: `Demo Student`
   - Roll No: `CS2026-99`
   - Class: `CS-A`
   - Parent Phone: `+91 9876543210`
3. Click **"Capture Face"** — show how the webcam snapshot is acquired and processed.
4. Click **"Record Voice Sample (4s)"** — speak clearly into the microphone.
5. Click **"Complete Biometric Enrollment"** — confirm that the model extracts 512-d + 192-d vectors and registers the student.

### Minute 4: Live Two-Factor Attendance Marking
1. Navigate to the public kiosk page at `http://localhost:5173/attendance`.
2. Point out that no credentials are required for students.
3. Step in front of the camera:
   - Click **"Mark Attendance (2FA)"**.
   - Read aloud the displayed anti-replay verification phrase.
   - Show how the backend runs cosine similarity on both modalities simultaneously.
4. Watch the result card appear:
   - **Face Confidence Score** (e.g., `87%` - Green).
   - **Voice Confidence Score** (e.g., `81%` - Green).
   - **Combined Status: PRESENT**.
   - The student's name immediately appears in **Today's Verified Present List**.

### Minute 5: Anti-Spoofing & Spoof Denial Demonstration
1. Demonstrate a simulated fraud attempt: have an unregistered person step in front of the camera, or play an unmatched voice sample.
2. Show how the system flags the attempt as **DENIED / FLAGGED**, records the failure in the audit log, and notifies the supervisor.
3. Conclude by highlighting the **FastAPI OpenAPI docs** at `http://localhost:8000/docs`.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate faculty & issue JWT token | No |
| `GET` | `/api/auth/me` | Fetch active faculty profile | Bearer JWT |
| `POST` | `/api/enrollment/enroll` | Register student with face image + voice audio | Bearer JWT |
| `GET` | `/api/enrollment/students` | List all enrolled students with search & filter | Bearer JWT |
| `POST` | `/api/attendance/mark` | Verify face + voice multipart data and record attendance | Public |
| `GET` | `/api/attendance/today` | Fetch list of students marked present today | Public |
| `GET` | `/api/dashboard/stats` | Aggregate metrics (totals, attendance %, defaulters) | Bearer JWT |
| `GET` | `/api/dashboard/charts` | Weekly attendance timeline & status distribution | Bearer JWT |
| `GET` | `/api/dashboard/export` | Download complete attendance report in CSV format | Bearer JWT |
| `POST` | `/api/alerts/send` | Trigger SMS alert to parent | Bearer JWT |
| `POST` | `/api/alerts/send-defaulters` | Bulk alert all students with attendance < 75% | Bearer JWT |
| `GET` | `/api/alerts/history` | Audit log of dispatched SMS alerts | Bearer JWT |

---

## ⚙️ Configuration & Environment Variables

All settings can be customized in `.env`:

```ini
# Security
SECRET_KEY=attendai_secret_super_key_college_major_project_2026_secure
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Biometric Verification Thresholds
FACE_SIMILARITY_THRESHOLD=0.50     # Minimum ArcFace cosine score
VOICE_SIMILARITY_THRESHOLD=0.65    # Minimum ECAPA-TDNN cosine score
COMBINED_SIMILARITY_THRESHOLD=0.60 # Minimum fused multi-factor score
FACE_WEIGHT=0.60                   # Multiplier for face score
VOICE_WEIGHT=0.40                   # Multiplier for voice score

# Attendance Policy
DEFAULTER_THRESHOLD=75.0           # Attendance percentage cutoff

# SMS Notification Gateway
SMS_PROVIDER=mock                  # 'mock', 'fast2sms', or 'twilio'
FAST2SMS_API_KEY=your_key_here
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_FROM_NUMBER=+1234567890
```

---

## 📂 Project Structure

```
.
├── backend/
│   ├── config.py                 # Pydantic BaseSettings config
│   ├── database.py               # SQLite SQLAlchemy engine & session maker
│   ├── main.py                   # FastAPI application entry point & CORS
│   ├── scheduler.py              # APScheduler background tasks
│   ├── seed.py                   # Realistic seed generator (35 students, 8 weeks)
│   ├── requirements.txt          # Python dependencies
│   ├── models/                   # ORM Database Models
│   │   ├── student.py            # Student metadata & embedding vectors
│   │   ├── attendance.py         # 2FA Attendance records & scores
│   │   ├── faculty.py            # Admin user accounts with bcrypt
│   │   └── alert.py              # SMS notification audit logs
│   ├── routers/                  # API Endpoints
│   │   ├── auth.py               # JWT login & user state
│   │   ├── enrollment.py         # Multi-modal student registration
│   │   ├── attendance.py         # Live 2FA verification engine
│   │   ├── dashboard.py          # Summary analytics & CSV export
│   │   └── alerts.py             # Parent notification system
│   └── services/                 # AI / ML Logic
│       ├── face_service.py       # OpenCV face detection & ArcFace embeddings
│       ├── voice_service.py      # SpeechBrain / Resemblyzer voice embeddings
│       ├── attendance_service.py # Cosine similarity & decision fusion
│       ├── analytics_service.py  # Pandas aggregation for chart data
│       └── sms/                  # Pluggable SMS gateway providers
├── frontend/
│   ├── index.html                # Single Page App HTML container
│   ├── vite.config.js            # Vite build configuration with proxy
│   ├── package.json              # React dependencies (Lucide, Recharts, Axios)
│   └── src/
│       ├── App.jsx               # React Router & Protected Route switch
│       ├── index.css             # Custom Design System (glassmorphism & tokens)
│       ├── api/                  # Axios service modules
│       ├── context/              # AuthContext with token persistence
│       ├── components/           # Reusable Layout & Navigation
│       └── pages/
│           ├── Login.jsx         # Faculty authentication page
│           ├── Dashboard.jsx     # Analytics, charts, defaulters, export
│           ├── Enroll.jsx        # Webcam + audio student registration
│           └── TakeAttendance.jsx# Public 2FA verification kiosk
├── start.bat                     # Windows one-click launcher
├── start.sh                      # Linux / macOS launcher
├── .env.example                  # Environment configuration template
└── README.md                     # Comprehensive project documentation
```

---

## 👨‍💻 Author & Acknowledgments

- **Developer**: Aaryan Dhabale
- **Project**: College Major Project — AI-Based Attendance System with Face and Voice Recognition
- **Libraries**: Thanks to the developers of FastAPI, PyTorch, InsightFace, SpeechBrain, and React.
