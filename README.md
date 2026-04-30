# CC Tool Evaluation System v3.0 — Hybrid ML + AI

## HOW TO RUN (3 terminals, in order)

### Terminal 1 — Python ML Service (run FIRST)
```
cd backend
pip install flask flask-cors scikit-learn pandas numpy
python ml_service.py
```
→ http://localhost:5001

### Terminal 2 — Node.js Backend
```
cd backend
npm install
node server.js
```
→ http://localhost:5000

### Terminal 3 — Frontend
```
cd frontend
npm install
npm run dev
```
→ http://localhost:5173

---

## ARCHITECTURE
Browser → Node.js (5000) → [1st] Python ML Model (5001) → [fallback] Groq AI

## ML MODEL
- Algorithm: Gradient Boosting Regressor
- Training: 184 samples (8 methods × 23 sub-properties)
- Source: CC_Tools_used_in_Engineering.xlsx + domain knowledge
- Within ±1 step accuracy: 100% on training data
- Gas separation selectivity: MC=A5/C2, MD=A4/C3, Rex MD=A4/C4

## TROUBLESHOOTING
- Port 5000 busy: taskkill /IM node.exe /F
- Port 5001 busy: close previous Python terminal
- pip errors: pip install flask flask-cors scikit-learn pandas numpy
 
