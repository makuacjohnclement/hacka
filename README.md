# SmartAid: Intelligent Emergency Response System 🛰️

SmartAid is an advanced, AI-driven emergency command center designed to optimize incident dispatching and tracking. It bridges the gap between citizen reporting and emergency resource management through real-time mapping and a self-evolving decision engine.

---

## 🧠 System Architecture

SmartAid is split into a high-performance Python backend and a reactive modern frontend.

### 1. Backend (FastAPI & Vertex AI)
The core logic resides in a **FastAPI** server that manages data flow and AI predictions.
* **Decision Engine:** Uses **Google Vertex AI** to evaluate incident severity and urgency. It calculates the optimal resource (Ambulance, Fire Truck, Police, or Helicopter) based on real-time ETAs.
* **Learning Engine:** Implements a continuous learning loop. Every 5 resolved cases, the system auto-adjusts its internal `weights.json` to prioritize parameters that lead to faster response times.
* **Data Layer:** Uses **Firebase Firestore** for real-time persistence with a local JSON fallback for offline reliability.

### 2. Frontend (React & Vite)
A professional "Command Center" dashboard built for speed and clarity.
* **Live Mapping:** Integrated with **Leaflet.js** to track unit coordinates and incident locations visually.
* **Dispatcher Queue:** A real-time interface for admins to review and approve citizen-reported tickets.
* **Analytics:** Generates comprehensive PDF and Excel activity logs using Pandas and ReportLab.

---

## 🚀 Core Workflows

### A. Citizen Reporting
1. A user submits an emergency via the **User Portal**.
2. The system creates a `pending` ticket and runs an initial AI prediction.
3. The incident appears instantly in the Dispatcher's queue.

### B. Admin Dispatch & AI Logic
1. The Dispatcher reviews the ticket. 
2. The **Decision Engine** identifies the best available unit.
3. The **Dispatch Service** applies safety rules (e.g., automatically sending an ambulance to a high-level fire).
4. The unit is marked as `busy` and tracked live on the map.

### C. Resolution & Feedback Loop
1. Once an incident is resolved, response data is logged.
2. The **Learning Engine** analyzes the batch performance.
3. Mathematical weights are updated to favor the most successful response patterns.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Python, FastAPI |
| **Frontend** | React, Vite, Tailwind CSS |
| **AI/ML** | Google Vertex AI, Custom Learning Engine |
| **Database** | Firebase Firestore |
| **Mapping** | Leaflet / React-Leaflet |
| **Reporting** | Pandas, ReportLab |

---

## ⚙️ Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/makuacjohnclement/hacka.git](https://github.com/makuacjohnclement/hacka.git)
   cd hacka