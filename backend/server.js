import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT   = process.env.PORT || 5000;
const ML_URL = process.env.ML_URL || "http://localhost:5002";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const METHODS = [
  { abbr: "DFT",       full: "Density Function Theory" },
  { abbr: "Ab-initio", full: "Ab-initio" },
  { abbr: "COSMO-RS",  full: "Conductor-like Screening Model for Real Solvents" },
  { abbr: "MD",        full: "Molecular Dynamics" },
  { abbr: "MC",        full: "Monte Carlo" },
  { abbr: "QM/MM",     full: "Quantum Mechanics / Molecular Mechanics" },
];

const ACC_LABELS  = { 1:"Very Low", 2:"Low", 3:"Moderate", 4:"High", 5:"Very High" };
const COST_LABELS = { 1:"Very Low", 2:"Low", 3:"Moderate", 4:"High", 5:"Very High" };

// ── Domain Knowledge Grounding ─────────────────────────────────────────────
// Ini adalah zona keahlian tiap method, berdasarkan domain knowledge dari
// referensi yang dikumpulkan professor (CC_Tools_used_in_Engineering.xlsx).
// AI akan menggunakan ini sebagai landasan jawaban, bukan opini bebas.
const DOMAIN_KNOWLEDGE = `
COMPUTATIONAL CHEMISTRY METHOD SELECTION GUIDE
(Based on peer-reviewed literature in chemical & process engineering)

METHOD PROFILES:
- COSMO-RS (Conductor-like Screening Model for Real Solvents)
  → Best for: Thermodynamic screening, solvation, activity coefficients, solubility,
    phase equilibria, mixture selectivity, gas separation screening
  → Accuracy zone: Low–Medium (Level 1–3), Cost: Very Low–Low (Level 1–2)
  → Ideal when: Fast screening is needed, no high-precision required
  → Ref: Used extensively for ionic liquid screening, CO2/H2S absorption estimation

- MC (Monte Carlo)
  → Best for: Adsorption isotherms, porous media (MOFs/ZIFs), gas storage/separation,
    phase behavior of mixtures, competitive adsorption, statistical thermodynamics
  → Accuracy zone: Low–Medium (Level 2–3), Cost: Low–Medium (Level 2–3)
  → Ideal when: Statistical sampling of configurational space is needed
  → Ref: GCMC widely used for high-throughput MOF screening (H2, CO2, CH4 separations)

- DFT (Density Functional Theory)
  → Best for: Electronic structure, band gap, molecular geometry, bond length/angle,
    crystal structure, surface structure, catalytic activity, activation energy,
    reaction mechanism, electrochemical properties, battery materials
  → Accuracy zone: Medium–High (Level 3–4), Cost: Medium–High (Level 2–4)
  → Ideal when: Quantum-level accuracy needed without extreme cost
  → Ref: Most cited method in CC engineering literature; dominant in catalysis, materials

- QM/MM (Quantum Mechanics / Molecular Mechanics)
  → Best for: Enzyme reaction mechanisms, drug-protein binding, protein-ligand interaction,
    conformational changes, solvation free energy, reactions in biological environment,
    coupled transport-reaction in biochemical systems
  → Accuracy zone: High (Level 4), Cost: Medium–High (Level 3–4)
  → Ideal when: A quantum core embedded in a larger classical environment is needed
  → Ref: Standard for biomolecular systems, enzyme catalysis studies

- Ab-initio
  → Best for: Benchmark calculations, highest-accuracy electronic structure,
    transition states, bond breaking/formation, activation energy benchmarks
  → Accuracy zone: Very High (Level 5 only), Cost: High–Very High (Level 4–5)
  → Ideal when: No empirical approximations allowed; gold-standard accuracy required
  → Ref: Ab-initio MD for molten salt thermodynamics, cement hydration mechanisms

- MD (Molecular Dynamics)
  → Best for: Diffusivity, viscosity, thermal conductivity, membrane performance,
    conformational dynamics, ion transport, permeability, battery material dynamics
  → Accuracy zone: Low–Medium (Level 2–3), Cost: Medium (Level 2–3)
  → Ideal when: Time-evolution and transport properties are the focus

LEVEL SCALE (applies to both Accuracy and Cost):
  Level 1 = Very Low  (20%)  — rough estimate / seconds
  Level 2 = Low       (40%)  — semi-quantitative / minutes–hours
  Level 3 = Medium    (60%)  — quantitative, ok for design / hours
  Level 4 = High      (80%)  — publishable precision / days
  Level 5 = Very High (100%) — benchmark / days–weeks
`;

function toNum(code) {
  return parseInt(String(code).replace(/[A-Za-z]/g, ""));
}

async function getMLPrediction(property, subProperty, reqAcc, reqCost) {
  const resp = await fetch(`${ML_URL}/predict-best`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      property,
      subProperty,
      requiredAccuracy: toNum(reqAcc),
      requiredCost: toNum(reqCost),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `ML service error ${resp.status}`);
  }

  const data = await resp.json();

  return {
    available:   true,
    best_method: data.best_method,
    top3:        data.top3,
    all_methods: data.all_methods,
    reasoning:   "",
  };
}

async function getAIPrediction(property, subProperty, reqAcc, reqCost, mlTop3 = []) {
  const methodList  = METHODS.map(m => m.abbr).join(", ");
  const accLabel    = ACC_LABELS[toNum(reqAcc)]  || reqAcc;
  const costLabel   = COST_LABELS[toNum(reqCost)] || reqCost;

  // Sertakan hasil ML sebagai konteks tambahan untuk AI
  const mlContext = mlTop3.length > 0
    ? `\nML Model Suggestion (for your reference): ${mlTop3.map(m => m.method || m).join(", ")}`
    : "";

  // ── Prompt yang di-ground dengan domain knowledge ──────────────────────
  // AI tidak bebas beropini — dia harus mengacu pada domain knowledge
  // yang sama dengan dataset training, lalu validasi dengan literatur.
  const prompt = `You are an expert computational chemist acting as a scientific validator.

You have been given the following domain knowledge from peer-reviewed literature:

${DOMAIN_KNOWLEDGE}

A researcher has submitted this query:
- Property: ${property}
- Sub-property: ${subProperty}
- Required Accuracy: ${reqAcc} (${accLabel})
- Cost Budget: ${reqCost} (${costLabel})
${mlContext}

Your task:
1. Using the domain knowledge above as your PRIMARY reference, evaluate which methods
   are most appropriate for this specific combination of property, accuracy, and cost.
2. Your recommendation should be CONSISTENT with the domain knowledge provided.
3. If the ML model suggestion aligns with domain knowledge, affirm it with reasoning.
4. If there is a discrepancy, explain briefly why the domain knowledge supports a different choice.

Available methods: ${methodList}

Return ONLY valid JSON, no markdown, no extra text:
{
  "scores": {
    "DFT":       {"accuracy": "A4", "cost": "C4"},
    "Ab-initio": {"accuracy": "A5", "cost": "C5"},
    "COSMO-RS":  {"accuracy": "A2", "cost": "C1"},
    "MD":        {"accuracy": "A3", "cost": "C3"},
    "MC":        {"accuracy": "A3", "cost": "C3"},
    "QM/MM":     {"accuracy": "A4", "cost": "C4"}
  },
  "top3": ["method1", "method2", "method3"],
  "best": "methodName",
  "reasoning": "2-3 sentences explaining why this method fits this property/accuracy/cost combination, referencing the domain knowledge"
}`;

  const completion = await groq.chat.completions.create({
    model:       "llama-3.1-8b-instant",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.1, // turunkan dari 0.2 → 0.1 biar lebih konsisten & grounded
  });

  const raw = completion.choices[0]?.message?.content || "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in AI response");

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error("AI JSON parse failed: " + e.message);
  }

  const rn  = toNum(reqAcc);
  const rcn = toNum(reqCost);

  const all_methods = METHODS.map(m => {
    const s   = parsed.scores?.[m.abbr] || {};
    const acc = s.accuracy || "A3";
    const cst = s.cost     || "C3";
    const an  = toNum(acc);
    const cn  = toNum(cst);
    const score =
      (an >= rn  ? an * 2         : an) +
      (cn <= rcn ? (6 - cn) * 1.5 : (6 - cn));
    return {
      method:    m.abbr,
      fullName:  m.full,
      accuracy:  acc,
      cost:      cst,
      accLabel:  ACC_LABELS[an],
      costLabel: COST_LABELS[cn],
      score:     Number(score.toFixed(2)),
    };
  }).sort((a, b) => b.score - a.score);

  all_methods.forEach((m, i) => (m.rank = i + 1));

  const top3Names = (parsed.top3 || []).slice(0, 3);
  const top3 = top3Names
    .map(name => all_methods.find(m => m.method === name))
    .filter(Boolean);
  const top3Final = top3.length ? top3 : all_methods.slice(0, 3);

  return {
    available:   true,
    best_method: parsed.best || all_methods[0].method,
    top3:        top3Final,
    all_methods,
    reasoning:   parsed.reasoning || "",
  };
}

function buildComparison(mlResult, aiResult) {
  const mlOk = mlResult?.available;
  const aiOk = aiResult?.available;
  if (!mlOk && !aiOk) return null;

  const mlBest = mlResult?.best_method || "";
  const aiBest = aiResult?.best_method || "";
  const mlTop3 = (mlResult?.top3 || []).map(m => m.method || m);
  const aiTop3 = (aiResult?.top3 || []).map(m => m.method || m);
  const agree  = mlOk && aiOk && mlBest === aiBest;
  const overlap = mlTop3.filter(m => aiTop3.includes(m));

  const agreementColor =
    !mlOk || !aiOk      ? "amber" :
    agree               ? "green" :
    overlap.length >= 2 ? "amber" : "red";

  const agreementLevel =
    !mlOk || !aiOk      ? "Partial Results (one service unavailable)" :
    agree               ? "Strong Agreement — Both models agree on the best method" :
    overlap.length >= 2 ? "Moderate Agreement — Similar top candidates" :
                          "Low Agreement — Models suggest different approaches";

  const allMethods = ["DFT","Ab-initio","COSMO-RS","MD","MC","QM/MM"];
  const methodDiffs = allMethods.map(method => {
    const mlRank   = mlOk ? (mlResult.all_methods?.find(m => m.method === method)?.rank ?? 99) : null;
    const aiRank   = aiOk ? (aiResult.all_methods?.find(m => m.method === method)?.rank ?? 99) : null;
    const mlInTop3 = mlTop3.includes(method);
    const aiInTop3 = aiTop3.includes(method);
    return {
      method, mlRank, aiRank,
      rankDiff: mlRank !== null && aiRank !== null ? Math.abs(mlRank - aiRank) : null,
      mlInTop3, aiInTop3,
      both: mlInTop3 && aiInTop3,
    };
  });

  return {
    agree, agreementLevel, agreementColor,
    mlBest, aiBest, mlTop3, aiTop3,
    overlapCount: overlap.length,
    top3Overlap: overlap,
    methodDiffs,
  };
}

app.get("/", (_req, res) => res.json({ status: "Backend jalan 🚀" }));

app.get("/ml-status", async (_req, res) => {
  try {
    const r = await fetch(`${ML_URL}/`);
    const d = await r.json();
    res.json({ online: true, ...d });
  } catch {
    res.json({ online: false });
  }
});

app.post("/evaluate", async (req, res) => {
  const { property, subProperty, requiredAccuracy, requiredCost } = req.body;
  if (!property || !subProperty || !requiredAccuracy || !requiredCost)
    return res.status(400).json({ error: "Missing fields" });

  // Jalankan ML dulu, lalu kirim hasilnya ke AI sebagai konteks tambahan
  const mlSettled = await Promise.allSettled([
    getMLPrediction(property, subProperty, requiredAccuracy, requiredCost),
  ]);

  const mlResult = mlSettled[0].status === "fulfilled"
    ? mlSettled[0].value
    : { available: false, error: mlSettled[0].reason?.message || "ML service offline" };

  // Kirim ML top3 ke AI sebagai referensi tambahan
  const mlTop3ForAI = mlResult.available ? (mlResult.top3 || []) : [];

  const aiSettled = await Promise.allSettled([
    getAIPrediction(property, subProperty, requiredAccuracy, requiredCost, mlTop3ForAI),
  ]);

  const aiResult = aiSettled[0].status === "fulfilled"
    ? aiSettled[0].value
    : { available: false, error: aiSettled[0].reason?.message || "AI unavailable" };

  res.json({
    ml:         mlResult,
    ai:         aiResult,
    comparison: buildComparison(mlResult, aiResult),
  });
});

app.listen(PORT, () => console.log(`✅ Backend running → http://localhost:${PORT}`));
