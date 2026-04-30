import { useState } from "react";
import axios from "axios";

// ── Data from Excel ───────────────────────────────────────────────────────────
const PROPERTIES = {
  "THERMODYNAMIC PROPERTIES": ["Gibbs free energy","Enthalpy","Entropy","Heat capacity","Solubility","Phase equilibria","Henry's constant","Activity coefficient","Fugacity / chemical potential","Free energy of mixing","Solvation free energy"],
  "KINETIC & REACTION PROPERTIES": ["Reaction mechanism","Activation energy","Transition state","Reaction rate constant","Reaction pathway","Catalytic activity","Bond breaking/formation"],
  "TRANSPORT PROPERTIES": ["Diffusivity","Permeability","Viscosity","Thermal conductivity","Mass transfer coefficient","Ionic conductivity"],
  "STRUCTURAL & ELECTRONIC PROPERTIES": ["Molecular geometry","Bond length/angle","Electronic structure","Band gap","Density of states","Charge distribution","Surface structure","Crystal structure","Lattice parameters"],
  "MOLECULAR INTERACTION PROPERTIES": ["Binding energy","Adsorption energy","Intermolecular forces","Hydrogen bonding","Van der Waals interactions","Electrostatic interactions","Solute–solvent interaction"],
  "ADSORPTION & POROUS MEDIA PROPERTIES": ["Adsorption isotherms","Adsorption capacity","Adsorption selectivity","Competitive adsorption","Pore filling behavior","Surface coverage"],
  "MULTICOMPONENT & PROCESS-LEVEL PROPERTIES": ["Mixture selectivity","Phase behavior of mixtures","Process thermodynamics","Scale-up prediction","Coupled transport–reaction"],
  "ENERGY & ENVIRONMENTAL PROPERTIES": ["Gas separation selectivity","CO₂ absorption capacity","H₂S removal efficiency","Membrane performance","Electrochemical properties","Battery material properties"],
};

const ACC_SCALE  = [{code:"A1",label:"Very Low"},{code:"A2",label:"Low"},{code:"A3",label:"Moderate"},{code:"A4",label:"High"},{code:"A5",label:"Very High"}];
const COST_SCALE = [{code:"C1",label:"Very Low"},{code:"C2",label:"Low"},{code:"C3",label:"Moderate"},{code:"C4",label:"High"},{code:"C5",label:"Very High"}];
const ACC_COLORS  = {A1:"#ef4444",A2:"#f97316",A3:"#eab308",A4:"#22c55e",A5:"#16a34a"};
const COST_COLORS = {C1:"#16a34a",C2:"#22c55e",C3:"#eab308",C4:"#f97316",C5:"#ef4444"};
const MEDALS = ["🥇","🥈","🥉"];

function Badge({ code, type }) {
  const color = type==="acc" ? ACC_COLORS[code] : COST_COLORS[code];
  return (
    <span style={{background:`${color}22`,color,border:`1px solid ${color}55`,borderRadius:6,
      padding:"2px 10px",fontSize:12,fontWeight:700,fontFamily:"monospace",letterSpacing:1}}>
      {code}
    </span>
  );
}

function ConfBar({ value, label, color="#38bdf8" }) {
  const pct = Math.round((value||0)*100);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
      <span style={{fontSize:10,color:"#64748b",width:90,flexShrink:0}}>{label}</span>
      <div style={{flex:1,background:"#1e2937",borderRadius:4,height:5}}>
        <div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:color,transition:"width 0.6s ease"}}/>
      </div>
      <span style={{fontSize:11,color,fontWeight:700,width:34,textAlign:"right"}}>{pct}%</span>
    </div>
  );
}

// ── Agreement Banner ──────────────────────────────────────────────────────────
function AgreementBanner({ comparison }) {
  if (!comparison) return null;
  const { agreementLevel, agreementColor, agree, mlBest, aiBest, overlapCount, top3Overlap } = comparison;
  const colors = {
    green: { bg:"#0f2a1e", border:"#22c55e55", text:"#22c55e", badge:"#14532d" },
    amber: { bg:"#1c1800", border:"#eab30855", text:"#eab308", badge:"#78350f" },
    red:   { bg:"#1f0a0a", border:"#ef444455", text:"#ef4444", badge:"#7f1d1d" },
  };
  const c = colors[agreementColor] || colors.amber;
  return (
    <div style={{
      background:c.bg, border:`1px solid ${c.border}`,
      borderRadius:14, padding:"20px 28px", marginBottom:24,
      display:"flex", alignItems:"center", gap:20, flexWrap:"wrap",
    }}>
      <div style={{fontSize:32}}>
        {agreementColor==="green"?"✅": agreementColor==="amber"?"⚠️":"🔀"}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:16,fontWeight:800,color:c.text,marginBottom:6}}>
          {agreementLevel}
        </div>
        <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
          {agree ? (
            <>Both models agree: <strong style={{color:"#f0f9ff"}}>{mlBest}</strong> is the best method.</>
          ) : (
            <>ML recommends <strong style={{color:"#38bdf8"}}>{mlBest}</strong> · AI recommends <strong style={{color:"#a78bfa"}}>{aiBest}</strong></>
          )}
          {" "}Top-3 overlap: <strong style={{color:c.text}}>{overlapCount}/3 methods</strong>
          {top3Overlap.length > 0 && <> ({top3Overlap.join(", ")})</>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
        <div style={{fontSize:11,color:"#64748b"}}>BEST METHOD</div>
        <div style={{display:"flex",gap:8}}>
          <span style={{padding:"4px 12px",borderRadius:6,background:"#0ea5e920",color:"#38bdf8",border:"1px solid #0ea5e940",fontSize:12,fontWeight:700}}>
            ML: {mlBest}
          </span>
          <span style={{padding:"4px 12px",borderRadius:6,background:"#7c3aed20",color:"#a78bfa",border:"1px solid #7c3aed40",fontSize:12,fontWeight:700}}>
            AI: {aiBest}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Side-by-side Top 3 panel ──────────────────────────────────────────────────
function Top3Panel({ mlData, aiData, comparison }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

      {/* ML Top 3 */}
      <div>
        <div style={{
          display:"flex",alignItems:"center",gap:10,marginBottom:14,
          padding:"10px 16px",background:"#061422",borderRadius:10,
          border:"1px solid #0ea5e940",
        }}>
          <span style={{fontSize:18}}>🤖</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#38bdf8"}}>ML Model</div>
            <div style={{fontSize:10,color:"#64748b"}}> xgboost · your dataset</div>
          </div>
        </div>
        {mlData?.available ? (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {mlData.top3.map((item,i)=>{
              const inAiTop3 = comparison?.aiTop3?.includes(item.method);
              return (
                <div key={item.method} style={{
                  background: i===0 ? "linear-gradient(135deg,#0f2a1e,#0f1e35)" : "#0f1e35",
                  border: i===0 ? "1px solid #22c55e55" : "1px solid #1e3a5f",
                  borderRadius:12, padding:"16px 18px",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{fontSize:18}}>{MEDALS[i]}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:16,fontWeight:800,color:"#f0f9ff"}}>{item.method}</span>
                        {inAiTop3 && (
                          <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,
                            background:"#7c3aed22",color:"#a78bfa",border:"1px solid #7c3aed44"}}>
                            Also in AI top3
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{item.fullName}</div>
                    </div>
                  </div>
                  {item.conf_pct !== undefined && item.conf_pct !== null && (
                    <ConfBar value={item.conf_pct/100} label="Confidence" color="#38bdf8"/>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{padding:20,background:"#1f0a0a",borderRadius:12,border:"1px solid #ef444430",color:"#fca5a5",fontSize:13}}>
            ⚠ ML service offline: {mlData?.error}
          </div>
        )}
      </div>

      {/* AI Top 3 */}
      <div>
        <div style={{
          display:"flex",alignItems:"center",gap:10,marginBottom:14,
          padding:"10px 16px",background:"#100820",borderRadius:10,
          border:"1px solid #7c3aed40",
        }}>
          <span style={{fontSize:18}}>⚡</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#a78bfa"}}>Groq AI</div>
            <div style={{fontSize:10,color:"#64748b"}}>LLaMA 3.1 8B · scientific reasoning</div>
          </div>
        </div>
        {aiData?.available ? (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {aiData.top3.map((item,i)=>{
              const inMlTop3 = comparison?.mlTop3?.includes(item.method);
              return (
                <div key={item.method} style={{
                  background: i===0 ? "linear-gradient(135deg,#1a0a35,#0f1e35)" : "#0f1e35",
                  border: i===0 ? "1px solid #7c3aed55" : "1px solid #1e3a5f",
                  borderRadius:12, padding:"16px 18px",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{fontSize:18}}>{MEDALS[i]}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:16,fontWeight:800,color:"#f0f9ff"}}>{item.method}</span>
                        {inMlTop3 && (
                          <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,
                            background:"#0ea5e922",color:"#38bdf8",border:"1px solid #0ea5e944"}}>
                            Also in ML top3
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{item.fullName}</div>
                    </div>
                  </div>
                  {item.accuracy && (
                    <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:10,color:"#64748b"}}>ACC</span>
                        <Badge code={item.accuracy} type="acc"/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:10,color:"#64748b"}}>COST</span>
                        <Badge code={item.cost} type="cost"/>
                      </div>
                      <span style={{fontSize:11,color:"#38bdf8",fontWeight:700}}>Score: {item.score}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {aiData.reasoning && (
              <div style={{
                background:"#060e1a",border:"1px solid #1e3a5f",
                borderRadius:10,padding:"12px 16px",marginTop:4,
              }}>
                <div style={{fontSize:10,color:"#64748b",letterSpacing:1.5,marginBottom:6}}>AI REASONING</div>
                <p style={{fontSize:12,color:"#94a3b8",lineHeight:1.65,margin:0}}>{aiData.reasoning}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{padding:20,background:"#1f0a0a",borderRadius:12,border:"1px solid #ef444430",color:"#fca5a5",fontSize:13}}>
            ⚠ AI unavailable: {aiData?.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Full comparison table ─────────────────────────────────────────────────────
function CompareTable({ mlData, aiData, comparison }) {
  const methods = ["DFT","Ab-initio","COSMO-RS","MD","MC","QM/MM"];
  return (
    <div style={{background:"#0f1e35",border:"1px solid #1e3a5f",borderRadius:14,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr style={{background:"#0a1628",borderBottom:"1px solid #1e3a5f"}}>
            <th style={th}>Method</th>
            <th style={{...th,color:"#38bdf8"}}>🤖 ML Rank</th>
            <th style={{...th,color:"#38bdf8"}}>ML Confidence</th>
            <th style={{...th,color:"#a78bfa"}}>⚡ AI Rank</th>
            <th style={{...th,color:"#a78bfa"}}>AI Accuracy</th>
            <th style={{...th,color:"#a78bfa"}}>AI Cost</th>
            <th style={{...th,color:"#a78bfa"}}>AI Score</th>
            <th style={th}>Agreement</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m,i) => {
            const mlItem  = mlData?.available  ? mlData.all_methods.find(x=>x.method===m)  : null;
            const aiItem  = aiData?.available  ? aiData.all_methods.find(x=>x.method===m)  : null;
            const diff    = comparison?.methodDiffs?.find(x=>x.method===m);
            const bothTop = diff?.both;
            return (
              <tr key={m} style={{borderBottom:"1px solid #0f1e35",background:bothTop?"#0f2a1e22":i%2===0?"transparent":"#0a15250a"}}>
                <td style={{padding:"12px 14px",fontWeight:700,color:"#e2e8f0"}}>
                  {m}
                  {bothTop && <span style={{marginLeft:6,fontSize:9,padding:"1px 6px",borderRadius:3,background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44"}}>BOTH</span>}
                </td>
                {/* ML */}
                <td style={{padding:"12px 14px",color:"#38bdf8",fontWeight:700}}>
                  {mlItem ? (mlItem.rank <= 3 ? `${MEDALS[mlItem.rank-1]} #${mlItem.rank}` : `#${mlItem.rank}`) : "—"}
                </td>
                <td style={{padding:"12px 14px",color:"#64748b"}}>
                  {mlItem?.conf_pct != null ? `${mlItem.conf_pct.toFixed(1)}%` : "—"}
                </td>
                {/* AI */}
                <td style={{padding:"12px 14px",color:"#a78bfa",fontWeight:700}}>
                  {aiItem ? (aiItem.rank <= 3 ? `${MEDALS[aiItem.rank-1]} #${aiItem.rank}` : `#${aiItem.rank}`) : "—"}
                </td>
                <td style={{padding:"12px 14px"}}>
                  {aiItem?.accuracy ? <Badge code={aiItem.accuracy} type="acc"/> : "—"}
                </td>
                <td style={{padding:"12px 14px"}}>
                  {aiItem?.cost ? <Badge code={aiItem.cost} type="cost"/> : "—"}
                </td>
                <td style={{padding:"12px 14px",color:"#38bdf8",fontWeight:700}}>
                  {aiItem?.score ?? "—"}
                </td>
                {/* Agreement */}
                <td style={{padding:"12px 14px"}}>
                  {diff ? (
                    diff.both
                      ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#14532d22",color:"#34d399",border:"1px solid #34d39944"}}>✓ Both top3</span>
                      : diff.mlInTop3 && !diff.aiInTop3
                        ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#0ea5e922",color:"#38bdf8",border:"1px solid #0ea5e944"}}>ML only</span>
                        : !diff.mlInTop3 && diff.aiInTop3
                          ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#7c3aed22",color:"#a78bfa",border:"1px solid #7c3aed44"}}>AI only</span>
                          : <span style={{fontSize:11,color:"#64748b"}}>Rank diff: {diff.rankDiff}</span>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [property,    setProperty]    = useState("");
  const [subProperty, setSubProperty] = useState("");
  const [reqAcc,      setReqAcc]      = useState("");
  const [reqCost,     setReqCost]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [data,        setData]        = useState(null);
  const [error,       setError]       = useState("");
  const [activeTab,   setActiveTab]   = useState("compare");

  const subList = property ? PROPERTIES[property]||[] : [];

  const handleEvaluate = async () => {
    if (!property||!subProperty||!reqAcc||!reqCost) { setError("Please fill in all 4 input fields."); return; }
    setError(""); setLoading(true); setData(null);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/evaluate`,
        { property, subProperty, requiredAccuracy:reqAcc, requiredCost:reqCost });
      setData(res.data); setActiveTab("compare");
    } catch(e) {
      setError("Connection error. Make sure backend (port 5001) and ML service (port 5001) are running.");
    } finally { setLoading(false); }
  };

  const reset = () => { setProperty(""); setSubProperty(""); setReqAcc(""); setReqCost(""); setData(null); setError(""); };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0f1e 0%,#0d1b2a 50%,#0a1628 100%)",
      fontFamily:"'IBM Plex Mono','Courier New',monospace",color:"#e2e8f0",padding:"0 0 60px"}}>

      {/* Header */}
      <header style={{borderBottom:"1px solid #1e3a5f",padding:"18px 40px",display:"flex",alignItems:"center",gap:16,
        background:"rgba(10,20,40,0.85)",backdropFilter:"blur(10px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>⚗</div>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:"#f0f9ff"}}>CC Tool Evaluation System</div>
          <div style={{fontSize:10,color:"#64748b",letterSpacing:1.5,marginTop:2}}>ML MODEL vs AI — SIDE BY SIDE COMPARISON</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <span style={{fontSize:11,padding:"4px 12px",borderRadius:6,background:"#0ea5e920",color:"#38bdf8",border:"1px solid #0ea5e930"}}>🤖 ML Model</span>
          <span style={{fontSize:11,padding:"4px 12px",borderRadius:6,background:"#7c3aed20",color:"#a78bfa",border:"1px solid #7c3aed30"}}>⚡ Groq AI</span>
        </div>
      </header>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"36px 24px 0"}}>

        {/* Input Panel */}
        <div style={{background:"linear-gradient(145deg,#0f1e35,#0d1929)",border:"1px solid #1e3a5f",
          borderRadius:16,padding:32,marginBottom:28,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
          <div style={{fontSize:12,color:"#38bdf8",letterSpacing:2,marginBottom:20,fontWeight:600}}>◈ INPUT PARAMETERS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
            <div>
              <label style={lbl}>01 · Property</label>
              <select value={property} onChange={e=>{setProperty(e.target.value);setSubProperty("");}} style={sel}>
                <option value="">— Select property category —</option>
                {Object.keys(PROPERTIES).map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>02 · Sub-property</label>
              <select value={subProperty} onChange={e=>setSubProperty(e.target.value)} disabled={!property} style={{...sel,opacity:property?1:0.5}}>
                <option value="">— Select sub-property —</option>
                {subList.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>03 · Required Accuracy Level</label>
              <div style={{display:"flex",gap:7}}>
                {ACC_SCALE.map(({code,label})=>(
                  <button key={code} onClick={()=>setReqAcc(code)} style={{flex:1,padding:"9px 4px",borderRadius:8,
                    border:reqAcc===code?`2px solid ${ACC_COLORS[code]}`:"1px solid #1e3a5f",
                    background:reqAcc===code?`${ACC_COLORS[code]}22`:"transparent",
                    color:reqAcc===code?ACC_COLORS[code]:"#64748b",cursor:"pointer",fontSize:11,transition:"all 0.2s"}}>
                    <div style={{fontWeight:700,fontSize:13}}>{code}</div>
                    <div style={{fontSize:9,marginTop:2}}>{label.toUpperCase()}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>04 · Computational Cost Budget</label>
              <div style={{display:"flex",gap:7}}>
                {COST_SCALE.map(({code,label})=>(
                  <button key={code} onClick={()=>setReqCost(code)} style={{flex:1,padding:"9px 4px",borderRadius:8,
                    border:reqCost===code?`2px solid ${COST_COLORS[code]}`:"1px solid #1e3a5f",
                    background:reqCost===code?`${COST_COLORS[code]}22`:"transparent",
                    color:reqCost===code?COST_COLORS[code]:"#64748b",cursor:"pointer",fontSize:11,transition:"all 0.2s"}}>
                    <div style={{fontWeight:700,fontSize:13}}>{code}</div>
                    <div style={{fontSize:9,marginTop:2}}>{label.toUpperCase()}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div style={{background:"#7f1d1d22",border:"1px solid #ef444455",borderRadius:8,
            padding:"10px 16px",color:"#fca5a5",fontSize:13,marginBottom:14}}>⚠ {error}</div>}

          <div style={{display:"flex",gap:10}}>
            <button onClick={handleEvaluate} disabled={loading} style={{flex:1,padding:"13px 0",borderRadius:10,
              background:loading?"#1e3a5f":"linear-gradient(135deg,#0ea5e9,#6366f1)",border:"none",color:"#fff",
              fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",letterSpacing:1.5,
              fontFamily:"inherit",opacity:loading?0.7:1}}>
              {loading?"⟳  RUNNING ML + AI IN PARALLEL...":"▶️  COMPARE ML vs AI"}
            </button>
            {data&&<button onClick={reset} style={{padding:"13px 22px",borderRadius:10,background:"transparent",
              border:"1px solid #1e3a5f",color:"#64748b",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>↺ Reset</button>}
          </div>
        </div>

        {/* Results */}
        {data && (
          <div style={{animation:"fadeIn 0.4s ease"}}>

            {/* Agreement banner */}
            <AgreementBanner comparison={data.comparison}/>

            {/* Tabs */}
            <div style={{display:"flex",gap:4,marginBottom:18}}>
              {[
                {key:"compare", label:"⚖ Top 3 Comparison"},
                {key:"table",   label:"📊 Full Method Table"},
              ].map(tab=>(
                <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{padding:"9px 20px",borderRadius:8,
                  border:activeTab===tab.key?"1px solid #0ea5e9":"1px solid #1e3a5f",
                  background:activeTab===tab.key?"#0ea5e920":"transparent",
                  color:activeTab===tab.key?"#38bdf8":"#64748b",
                  cursor:"pointer",fontSize:13,fontFamily:"inherit",
                  fontWeight:activeTab===tab.key?700:400,transition:"all 0.2s"}}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab==="compare" && (
              <Top3Panel mlData={data.ml} aiData={data.ai} comparison={data.comparison}/>
            )}

            {activeTab==="table" && (
              <CompareTable mlData={data.ml} aiData={data.ai} comparison={data.comparison}/>
            )}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        *{box-sizing:border-box} select option{background:#0d1b2a}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#0a0f1e}
        ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
      `}</style>
    </div>
  );
}

const lbl = {display:"block",fontSize:10,color:"#64748b",letterSpacing:1.5,marginBottom:7,fontWeight:600};
const sel = {width:"100%",padding:"10px 14px",borderRadius:8,background:"#0a1628",border:"1px solid #1e3a5f",
  color:"#e2e8f0",fontSize:12,outline:"none",fontFamily:"inherit",cursor:"pointer",appearance:"none"};
const th  = {padding:"11px 14px",textAlign:"left",fontSize:10,color:"#64748b",letterSpacing:1.5,fontWeight:700};