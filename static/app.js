/**
 * VaaniAccess - Public Scheme Voice Navigator
 * Frontend Controller & Voice Synthesis Engine
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const micButton = document.getElementById("micButton");
  const micPromptText = document.getElementById("micPromptText");
  const audioWaveContainer = document.getElementById("audioWaveContainer");
  const liveTranscriptBox = document.getElementById("liveTranscriptBox");
  const liveTranscriptText = document.getElementById("liveTranscriptText");
  const systemStatusPill = document.getElementById("systemStatusPill");
  const statusLabel = document.getElementById("statusLabel");
  const textQueryForm = document.getElementById("textQueryForm");
  const textQueryInput = document.getElementById("textQueryInput");
  const resultsSection = document.getElementById("resultsSection");

  // Badges & Scheme Details
  const detectedCategoryBadge = document.getElementById("detectedCategoryBadge");
  const dialectBadge = document.getElementById("dialectBadge");
  const confidenceBadge = document.getElementById("confidenceBadge");
  const spokenGuideText = document.getElementById("spokenGuideText");
  const schemeNameHi = document.getElementById("schemeNameHi");
  const schemeNameEn = document.getElementById("schemeNameEn");
  const schemeTagline = document.getElementById("schemeTagline");
  const schemeBenefitAmount = document.getElementById("schemeBenefitAmount");
  const schemeDesc = document.getElementById("schemeDesc");

  // 3-Step Pathway Elements
  const step1Title = document.getElementById("step1Title");
  const step1Desc = document.getElementById("step1Desc");
  const step2Title = document.getElementById("step2Title");
  const step2Desc = document.getElementById("step2Desc");
  const step3Title = document.getElementById("step3Title");
  const step3Desc = document.getElementById("step3Desc");

  // Checklists & Links
  const documentsList = document.getElementById("documentsList");
  const eligibilityList = document.getElementById("eligibilityList");
  const helplineNumber = document.getElementById("helplineNumber");
  const officialPortalLink = document.getElementById("officialPortalLink");
  const alternativesGrid = document.getElementById("alternativesGrid");

  // Voice Controls
  const replayVoiceBtn = document.getElementById("replayVoiceBtn");
  const stopVoiceBtn = document.getElementById("stopVoiceBtn");
  const speedNormalBtn = document.getElementById("speedNormalBtn");
  const speedSlowBtn = document.getElementById("speedSlowBtn");

  // Modal Elements
  const browseSchemesBtn = document.getElementById("browseSchemesBtn");
  const schemesModal = document.getElementById("schemesModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const categoryFilterBar = document.getElementById("categoryFilterBar");
  const allSchemesList = document.getElementById("allSchemesList");

  // State
  let recognition = null;
  let isListening = false;
  let isSpeaking = false;
  let currentVoiceText = "";
  let speechRate = 0.95;
  let allSchemesData = [];
  let allCategoriesData = [];

  // Web Audio Chime Synthesizer
  let audioCtx = null;
  function playTone(freq = 440, type = "sine", duration = 0.15) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext might be restricted until user interaction
    }
  }

  function playSuccessChime() {
    playTone(523.25, "sine", 0.1); // C5
    setTimeout(() => playTone(659.25, "sine", 0.18), 100); // E5
  }

  // Speech Recognition Setup (Web Speech API)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      micButton.classList.add("listening");
      document.querySelector(".mic-button-wrapper").classList.add("listening");
      micPromptText.textContent = "सुन रहे हैं... (Listening...)";
      audioWaveContainer.classList.remove("hidden");
      liveTranscriptBox.classList.remove("hidden");
      liveTranscriptText.textContent = "बोलिए, हम सुन रहे हैं...";
      setStatus("listening", "सुन रहे हैं (Listening...)");
      playTone(587.33, "sine", 0.15);
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const transcript = final || interim;
      if (transcript) {
        liveTranscriptText.textContent = `"${transcript}"`;
        if (final) {
          handleUserQuery(final);
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition notice/error:", event.error);
      stopListening();
      if (event.error === "not-allowed") {
        micPromptText.textContent = "माइक अनुमति अस्वीकृत (Mic Blocked)";
        setStatus("ready", "माइक की अनुमति दें या नीचे लिखें");
      } else {
        micPromptText.textContent = "माइक दबाकर बोलें (Click to Speak)";
        setStatus("ready", "वॉयस तैयार है (Voice Ready)");
      }
    };

    recognition.onend = () => {
      stopListening();
    };
  } else {
    micPromptText.textContent = "वॉयस इनपुट सीमित है (Use Text / Chips)";
    console.info("Speech recognition not natively supported; fallback text and chips active.");
  }

  function startListening() {
    stopSpeaking();
    if (recognition) {
      try {
        recognition.start();
      } catch (err) {
        console.warn("Recognition already active or restarting:", err);
      }
    } else {
      // Fallback prompt for browsers without Web Speech STT
      const sample = prompt("माइक उपलब्ध नहीं है। अपनी आवश्यकता यहाँ लिखें (उदा. 'Main college student hoon'):", "Main college student hoon");
      if (sample) handleUserQuery(sample);
    }
  }

  function stopListening() {
    isListening = false;
    micButton.classList.remove("listening");
    const wrapper = document.querySelector(".mic-button-wrapper");
    if (wrapper) wrapper.classList.remove("listening");
    if (!isSpeaking) {
      audioWaveContainer.classList.add("hidden");
      setStatus("ready", "वॉयस तैयार है (Voice Ready)");
      micPromptText.textContent = "माइक दबाकर बोलें (Click to Speak)";
    }
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
  }

  // Speech Synthesis Setup (TTS in Hindi)
  function speakHindiText(text) {
    if (!('speechSynthesis' in window) || !text) return;
    stopSpeaking();

    // Cancel ongoing utterances
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    // Discover Hindi voices if available
    const voices = window.speechSynthesis.getVoices();
    const hiVoice = voices.find(v => v.lang.includes("hi") || v.lang.includes("HI")) 
                 || voices.find(v => v.lang.includes("en-IN") || v.name.includes("India"));
    if (hiVoice) {
      utterance.voice = hiVoice;
    }

    utterance.onstart = () => {
      isSpeaking = true;
      setStatus("speaking", "वाणी सहायक बोल रहा है (Speaking...)");
      audioWaveContainer.classList.remove("hidden");
      replayVoiceBtn.classList.add("voice-active");
    };

    utterance.onend = () => {
      isSpeaking = false;
      audioWaveContainer.classList.add("hidden");
      setStatus("ready", "वॉयस तैयार है (Voice Ready)");
      replayVoiceBtn.classList.remove("voice-active");
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e);
      isSpeaking = false;
      audioWaveContainer.classList.add("hidden");
      setStatus("ready", "वॉयस तैयार है (Voice Ready)");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    audioWaveContainer.classList.add("hidden");
    setStatus("ready", "वॉयस तैयार है (Voice Ready)");
  }

  // Update Status Pill UI
  function setStatus(state, label) {
    const statusDot = systemStatusPill.querySelector(".status-dot");
    statusDot.className = "status-dot";
    if (state === "listening") statusDot.classList.add("listening");
    if (state === "speaking") statusDot.classList.add("speaking");
    statusLabel.textContent = label;
  }

  // Scheme Matching Request
  async function handleUserQuery(queryText) {
    if (!queryText || !queryText.trim()) return;
    const cleanQuery = queryText.trim();

    // Show loading state
    setStatus("listening", "योजना खोजी जा रही है (Searching...)");
    micPromptText.textContent = `खोज रहे हैं: "${cleanQuery}"`;

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanQuery })
      });

      if (!res.ok) throw new Error("Match request failed");
      const data = await res.json();
      
      playSuccessChime();
      renderSchemeResult(data);

      // Auto-speak Hindi response
      currentVoiceText = data.voice_response || "";
      if (currentVoiceText) {
        speakHindiText(currentVoiceText);
      }
    } catch (err) {
      console.error("Match error:", err);
      micPromptText.textContent = "त्रुटि हुई, कृपया पुनः प्रयास करें";
      setStatus("ready", "कृपया फिर से प्रयास करें");
    }
  }

  // Render Result Card
  function renderSchemeResult(data) {
    const s = data.matched_scheme;
    if (!s) return;

    // Badges
    detectedCategoryBadge.textContent = `${data.category_meta?.icon || '📋'} ${data.category_meta?.name_hi || data.detected_category}`;
    dialectBadge.textContent = `🗣️ बोली: ${data.dialect_detected || 'Standard'}`;
    const confPercent = Math.round((data.confidence || 0.85) * 100);
    confidenceBadge.textContent = `🎯 ${confPercent}% Match`;

    // Voice response bubble
    spokenGuideText.textContent = data.voice_response || s.voice_summary_hi;

    // Scheme Hero Info
    schemeNameHi.textContent = s.name_hi;
    schemeNameEn.textContent = s.name_en || "";
    schemeTagline.textContent = s.tagline_hi || "";
    schemeBenefitAmount.textContent = s.benefit_amount || "वित्तीय लाभ उपलब्ध";
    schemeDesc.textContent = s.short_desc_hi;

    // 3-Step Action Pathway
    if (s.steps_hi && s.steps_hi.length >= 3) {
      step1Title.textContent = s.steps_hi[0].title;
      step1Desc.textContent = s.steps_hi[0].detail;

      step2Title.textContent = s.steps_hi[1].title;
      step2Desc.textContent = s.steps_hi[1].detail;

      step3Title.textContent = s.steps_hi[2].title;
      step3Desc.textContent = s.steps_hi[2].detail;
    }

    // Required Documents Checklist
    documentsList.innerHTML = "";
    (s.required_documents_hi || []).forEach(doc => {
      const li = document.createElement("li");
      li.textContent = doc;
      documentsList.appendChild(li);
    });

    // Eligibility Checklist
    eligibilityList.innerHTML = "";
    (s.eligibility_criteria_hi || []).forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      eligibilityList.appendChild(li);
    });

    // Helpline & Portal Link
    helphoneNumber.textContent = s.helpline || "1800-115-526";
    officialPortalLink.href = s.official_portal_url || "#";

    // Alternatives
    alternativesGrid.innerHTML = "";
    const alts = data.alternative_schemes || [];
    if (alts.length > 0) {
      document.getElementById("alternativesSection").classList.remove("hidden");
      alts.forEach(alt => {
        const card = document.createElement("div");
        card.className = "alt-card";
        card.innerHTML = `
          <h5 class="alt-title">${alt.name_hi}</h5>
          <p class="alt-desc">${alt.tagline_hi || alt.short_desc_hi.substring(0, 85)}...</p>
        `;
        card.addEventListener("click", () => {
          handleUserQuery(alt.name_hi);
        });
        alternativesGrid.appendChild(card);
      });
    } else {
      document.getElementById("alternativesSection").classList.add("hidden");
    }

    // Reveal Results Section
    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Load All Schemes for the Modal Explorer
  async function loadAllSchemes() {
    try {
      const res = await fetch("/api/schemes");
      const data = await res.json();
      allSchemesData = data.schemes || [];
      allCategoriesData = data.categories || [];
      renderCategoryFilters();
      renderAllSchemesList(allSchemesData);
    } catch (e) {
      console.warn("Failed to load catalog:", e);
    }
  }

  function renderCategoryFilters() {
    categoryFilterBar.innerHTML = "";
    const allChip = document.createElement("button");
    allChip.className = "filter-chip active";
    allChip.textContent = "सभी (All)";
    allChip.onclick = () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      allChip.classList.add("active");
      renderAllSchemesList(allSchemesData);
    };
    categoryFilterBar.appendChild(allChip);

    allCategoriesData.forEach(cat => {
      const chip = document.createElement("button");
      chip.className = "filter-chip";
      chip.textContent = `${cat.icon} ${cat.name_hi.split(' ')[0]}`;
      chip.onclick = () => {
        document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const filtered = allSchemesData.filter(s => s.category === cat.id);
        renderAllSchemesList(filtered);
      };
      categoryFilterBar.appendChild(chip);
    });
  }

  function renderAllSchemesList(schemes) {
    allSchemesList.innerHTML = "";
    schemes.forEach(s => {
      const item = document.createElement("div");
      item.className = "scheme-list-item";
      item.innerHTML = `
        <div class="item-left">
          <h4 class="item-title">${s.name_hi}</h4>
          <p class="item-sub">${s.tagline_hi || s.short_desc_hi.substring(0, 100)}</p>
        </div>
        <button class="btn btn-primary btn-sm">देखें (View)</button>
      `;
      item.addEventListener("click", () => {
        schemesModal.classList.add("hidden");
        handleUserQuery(s.name_hi);
      });
      allSchemesList.appendChild(item);
    });
  }

  // Event Listeners
  micButton.addEventListener("click", () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  textQueryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = textQueryInput.value.trim();
    if (q) {
      handleUserQuery(q);
      textQueryInput.value = "";
    }
  });

  // Demo Query Chips
  document.querySelectorAll(".demo-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const q = chip.getAttribute("data-query");
      if (q) {
        liveTranscriptBox.classList.remove("hidden");
        liveTranscriptText.textContent = `"${q}"`;
        handleUserQuery(q);
      }
    });
  });

  // Voice Controls
  replayVoiceBtn.addEventListener("click", () => {
    if (currentVoiceText) {
      speakHindiText(currentVoiceText);
    }
  });

  stopVoiceBtn.addEventListener("click", () => {
    stopSpeaking();
  });

  speedNormalBtn.addEventListener("click", () => {
    speedNormalBtn.classList.add("active");
    speedSlowBtn.classList.remove("active");
    speechRate = 0.95;
    if (isSpeaking && currentVoiceText) speakHindiText(currentVoiceText);
  });

  speedSlowBtn.addEventListener("click", () => {
    speedSlowBtn.classList.add("active");
    speedNormalBtn.classList.remove("active");
    speechRate = 0.8;
    if (isSpeaking && currentVoiceText) speakHindiText(currentVoiceText);
  });

  // Catalog Modal
  browseSchemesBtn.addEventListener("click", () => {
    if (allSchemesData.length === 0) loadAllSchemes();
    schemesModal.classList.remove("hidden");
  });

  closeModalBtn.addEventListener("click", () => {
    schemesModal.classList.add("hidden");
  });

  schemesModal.addEventListener("click", (e) => {
    if (e.target === schemesModal) schemesModal.classList.add("hidden");
  });

  // Pre-load voices & catalog
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
  loadAllSchemes();
});
