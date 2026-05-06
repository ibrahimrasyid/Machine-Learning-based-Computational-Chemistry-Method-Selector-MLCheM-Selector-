# 🧪 CC Tool Evaluation System
### Computational Chemistry Method Decision Support System
> Hybrid ML + AI — XGBoost Multi-Output Regressor × LLaMA 3.1 8B (Groq)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-FF6600?style=for-the-badge)

---

## 🌐 Live Demo

> **Just want to try it? No installation needed!**

🔗 **[https://cc-tool-upgrade.vercel.app](https://cc-tool-upgrade.vercel.app)**

---

## 📖 What is This?

**CC Tool Evaluation System** helps researchers and engineers select the most suitable computational chemistry method for their study. Simply input your target property, required accuracy, and cost budget — the system will recommend the best method using two engines running in parallel:

1. 🤖 **XGBoost ML Model** — data-driven prediction trained on 184 samples
2. 🧠 **LLaMA 3.1 8B via Groq** — AI validation grounded in peer-reviewed literature

### Supported Methods

| Method | Full Name |
|--------|-----------|
| DFT | Density Functional Theory |
| Ab-initio | Ab-initio |
| COSMO-RS | Conductor-like Screening Model for Real Solvents |
| MD | Molecular Dynamics |
| MC | Monte Carlo |
| QM/MM | Quantum Mechanics / Molecular Mechanics |

---

## 🚀 Run Locally — Step by Step

### What You Need First

Make sure these are installed on your computer:

| Tool | Download Link | Check if installed |
|------|--------------|-------------------|
| Python 3.8+ | [python.org](https://python.org) | `python --version` |
| Node.js 18+ | [nodejs.org](https://nodejs.org) | `node --version` |
| Git | [git-scm.com](https://git-scm.com) | `git --version` |

---

### Step 1 — Clone the Repository

Open your terminal (CMD / PowerShell / Terminal) and run:

```bash
git clone https://github.com/ibrahimrasyid/cc-tool-upgrade.git
cd cc-tool-upgrade
```

---

### Step 2 — Get Your Free Groq API Key

This project uses **Groq API** to run the LLaMA 3.1 8B AI model for free.

1. Go to [console.groq.com](https://console.groq.com) and create a free account
2. Navigate to **API Keys** in the sidebar
3. Click **"Create API Key"**
4. Copy your key — it looks like: `gsk_xxxxxxxxxxxxxxxxxxxx`

> 🔒 Keep your API key private. Never share it or upload it to GitHub.

---

### Step 3 — Create Your `.env` File

Navigate to the `backend/` folder and create a file named **`.env`**.

Using any text editor, create a new file called `.env` inside the `backend/` folder and paste:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

> ⚠️ Replace `gsk_xxxxxxxxxxxxxxxxxxxx` with your actual Groq API key from Step 2.

After this, your `backend/` folder should look like:

```
backend/
├── ml_model/
├── .env              ← the file you just created ✅
├── ml_service.py
├── package.json
├── requirements.txt
└── server.js
```

---

### Step 4 — Start the Application (3 Terminals)

You need to open **3 separate terminal windows** and run each in order.

---

#### 🐍 Terminal 1 — Python ML Service *(Run this FIRST)*

```bash
cd backend
pip install -r requirements.txt
python ml_service.py
```

✅ Success message: `🤖 XGBoost ML Service → http://localhost:5002`

---

#### 🟢 Terminal 2 — Node.js Backend *(Run this SECOND)*

```bash
cd backend
npm install
node server.js
```

✅ Success message: `✅ Backend running → http://localhost:5000`

---

#### ⚛️ Terminal 3 — React Frontend *(Run this LAST)*

```bash
cd frontend
npm install
npm run dev
```

✅ Success message: `Local: http://localhost:5173`

---

### Step 5 — Open the App

Open your browser and go to:

🔗 **[http://localhost:5173](http://localhost:5173)**

---

## 🎯 How to Use

1. **Select a Property** — choose the chemical/physical property you want to study
2. **Select a Sub-property** — pick the specific sub-property
3. **Set Accuracy Level** — from A1 (Very Low) to A5 (Very High)
4. **Set Cost Budget** — from C1 (Very Low) to C5 (Very High)
5. **Click Evaluate** — the system will return:
   - ✅ Best recommended method
   - 📊 Confidence scores for all 6 methods
   - 🤖 ML Model ranking
   - 🧠 AI reasoning and validation

---

## 🏗️ Architecture

```
Browser (React · port 5173)
         ↓
Node.js Backend (Express · port 5000)
    ↙               ↘
Python ML           Groq AI API
(Flask · 5002)      (LLaMA 3.1 8B)
    ↘               ↙
     Combined Result
     + Side-by-side Comparison
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Port 5000 already in use` | Run: `taskkill /IM node.exe /F` (Windows) or `lsof -ti:5000 \| xargs kill` (Mac/Linux) |
| `Port 5002 already in use` | Close the previous Python terminal |
| `pip install` fails | Try: `pip install flask flask-cors scikit-learn pandas numpy xgboost joblib` |
| `GROQ_API_KEY` error | Make sure `.env` file exists inside `backend/` folder with correct key |
| ML model not found | Make sure `backend/ml_model/` folder contains all `.pkl` files |
| CORS error in browser | Make sure all 3 services are running (ports 5000, 5002, 5173) |
| AI returns no result | Check your Groq API key is valid at [console.groq.com](https://console.groq.com) |

---

## 📁 Project Structure

```
cc-tool-upgrade/
├── backend/
│   ├── ml_model/               # Trained XGBoost model files
│   │   ├── xgb_regressor.pkl
│   │   ├── le_property.pkl
│   │   ├── le_subproperty.pkl
│   │   └── le_method.pkl
│   ├── .env                    # ⚠️ Create this yourself (see Step 3)
│   ├── ml_service.py           # Flask ML microservice
│   ├── server.js               # Express backend + Groq integration
│   ├── package.json
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   └── App.jsx             # Main React application
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 🤖 ML Model Details

| Info | Details |
|------|---------|
| Algorithm | XGBoost Multi-Output Regressor |
| Training Samples | 184 (6 methods × ~30 sub-properties) |
| Input Features | Property, Sub-property, Accuracy Level, Cost Level |
| Output | Confidence score per method (0–100%) |
| Accuracy | Within ±1 step: 100% on training data |
| Data Source | CC_Tools_used_in_Engineering.xlsx + domain knowledge |

---

## 📄 License

MIT License — free to use for academic and research purposes.

---

## 👤 Author

**Ibrahim Rasyid**
President University · MIT-2024 Artificial Intelligence

---

> 💡 **Quick tip:** If you just want to explore the system without setting anything up, use the live demo at [cc-tool-upgrade.vercel.app](https://cc-tool-upgrade.vercel.app)
