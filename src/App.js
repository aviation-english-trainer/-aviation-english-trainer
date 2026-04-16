import { useState, useRef, useEffect } from "react";

const MODULES = [
  { id: "radio", label: "📡 Radio Simulation", icon: "📡" },
  { id: "vocab", label: "📖 Vocabulary", icon: "📖" },
  { id: "emergency", label: "🚨 Emergency Phrases", icon: "🚨" },
  { id: "exam", label: "🎓 Exam Practice", icon: "🎓" },
];

const VOCAB_CATEGORIES = {
  "ATC Clearances": [
    { en: "Cleared for takeoff", fr: "Autorisé au décollage", phonetic: "KLEERD for TAYK-awf" },
    { en: "Runway in use", fr: "Piste en service", phonetic: "RUN-way in YOOZ" },
    { en: "Hold short", fr: "Arrêtez avant", phonetic: "HOHLD SHORT" },
    { en: "Line up and wait", fr: "Alignez-vous et attendez", phonetic: "LYN up and WAYT" },
    { en: "Wind shear alert", fr: "Alerte cisaillement de vent", phonetic: "WIND SHEER uh-LERT" },
  ],
  "Weather": [
    { en: "Scattered clouds", fr: "Nuages épars", phonetic: "SKAT-erd KLOWDZ" },
    { en: "Visibility ten kilometers", fr: "Visibilité dix kilomètres", phonetic: "viz-ih-BIL-ih-tee TEN" },
    { en: "Turbulence moderate", fr: "Turbulences modérées", phonetic: "TUR-byoo-lence MOD-er-it" },
    { en: "CAVOK", fr: "Conditions de vol à vue OK", phonetic: "KAV-oh-KAY" },
    { en: "Ceiling and visibility OK", fr: "Plafond et visibilité OK", phonetic: "SEE-ling and viz-ih-BIL-ih-tee" },
  ],
  "Navigation": [
    { en: "Squawk ident", fr: "Appuyez sur ident", phonetic: "SKWAWK EYE-dent" },
    { en: "Report passing", fr: "Signalez le passage", phonetic: "rih-PORT PAS-ing" },
    { en: "Maintain flight level", fr: "Maintenez le niveau de vol", phonetic: "may-TAYN FLYT LEV-el" },
    { en: "Direct to", fr: "Direct vers", phonetic: "dih-REKT TOO" },
    { en: "Descend and maintain", fr: "Descendez et maintenez", phonetic: "dih-SEND and may-TAYN" },
  ],
  "Emergency": [
    { en: "Mayday Mayday Mayday", fr: "Détresse", phonetic: "MAY-day MAY-day MAY-day" },
    { en: "Pan-Pan Pan-Pan Pan-Pan", fr: "Urgence", phonetic: "PAN-PAN PAN-PAN PAN-PAN" },
    { en: "Declare emergency", fr: "Déclarer une urgence", phonetic: "dih-KLAIR ih-MER-jen-see" },
    { en: "Minimum fuel", fr: "Carburant minimum", phonetic: "MIN-ih-mum FYOO-el" },
    { en: "Request immediate descent", fr: "Demande descente immédiate", phonetic: "rih-KWEST ih-MEE-dee-it dih-SENT" },
  ],
};

const EMERGENCY_PHRASES = [
  {
    situation: "Engine failure after takeoff",
    transmission: "Mayday Mayday Mayday, [Callsign], engine failure, request immediate return, [souls on board], [fuel endurance]",
    tips: ["Repeat Mayday 3 times", "State callsign clearly", "Give souls on board and fuel"],
  },
  {
    situation: "Medical emergency on board",
    transmission: "Pan-Pan Pan-Pan Pan-Pan, [Callsign], medical emergency, request priority handling, [position], [altitude]",
    tips: ["Pan-Pan = urgency (not immediate danger)", "Give exact position", "State number of people affected"],
  },
  {
    situation: "Lost communication",
    transmission: "If you read, [Callsign], squawk 7600, will proceed [destination] via [route]",
    tips: ["Squawk 7600 = lost comms code", "Continue to destination", "Look for light signals at controlled airports"],
  },
];

const EXAM_QUESTIONS = [
  {
    q: "ATC says: 'Golf-Alpha-Bravo, descend to flight level one-five-zero.' What is the correct readback?",
    options: [
      "Descending to one-five-zero, Golf-Alpha-Bravo",
      "Roger, Golf-Alpha-Bravo",
      "Copy that, going down to 150",
      "Affirm, Golf-Alpha-Bravo",
    ],
    correct: 0,
    explanation: "Always read back altitude/level instructions in full + callsign. 'Roger' alone is insufficient.",
  },
  {
    q: "What does 'WILCO' mean in aviation radio communication?",
    options: [
      "I have received your message",
      "I will comply with your instructions",
      "Wait, I will call you back",
      "Wind conditions OK",
    ],
    correct: 1,
    explanation: "WILCO = 'Will Comply'. It implies you received AND will follow the instruction. Different from 'Roger' which only confirms receipt.",
  },
  {
    q: "ATC says: 'Hold short of runway two-seven.' Where do you stop?",
    options: [
      "On the runway threshold",
      "Before the runway holding position markings",
      "At the edge of the apron",
      "Anywhere before the runway",
    ],
    correct: 1,
    explanation: "Hold short = stop BEFORE the runway holding position (double yellow line). Never enter the runway without explicit clearance.",
  },
  {
    q: "Which squawk code indicates a hijacking?",
    options: ["7500", "7600", "7700", "1200"],
    correct: 0,
    explanation: "7500 = Hijack | 7600 = Lost comms | 7700 = General emergency | 1200 = VFR flight (US)",
  },
  {
    q: "How do you say the number '9' in ICAO phonetics?",
    options: ["Nine", "Niner", "Neuf", "Nov"],
    correct: 1,
    explanation: "'Niner' is used instead of 'Nine' to avoid confusion with the German word 'Nein' (No) on international frequencies.",
  },
];

const PHONETIC_ALPHABET = ["Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel","India","Juliet","Kilo","Lima","Mike","November","Oscar","Papa","Quebec","Romeo","Sierra","Tango","Uniform","Victor","Whiskey","Xray","Yankee","Zulu"];

const callAPI = async (messages, system) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "No response";
};

export default function AviationEnglishTrainer() {
  const [activeModule, setActiveModule] = useState("radio");
  const [radioMessages, setRadioMessages] = useState([
    { role: "assistant", content: "🎙️ TOWER: Good evening. Welcome to Aviation English Training Center. I am your ATC controller. When ready, state your callsign and request to taxi." }
  ]);
  const [radioInput, setRadioInput] = useState("");
  const [radioLoading, setRadioLoading] = useState(false);
  const [vocabCategory, setVocabCategory] = useState("ATC Clearances");
  const [flippedCards, setFlippedCards] = useState({});
  const [examIndex, setExamIndex] = useState(0);
  const [examSelected, setExamSelected] = useState(null);
  const [examScore, setExamScore] = useState(0);
  const [examDone, setExamDone] = useState(false);
  const [showEmergency, setShowEmergency] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [radioMessages]);

  const sendRadioMessage = async () => {
    if (!radioInput.trim() || radioLoading) return;
    const userMsg = { role: "user", content: radioInput };
    const newMessages = [...radioMessages, userMsg];
    setRadioMessages(newMessages);
    setRadioInput("");
    setRadioLoading(true);

    try {
      const system = `You are an ICAO-certified ATC (Air Traffic Controller) trainer for a French student pilot preparing for their ICAO Level 4 Aviation English exam. 

Your role:
- Act as a realistic ATC controller at a controlled airport
- The student is flying a small GA aircraft (callsign: Golf-Alpha-Bravo-Charlie-Delta)
- Respond ONLY as ATC would on the radio — short, precise, standard phraseology
- After each exchange, add a brief coaching note in French in parentheses pointing out what was correct, what could be improved, and what the proper ICAO phrase would be
- Progress through a realistic flight: taxi → takeoff → departure → en route → arrival → landing
- If the student makes errors, gently correct with the proper phrasing
- Use ICAO standard phraseology at all times
- Keep ATC transmissions realistic and relatively short`;

      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await callAPI(apiMessages, system);
      setRadioMessages(prev => [...prev, { role: "assistant", content: "🎙️ " + response }]);
    } catch (e) {
      setRadioMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    }
    setRadioLoading(false);
  };

  const handleExamAnswer = (optionIndex) => {
    if (examSelected !== null) return;
    setExamSelected(optionIndex);
    if (optionIndex === EXAM_QUESTIONS[examIndex].correct) {
      setExamScore(s => s + 1);
    }
  };

  const nextExamQuestion = () => {
    if (examIndex + 1 >= EXAM_QUESTIONS.length) {
      setExamDone(true);
    } else {
      setExamIndex(i => i + 1);
      setExamSelected(null);
    }
  };

  const resetExam = () => {
    setExamIndex(0);
    setExamSelected(null);
    setExamScore(0);
    setExamDone(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#090f18",
      fontFamily: "'Courier New', monospace",
      color: "#e8f4e8",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.015) 2px, rgba(0,255,100,0.015) 4px)",
        pointerEvents: "none", zIndex: 10,
      }} />

      {/* Radar background */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "800px", height: "800px", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,80,30,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0a1a0a 0%, #0d2010 100%)",
        borderBottom: "2px solid #1a4a20",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 30px rgba(0,200,80,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "50%",
            background: "radial-gradient(circle, #00ff6020, #003010)",
            border: "2px solid #00cc50",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px",
            boxShadow: "0 0 15px rgba(0,200,80,0.4)",
            animation: "pulse 2s infinite",
          }}>✈️</div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#00ff88", letterSpacing: "3px" }}>
              ICAO ENGLISH TRAINER
            </div>
            <div style={{ fontSize: "10px", color: "#4a8a5a", letterSpacing: "2px" }}>
              AVIATION ENGLISH • LEVEL 4 PREPARATION
            </div>
          </div>
        </div>
        <div style={{
          background: "#0a1a0a", border: "1px solid #1a4a20",
          padding: "6px 14px", borderRadius: "4px",
          fontSize: "11px", color: "#00cc50", letterSpacing: "2px",
        }}>
          ● SYSTEM ACTIVE
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex", gap: "2px", padding: "12px 16px",
        background: "#060e08", borderBottom: "1px solid #1a3a1a",
        overflowX: "auto",
      }}>
        {MODULES.map(m => (
          <button key={m.id} onClick={() => setActiveModule(m.id)} style={{
            padding: "10px 18px", border: "none", borderRadius: "4px",
            cursor: "pointer", fontSize: "12px", letterSpacing: "1px",
            fontFamily: "'Courier New', monospace", fontWeight: "bold",
            whiteSpace: "nowrap",
            background: activeModule === m.id ? "#00aa44" : "#0a1a0a",
            color: activeModule === m.id ? "#000" : "#4a8a5a",
            borderTop: activeModule === m.id ? "2px solid #00ff88" : "2px solid transparent",
            transition: "all 0.2s",
            boxShadow: activeModule === m.id ? "0 0 15px rgba(0,200,80,0.3)" : "none",
          }}>{m.label}</button>
        ))}
      </div>

      <div style={{ padding: "20px 16px", maxWidth: "900px", margin: "0 auto" }}>

        {/* RADIO SIMULATION */}
        {activeModule === "radio" && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "#4a8a5a", letterSpacing: "2px", marginBottom: "8px" }}>
                ▸ RADIO PHRASEOLOGY SIMULATOR • Powered by AI ATC
              </div>
              <div style={{
                background: "#071208", border: "1px solid #1a4a1a", borderRadius: "6px",
                padding: "10px 14px", fontSize: "11px", color: "#3a7a4a", letterSpacing: "1px",
              }}>
                🛩️ Your callsign: <span style={{ color: "#00ff88" }}>GOLF-ALPHA-BRAVO-CHARLIE-DELTA</span>
                &nbsp;|&nbsp; Airport: <span style={{ color: "#00ff88" }}>DIAP (Abidjan)</span>
                &nbsp;|&nbsp; Freq: <span style={{ color: "#00ff88" }}>118.300 MHz</span>
              </div>
            </div>

            {/* Chat window */}
            <div style={{
              height: "380px", overflowY: "auto", padding: "16px",
              background: "#040c06", border: "1px solid #1a4a1a", borderRadius: "8px",
              marginBottom: "12px", display: "flex", flexDirection: "column", gap: "12px",
              scrollbarWidth: "thin", scrollbarColor: "#1a4a1a #040c06",
            }}>
              {radioMessages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex", flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "80%", padding: "10px 14px", borderRadius: "6px",
                    fontSize: "13px", lineHeight: "1.6",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #0a3020, #0d4428)"
                      : "linear-gradient(135deg, #0a1a10, #0d2214)",
                    border: msg.role === "user" ? "1px solid #00aa44" : "1px solid #1a4a2a",
                    color: msg.role === "user" ? "#88ffaa" : "#c0e8c8",
                    boxShadow: msg.role === "user"
                      ? "0 0 10px rgba(0,170,68,0.15)"
                      : "none",
                  }}>
                    {msg.role === "user" && (
                      <div style={{ fontSize: "10px", color: "#00aa44", marginBottom: "4px", letterSpacing: "2px" }}>
                        YOU (PILOT):
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {radioLoading && (
                <div style={{ color: "#3a7a4a", fontSize: "12px", animation: "blink 1s infinite" }}>
                  ▌ ATC transmitting...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={radioInput}
                onChange={e => setRadioInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendRadioMessage()}
                placeholder="State your radio transmission in English..."
                style={{
                  flex: 1, padding: "12px 16px",
                  background: "#071208", border: "1px solid #1a5a2a",
                  borderRadius: "6px", color: "#00ff88",
                  fontFamily: "'Courier New', monospace", fontSize: "13px",
                  outline: "none", letterSpacing: "1px",
                }}
              />
              <button onClick={sendRadioMessage} disabled={radioLoading} style={{
                padding: "12px 20px", background: radioLoading ? "#0a2010" : "#00aa44",
                border: "none", borderRadius: "6px", color: radioLoading ? "#2a5a3a" : "#000",
                fontFamily: "'Courier New', monospace", fontSize: "13px",
                fontWeight: "bold", cursor: radioLoading ? "not-allowed" : "pointer",
                letterSpacing: "1px", transition: "all 0.2s",
              }}>
                {radioLoading ? "..." : "TRANSMIT →"}
              </button>
            </div>
            <div style={{ marginTop: "8px", fontSize: "10px", color: "#2a5a3a", letterSpacing: "1px" }}>
              💡 Essaie: "Abidjan Ground, Golf Alpha Bravo Charlie Delta, request taxi to runway..."
            </div>
          </div>
        )}

        {/* VOCABULARY */}
        {activeModule === "vocab" && (
          <div>
            <div style={{ fontSize: "13px", color: "#4a8a5a", letterSpacing: "2px", marginBottom: "16px" }}>
              ▸ VOCABULARY BANK • Click cards to reveal
            </div>

            {/* Category selector */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
              {Object.keys(VOCAB_CATEGORIES).map(cat => (
                <button key={cat} onClick={() => { setVocabCategory(cat); setFlippedCards({}); }} style={{
                  padding: "8px 16px", border: "none", borderRadius: "4px",
                  cursor: "pointer", fontSize: "11px", letterSpacing: "1px",
                  fontFamily: "'Courier New', monospace",
                  background: vocabCategory === cat ? "#00aa44" : "#0a1a0a",
                  color: vocabCategory === cat ? "#000" : "#4a8a5a",
                  border: `1px solid ${vocabCategory === cat ? "#00ff88" : "#1a4a1a"}`,
                }}>
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Vocab cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
              {VOCAB_CATEGORIES[vocabCategory].map((item, i) => (
                <div key={i} onClick={() => setFlippedCards(f => ({ ...f, [i]: !f[i] }))}
                  style={{
                    padding: "18px", borderRadius: "8px", cursor: "pointer",
                    background: flippedCards[i]
                      ? "linear-gradient(135deg, #0a3020, #0d4428)"
                      : "linear-gradient(135deg, #0a1a10, #0d2214)",
                    border: `1px solid ${flippedCards[i] ? "#00aa44" : "#1a4a2a"}`,
                    transition: "all 0.3s",
                    boxShadow: flippedCards[i] ? "0 0 20px rgba(0,170,68,0.2)" : "none",
                    minHeight: "110px",
                    display: "flex", flexDirection: "column", justifyContent: "center",
                  }}>
                  {!flippedCards[i] ? (
                    <div>
                      <div style={{ fontSize: "11px", color: "#3a6a4a", marginBottom: "8px", letterSpacing: "2px" }}>
                        🇬🇧 ENGLISH
                      </div>
                      <div style={{ fontSize: "16px", color: "#88ffaa", fontWeight: "bold" }}>
                        {item.en}
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "10px", color: "#2a5a3a" }}>
                        → Tap to reveal translation & pronunciation
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "11px", color: "#3a6a4a", marginBottom: "6px", letterSpacing: "2px" }}>
                        🇫🇷 FRANÇAIS
                      </div>
                      <div style={{ fontSize: "14px", color: "#c0e8c8", marginBottom: "10px" }}>
                        {item.fr}
                      </div>
                      <div style={{ fontSize: "11px", color: "#3a6a4a", marginBottom: "4px", letterSpacing: "2px" }}>
                        🔊 PRONONCIATION
                      </div>
                      <div style={{ fontSize: "13px", color: "#00ff88", fontStyle: "italic" }}>
                        [{item.phonetic}]
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Phonetic alphabet quick ref */}
            <div style={{ marginTop: "24px", padding: "16px", background: "#040c06", borderRadius: "8px", border: "1px solid #1a4a1a" }}>
              <div style={{ fontSize: "11px", color: "#3a7a4a", letterSpacing: "2px", marginBottom: "12px" }}>
                📻 ICAO PHONETIC ALPHABET
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {PHONETIC_ALPHABET.map((word, i) => (
                  <span key={i} style={{
                    background: "#071208", border: "1px solid #1a4a1a",
                    borderRadius: "3px", padding: "4px 8px", fontSize: "11px",
                    color: "#4a8a5a",
                  }}>
                    <span style={{ color: "#00ff88" }}>{String.fromCharCode(65 + i)}</span>={word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EMERGENCY */}
        {activeModule === "emergency" && (
          <div>
            <div style={{ fontSize: "13px", color: "#ff6644", letterSpacing: "2px", marginBottom: "16px" }}>
              ▸ EMERGENCY PHRASEOLOGY • MAYDAY & PAN-PAN PROCEDURES
            </div>

            <div style={{
              padding: "12px 16px", background: "#1a0800", border: "1px solid #aa3300",
              borderRadius: "6px", marginBottom: "20px", fontSize: "12px",
              color: "#ff8866", letterSpacing: "1px",
            }}>
              ⚠️ MAYDAY = Immediate danger to life | PAN-PAN = Urgency, no immediate danger | Both broadcast on 121.500 MHz
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {EMERGENCY_PHRASES.map((ep, i) => (
                <button key={i} onClick={() => setShowEmergency(i)} style={{
                  padding: "8px 14px", border: "none", borderRadius: "4px",
                  cursor: "pointer", fontSize: "10px", letterSpacing: "1px",
                  fontFamily: "'Courier New', monospace",
                  background: showEmergency === i ? "#aa3300" : "#1a0800",
                  color: showEmergency === i ? "#fff" : "#884422",
                  border: `1px solid ${showEmergency === i ? "#ff6644" : "#4a1a00"}`,
                }}>
                  {ep.situation.toUpperCase().slice(0, 18)}...
                </button>
              ))}
            </div>

            {(() => {
              const ep = EMERGENCY_PHRASES[showEmergency];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{
                    padding: "16px", background: "#0d0400", border: "1px solid #aa3300", borderRadius: "8px",
                  }}>
                    <div style={{ fontSize: "11px", color: "#884422", letterSpacing: "2px", marginBottom: "8px" }}>
                      📋 SCENARIO
                    </div>
                    <div style={{ fontSize: "16px", color: "#ff8866", fontWeight: "bold" }}>
                      {ep.situation}
                    </div>
                  </div>

                  <div style={{
                    padding: "16px", background: "#0d0400", border: "2px solid #cc4400", borderRadius: "8px",
                    boxShadow: "0 0 20px rgba(200,80,0,0.15)",
                  }}>
                    <div style={{ fontSize: "11px", color: "#884422", letterSpacing: "2px", marginBottom: "8px" }}>
                      🎙️ STANDARD TRANSMISSION
                    </div>
                    <div style={{ fontSize: "14px", color: "#ffcc88", lineHeight: "1.8", letterSpacing: "1px" }}>
                      {ep.transmission}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                    {ep.tips.map((tip, j) => (
                      <div key={j} style={{
                        padding: "12px", background: "#0a0a00", border: "1px solid #4a3a00",
                        borderRadius: "6px", fontSize: "12px", color: "#ccaa44",
                        borderLeft: "3px solid #aa8800",
                      }}>
                        ✓ {tip}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* EXAM */}
        {activeModule === "exam" && (
          <div>
            <div style={{ fontSize: "13px", color: "#4a8a5a", letterSpacing: "2px", marginBottom: "16px" }}>
              ▸ EXAM PRACTICE • ICAO LEVEL 4 STYLE QUESTIONS
            </div>

            {examDone ? (
              <div style={{
                padding: "40px", textAlign: "center",
                background: "#040c06", border: "2px solid #00aa44", borderRadius: "12px",
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  {examScore >= 4 ? "🏆" : examScore >= 3 ? "✈️" : "📚"}
                </div>
                <div style={{ fontSize: "32px", color: "#00ff88", marginBottom: "8px" }}>
                  {examScore} / {EXAM_QUESTIONS.length}
                </div>
                <div style={{ fontSize: "14px", color: "#4a8a5a", marginBottom: "24px" }}>
                  {examScore >= 4 ? "Excellent ! Niveau 4 en vue !" : examScore >= 3 ? "Bon travail, continue à pratiquer !" : "Continue à réviser, tu y arriveras !"}
                </div>
                <button onClick={resetExam} style={{
                  padding: "12px 28px", background: "#00aa44", border: "none",
                  borderRadius: "6px", color: "#000", fontFamily: "'Courier New', monospace",
                  fontSize: "14px", fontWeight: "bold", cursor: "pointer", letterSpacing: "2px",
                }}>
                  RECOMMENCER →
                </button>
              </div>
            ) : (
              <div>
                {/* Progress */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "12px", color: "#4a8a5a" }}>
                  <span>Question {examIndex + 1} / {EXAM_QUESTIONS.length}</span>
                  <span>Score: {examScore} pts</span>
                </div>
                <div style={{ height: "4px", background: "#0a1a0a", borderRadius: "2px", marginBottom: "20px" }}>
                  <div style={{
                    height: "100%", background: "#00aa44", borderRadius: "2px",
                    width: `${(examIndex / EXAM_QUESTIONS.length) * 100}%`,
                    transition: "width 0.3s",
                    boxShadow: "0 0 10px rgba(0,200,68,0.4)",
                  }} />
                </div>

                {/* Question */}
                <div style={{
                  padding: "20px", background: "#040c06", border: "1px solid #1a4a1a",
                  borderRadius: "8px", marginBottom: "16px",
                  fontSize: "15px", color: "#88ffaa", lineHeight: "1.7",
                }}>
                  {EXAM_QUESTIONS[examIndex].q}
                </div>

                {/* Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                  {EXAM_QUESTIONS[examIndex].options.map((opt, i) => {
                    let bg = "#0a1a10", border = "#1a4a2a", color = "#c0e8c8";
                    if (examSelected !== null) {
                      if (i === EXAM_QUESTIONS[examIndex].correct) { bg = "#0a3020"; border = "#00ff88"; color = "#00ff88"; }
                      else if (i === examSelected && i !== EXAM_QUESTIONS[examIndex].correct) { bg = "#1a0808"; border = "#ff4444"; color = "#ff8888"; }
                    }
                    return (
                      <button key={i} onClick={() => handleExamAnswer(i)} style={{
                        padding: "14px 18px", background: bg, border: `1px solid ${border}`,
                        borderRadius: "6px", color, fontSize: "13px", textAlign: "left",
                        fontFamily: "'Courier New', monospace", cursor: examSelected !== null ? "default" : "pointer",
                        transition: "all 0.3s", letterSpacing: "0.5px",
                      }}>
                        <span style={{ marginRight: "10px", opacity: 0.5 }}>{["A", "B", "C", "D"][i]}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {examSelected !== null && (
                  <div style={{
                    padding: "14px", background: "#071208", border: "1px solid #1a6a2a",
                    borderRadius: "6px", fontSize: "12px", color: "#88cc88", lineHeight: "1.7",
                    marginBottom: "16px", borderLeft: "3px solid #00aa44",
                  }}>
                    💡 <strong>Explication:</strong> {EXAM_QUESTIONS[examIndex].explanation}
                  </div>
                )}

                {examSelected !== null && (
                  <button onClick={nextExamQuestion} style={{
                    width: "100%", padding: "14px", background: "#00aa44",
                    border: "none", borderRadius: "6px", color: "#000",
                    fontFamily: "'Courier New', monospace", fontSize: "14px",
                    fontWeight: "bold", cursor: "pointer", letterSpacing: "2px",
                  }}>
                    {examIndex + 1 >= EXAM_QUESTIONS.length ? "VOIR RÉSULTATS →" : "QUESTION SUIVANTE →"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 15px rgba(0,200,80,0.4)} 50%{box-shadow:0 0 25px rgba(0,200,80,0.7)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #040c06; }
        ::-webkit-scrollbar-thumb { background: #1a4a1a; border-radius: 3px; }
      `}</style>
    </div>
  );
}
