# German B1 Exam Prep Web Application (Deutsch B1 Prüfungstrainer)

An interactive, responsive web application designed for Goethe-Zertifikat B1 and telc Deutsch B1 exam candidates. It dynamically generates multiple-choice questions with German explanations and tips using Google Gemini with structured JSON schema output, deployed serverlessly on Vercel.

---

## Features

- **Curated B1 Syllabus**:
  - **Grammatik**: Konjunktiv II, Passiv, Relativsätze, Nebensätze mit Konjunktionen, Verben mit Präpositionen, Adjektivdeklination, Zweiteilige Konnektoren, Infinitiv mit zu, Modalverben, N-Deklination.
  - **Themen & Wortschatz**: Beruf & Arbeitswelt, Wohnen & Nachbarschaft, Gesundheit & Ernährung, Reisen & Verkehr, Medien & Konsum.
- **Dual Study Modes**:
  1. **Interactive Practice (Interaktives Üben)**: Immediate pedagogical feedback (color-coded green/red) and explanations in German after answering each question.
  2. **Exam Simulation (Prüfungssimulation)**: Sequential 5-question test simulating real exam conditions, followed by a scored report and full review breakdown.
- **Dynamic AI Question Generation**: Connects to Google Gemini via a secure serverless API proxy (`/api/generate.js`) protecting `GEMINI_API_KEY`.
- **Responsive & Accessible UI**: Clean vanilla HTML5/CSS3/JavaScript interface with mobile and desktop support.

---

## Project Structure

```
german-b1/
├── api/
│   └── generate.js         # Vercel serverless function (Gemini backend proxy)
├── public/
│   ├── index.html          # Web application UI
│   ├── style.css           # Modern, responsive styles & feedback animations
│   └── app.js              # State machine, quiz engine, API client & UI renderer
├── dev-server.js           # Local development server
├── test.js                 # Automated contract & component test suite
├── vercel.json             # Vercel serverless and static routing configuration
├── generate.js             # CLI generation sample
└── package.json            # Node.js configuration & dependencies
```

---

## Local Development & Testing

### 1. Prerequisites
- Node.js 18+ installed
- A Google Gemini API key (`GEMINI_API_KEY`)

### 2. Environment Setup
Export your Gemini API key in your terminal session:
```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

### 3. Run the Development Server
```bash
npm start
```
Open your browser at `http://localhost:3000`.

### 4. Run the Test Suite
```bash
npm test
```

---

## Deployment to Vercel

1. **Push your code to GitHub / GitLab / Bitbucket**.
2. **Import the repository into Vercel**.
3. **Set the Environment Variable** in your Vercel Project Settings:
   - `GEMINI_API_KEY`: Your Gemini API Key.
4. **Deploy**: Vercel automatically deploys the static files in `public/` and the serverless proxy in `api/generate.js`.
