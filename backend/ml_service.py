"""
ML Microservice — CC Tool Recommendation System
Engine 1: XGBoost Multi-Output Regressor
Run: python ml_service.py  →  http://localhost:5002
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, numpy as np, os
import pandas as pd  # <--- PERBAIKAN 1: Tambahkan pandas

app = Flask(__name__)
CORS(app)

BASE      = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE, "ml_model")

# ── Load model XGBoost & encoders terbaru ────────────────────────────────────
model      = joblib.load(os.path.join(MODEL_DIR, "xgb_regressor.pkl"))
le_prop    = joblib.load(os.path.join(MODEL_DIR, "le_property.pkl"))
le_sub     = joblib.load(os.path.join(MODEL_DIR, "le_subproperty.pkl"))
le_method  = joblib.load(os.path.join(MODEL_DIR, "le_method.pkl"))

print("✅ Loaded Model: XGBoost Multi-Output Regressor")

# ReaxFF dan Docking sudah dihapus dari kamus aplikasi
# Pastikan HANYA 6 ini saja:
METHODS = [
    {"abbr": "DFT",       "full": "Density Function Theory"},
    {"abbr": "Ab-initio", "full": "Ab-initio"},
    {"abbr": "COSMO-RS",  "full": "Conductor-like Screening Model for Real Solvents"},
    {"abbr": "MD",        "full": "Molecular Dynamics"},
    {"abbr": "MC",        "full": "Monte Carlo"},
    {"abbr": "QM/MM",     "full": "Quantum Mechanics / Molecular Mechanics"}
]

@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "ML Service running (XGBoost Engine)",
        "known_methods": le_method.classes_.tolist()
    })

@app.route("/predict-best", methods=["POST"])
def predict_best():
    body         = request.get_json()
    prop_name    = body.get("property", "")
    sub_name     = body.get("subProperty", "")
    req_acc      = int(body.get("requiredAccuracy", 3)) # Web mengirim 1-5
    req_cost     = int(body.get("requiredCost", 3))     # Web mengirim 1-5

    if prop_name not in le_prop.classes_ or sub_name not in le_sub.classes_:
        return jsonify({"error": "Unknown property or sub-property", "known": False}), 404

    # 🌟 PERBAIKAN UTAMA: Konversi 1-5 menjadi Persentase (20-100)
    LEVEL_TO_PCT = {1: 20, 2: 40, 3: 60, 4: 80, 5: 100}
    req_acc_pct  = LEVEL_TO_PCT.get(req_acc, 60)
    req_cost_pct = LEVEL_TO_PCT.get(req_cost, 60)

    # Encode input teks menjadi angka
    p_enc = int(le_prop.transform([prop_name])[0])
    s_enc = int(le_sub.transform([sub_name])[0])
    
    # 🌟 PERBAIKAN KEDUA: Gunakan nama kolom f0, f1, f2, f3 dan masukkan nilai persentase
    feat = pd.DataFrame(
        [[p_enc, s_enc, req_acc_pct, req_cost_pct]],
        columns=["f0", "f1", "f2", "f3"]
    )

    # Prediksi menggunakan XGBoost Regressor
    scores = model.predict(feat)[0] 

    ranked = []
    # Pasangkan skor dengan nama metode
    for i, score in enumerate(scores):
        method_name = le_method.inverse_transform([i])[0]
        full_name   = next((m["full"] for m in METHODS if m["abbr"] == method_name), method_name)
        
        # Batasi skor agar tidak lebih dari 100% atau kurang dari 0%
        confidence = max(0.0, min(1.0, float(score))) 
        
        ranked.append({
            "method":     method_name,
            "fullName":   full_name,
            "confidence": round(confidence, 4),
            "conf_pct":   round(confidence * 100, 1)
        })

    # Urutkan dari skor tertinggi (Top 1) ke terendah
    ranked.sort(key=lambda x: x["confidence"], reverse=True)
    
    # Berikan label rank dan tandai yang terbaik
    for i, r in enumerate(ranked):
        r["rank"] = i + 1
        r["is_best"] = (i == 0)

    best_method = ranked[0]

    return jsonify({
        "property":        prop_name,
        "subProperty":     sub_name,
        "requiredAccuracy": req_acc,
        "requiredCost":    req_cost,
        "best_method":     best_method["method"],
        "best_full":       best_method["fullName"],
        "best_confidence": best_method["conf_pct"],
        "all_methods":     ranked,
        "top3":            ranked[:3],
        "known":           True
    })

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5002))
    print(f"🤖 XGBoost ML Service → http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)