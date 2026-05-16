/* ============================================
   VTuber Avatar AI - Live2D + TTS
   Kobo-Kanaeru style VTuber experience
   ============================================ */

// ----------- DOM -----------
const els = {
    canvas: document.getElementById('live2dCanvas'),
    avatarContainer: document.getElementById('avatarContainer'),
    loading: document.getElementById('loadingOverlay'),
    bubble: document.getElementById('speechBubble'),
    bubbleText: document.getElementById('bubbleText'),
    status: document.getElementById('status'),
    reactions: document.getElementById('reactions'),
    sparkles: document.getElementById('sparkles'),
    chatLog: document.getElementById('chatLog'),
    userMsg: document.getElementById('userMsg'),
    sendBtn: document.getElementById('sendBtn'),
    modelSelect: document.getElementById('modelSelect'),
    customModelGroup: document.getElementById('customModelGroup'),
    customModelUrl: document.getElementById('customModelUrl'),
    loadModelBtn: document.getElementById('loadModelBtn'),
    aiMode: document.getElementById('aiMode'),
    apiKeyGroup: document.getElementById('apiKeyGroup'),
    apiKey: document.getElementById('apiKey'),
    ttsMode: document.getElementById('ttsMode'),
    elevenApiKey: document.getElementById('elevenApiKey'),
    elevenVoice: document.getElementById('elevenVoice'),
    elevenCustomId: document.getElementById('elevenCustomId'),
    elevenCustomGroup: document.getElementById('elevenCustomGroup'),
    elevenModel: document.getElementById('elevenModel'),
    avatarName: document.getElementById('avatarName'),
    personality: document.getElementById('personality'),
    voiceSelect: document.getElementById('voiceSelect'),
    pitch: document.getElementById('pitch'),
    pitchVal: document.getElementById('pitchVal'),
    rate: document.getElementById('rate'),
    rateVal: document.getElementById('rateVal'),
    modelSize: document.getElementById('modelSize'),
    sizeVal: document.getElementById('sizeVal'),
    obsBtn: document.getElementById('obsMode'),
    settingsPanel: document.getElementById('settingsPanel'),
    togglePanel: document.getElementById('togglePanel'),
    panelHeader: document.querySelector('.panel-header'),
    ttsAudio: document.getElementById('ttsAudio'),
};

// ----------- State -----------
const state = {
    speaking: false,
    voices: [],
    pixiApp: null,
    model: null,
    audioContext: null,
    analyser: null,
    audioSource: null,
    lipSyncRunning: false,
};

// ============================================
// SETTINGS
// ============================================
function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('vtuberSettings') || '{}');
    if (saved.modelUrl) els.modelSelect.value = saved.modelUrl;
    if (saved.customModelUrl) els.customModelUrl.value = saved.customModelUrl;
    if (saved.aiMode) els.aiMode.value = saved.aiMode;
    if (saved.apiKey) els.apiKey.value = saved.apiKey;
    if (saved.ttsMode) els.ttsMode.value = saved.ttsMode;
    if (saved.elevenApiKey) els.elevenApiKey.value = saved.elevenApiKey;
    if (saved.elevenVoice) els.elevenVoice.value = saved.elevenVoice;
    if (saved.elevenCustomId) els.elevenCustomId.value = saved.elevenCustomId;
    if (saved.elevenModel) els.elevenModel.value = saved.elevenModel;
    if (saved.avatarName) els.avatarName.value = saved.avatarName;
    if (saved.personality) els.personality.value = saved.personality;
    if (saved.pitch) els.pitch.value = saved.pitch;
    if (saved.rate) els.rate.value = saved.rate;
    if (saved.modelSize) els.modelSize.value = saved.modelSize;
    els.pitchVal.textContent = els.pitch.value;
    els.rateVal.textContent = els.rate.value;
    els.sizeVal.textContent = els.modelSize.value;
    updateUIVisibility();
}

function saveSettings() {
    localStorage.setItem('vtuberSettings', JSON.stringify({
        modelUrl: els.modelSelect.value,
        customModelUrl: els.customModelUrl.value,
        aiMode: els.aiMode.value,
        apiKey: els.apiKey.value,
        ttsMode: els.ttsMode.value,
        elevenApiKey: els.elevenApiKey.value,
        elevenVoice: els.elevenVoice.value,
        elevenCustomId: els.elevenCustomId.value,
        elevenModel: els.elevenModel.value,
        avatarName: els.avatarName.value,
        personality: els.personality.value,
        pitch: els.pitch.value,
        rate: els.rate.value,
        modelSize: els.modelSize.value,
        voice: els.voiceSelect.value,
    }));
}

function updateUIVisibility() {
    els.apiKeyGroup.style.display = els.aiMode.value === 'gemini' ? 'block' : 'none';
    const isElevenLabs = els.ttsMode.value === 'elevenlabs';
    document.querySelectorAll('.elevenlabs-config').forEach(el => {
        el.style.display = isElevenLabs ? 'block' : 'none';
    });
    document.querySelectorAll('.browser-tts-config').forEach(el => {
        el.style.display = isElevenLabs ? 'none' : 'block';
    });
    els.elevenCustomGroup.style.display =
        (isElevenLabs && els.elevenVoice.value === 'custom') ? 'block' : 'none';
    els.customModelGroup.style.display = els.modelSelect.value === 'custom' ? 'block' : 'none';
}

// ============================================
// LIVE2D MODEL LOADER
// ============================================
async function initPixi() {
    if (state.pixiApp) return state.pixiApp;

    const containerWidth = els.avatarContainer.clientWidth;
    const containerHeight = els.avatarContainer.clientHeight;

    state.pixiApp = new PIXI.Application({
        view: els.canvas,
        width: containerWidth,
        height: containerHeight,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
    });

    // Resize handler
    window.addEventListener('resize', () => {
        if (!state.pixiApp) return;
        state.pixiApp.renderer.resize(els.avatarContainer.clientWidth, els.avatarContainer.clientHeight);
        if (state.model) {
            positionModel(state.model);
        }
    });

    return state.pixiApp;
}

function positionModel(model) {
    if (!model || !state.pixiApp) return;
    const w = state.pixiApp.renderer.width / state.pixiApp.renderer.resolution;
    const h = state.pixiApp.renderer.height / state.pixiApp.renderer.resolution;
    const sizeFactor = parseFloat(els.modelSize.value);

    // Fit model to canvas
    const scale = Math.min(w / model.width, h / model.height) * 0.9 * sizeFactor;
    model.scale.set(scale);

    // Center horizontally, anchor at bottom
    model.x = w / 2 - model.width / 2;
    model.y = h - model.height + (h * 0.05);
}

async function loadModel(modelUrl) {
    showLoading('Memuat model VTuber...');

    try {
        await initPixi();

        // Remove existing model
        if (state.model) {
            state.pixiApp.stage.removeChild(state.model);
            state.model.destroy();
            state.model = null;
        }

        // Use the global Live2DModel from pixi-live2d-display
        const Live2DModel = window.PIXI.live2d.Live2DModel;

        const model = await Live2DModel.from(modelUrl, {
            autoInteract: true,
            autoUpdate: true,
        });

        state.pixiApp.stage.addChild(model);
        state.model = model;

        positionModel(model);

        // Make model draggable
        model.interactive = true;
        let dragData = null;
        model.on('pointerdown', (e) => {
            dragData = { x: e.data.global.x - model.x, y: e.data.global.y - model.y };
        });
        model.on('pointermove', (e) => {
            if (dragData) {
                model.x = e.data.global.x - dragData.x;
                model.y = e.data.global.y - dragData.y;
            }
        });
        model.on('pointerup', () => { dragData = null; });
        model.on('pointerupoutside', () => { dragData = null; });

        // Tap interaction (when not dragging)
        let dragStart = null;
        model.on('pointerdown', (e) => {
            dragStart = { x: e.data.global.x, y: e.data.global.y, time: Date.now() };
        });
        model.on('pointerup', (e) => {
            if (!dragStart) return;
            const dx = Math.abs(e.data.global.x - dragStart.x);
            const dy = Math.abs(e.data.global.y - dragStart.y);
            const dt = Date.now() - dragStart.time;
            // If quick tap (small movement, fast)
            if (dx < 5 && dy < 5 && dt < 300 && !state.speaking) {
                spawnReaction('💖', 3);
                triggerExpression('happy');
            }
            dragStart = null;
        });

        hideLoading();
        setStatus('Idle');
        logMessage('ai', `Model "${modelUrl.split('/').pop().slice(0, 30)}" berhasil dimuat!`);
        return true;
    } catch (e) {
        console.error('Load model failed:', e);
        hideLoading();
        setStatus('Error load model');
        logMessage('ai', `[ERROR Model] ${e.message}`);
        return false;
    }
}

function showLoading(text) {
    els.loading.style.display = 'flex';
    els.loading.querySelector('div:last-child').textContent = text || 'Loading...';
}

function hideLoading() {
    els.loading.style.display = 'none';
}

// ============================================
// LIVE2D MOUTH CONTROL (Lip Sync)
// ============================================
function setMouthOpen(value) {
    if (!state.model) return;
    // Try multiple parameter names (different model formats)
    const params = ['ParamMouthOpenY', 'PARAM_MOUTH_OPEN_Y', 'PARAM_MOUTH_OPEN'];
    for (const param of params) {
        try {
            state.model.internalModel.coreModel.setParameterValueById(param, value);
        } catch (e) { /* try next */ }
    }
}

function triggerExpression(name) {
    if (!state.model) return;
    try {
        // Try motion first (random idle/tap)
        if (state.model.internalModel.motionManager) {
            const motions = state.model.internalModel.motionManager.definitions;
            if (motions) {
                const groups = Object.keys(motions);
                if (groups.length > 0) {
                    // Try tap_body / tap / happy groups
                    const preferred = groups.find(g =>
                        g.toLowerCase().includes('tap') ||
                        g.toLowerCase().includes('happy')
                    ) || groups[0];
                    state.model.motion(preferred);
                }
            }
        }
        // Try expression
        if (state.model.expression) {
            state.model.expression();
        }
    } catch (e) {
        console.warn('Expression error:', e);
    }
}

// ============================================
// AUDIO-BASED LIP SYNC
// ============================================
function startAudioLipSync(audioElement) {
    try {
        if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }

        // Create new source for the audio element (only once per element)
        if (!audioElement._mediaSource) {
            audioElement._mediaSource = state.audioContext.createMediaElementSource(audioElement);
            state.analyser = state.audioContext.createAnalyser();
            state.analyser.fftSize = 256;
            state.analyser.smoothingTimeConstant = 0.5;
            audioElement._mediaSource.connect(state.analyser);
            state.analyser.connect(state.audioContext.destination);
        }

        const dataArray = new Uint8Array(state.analyser.frequencyBinCount);
        state.lipSyncRunning = true;

        const tick = () => {
            if (!state.lipSyncRunning) {
                setMouthOpen(0);
                return;
            }
            state.analyser.getByteFrequencyData(dataArray);
            // Average volume → mouth open value (0..1)
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            const mouthValue = Math.min(1, avg / 80);
            setMouthOpen(mouthValue);
            requestAnimationFrame(tick);
        };
        tick();
    } catch (e) {
        console.warn('Audio lip sync setup failed, falling back to text-based:', e);
        startTextLipSync();
    }
}

function stopAudioLipSync() {
    state.lipSyncRunning = false;
    setMouthOpen(0);
}

// Fallback text-based lip sync (for browser TTS which doesn't expose audio)
let textLipSyncTimer = null;
function startTextLipSync(durationMs = 5000) {
    stopTextLipSync();
    const startTime = Date.now();
    const tick = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= durationMs) {
            stopTextLipSync();
            return;
        }
        // Oscillate mouth open value rapidly to simulate talking
        const t = elapsed / 100;
        const mouthValue = 0.3 + 0.7 * Math.abs(Math.sin(t)) * Math.random();
        setMouthOpen(Math.min(1, mouthValue));
        textLipSyncTimer = requestAnimationFrame(tick);
    };
    tick();
}

function stopTextLipSync() {
    if (textLipSyncTimer) {
        cancelAnimationFrame(textLipSyncTimer);
        textLipSyncTimer = null;
    }
    setMouthOpen(0);
}

// ============================================
// BROWSER TTS
// ============================================
function loadVoices() {
    state.voices = window.speechSynthesis.getVoices();
    els.voiceSelect.innerHTML = '';
    const sorted = [...state.voices].sort((a, b) => {
        const aId = a.lang.toLowerCase().startsWith('id') ? -1 : 0;
        const bId = b.lang.toLowerCase().startsWith('id') ? -1 : 0;
        return aId - bId;
    });
    sorted.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})`;
        els.voiceSelect.appendChild(opt);
    });
    const saved = JSON.parse(localStorage.getItem('vtuberSettings') || '{}');
    if (saved.voice && state.voices.find(v => v.name === saved.voice)) {
        els.voiceSelect.value = saved.voice;
    }
}

if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function speakBrowser(text) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            showBubble(text, 4000);
            setTimeout(resolve, 4000);
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = state.voices.find(v => v.name === els.voiceSelect.value);
        if (voice) utterance.voice = voice;
        utterance.pitch = parseFloat(els.pitch.value);
        utterance.rate = parseFloat(els.rate.value);
        utterance.lang = voice ? voice.lang : 'id-ID';

        // Estimate duration for lip sync
        const estimatedMs = (text.length / 12) * 1000 / parseFloat(els.rate.value);

        utterance.onstart = () => {
            state.speaking = true;
            setStatus('Bicara...');
            startTextLipSync(estimatedMs + 500);
            showBubble(text, 0);
        };
        utterance.onend = () => { finishSpeaking(); resolve(); };
        utterance.onerror = () => { finishSpeaking(); resolve(); };
        window.speechSynthesis.speak(utterance);
    });
}

function finishSpeaking() {
    state.speaking = false;
    stopAudioLipSync();
    stopTextLipSync();
    hideBubble();
    setStatus('Idle');
}

// ============================================
// ELEVENLABS TTS
// ============================================
async function speakElevenLabs(text) {
    const apiKey = els.elevenApiKey.value.trim();
    if (!apiKey) {
        logMessage('ai', '[INFO] ElevenLabs key kosong, pakai Browser TTS');
        return speakBrowser(text);
    }
    let voiceId = els.elevenVoice.value;
    if (voiceId === 'custom') {
        voiceId = els.elevenCustomId.value.trim();
        if (!voiceId) return speakBrowser(text);
    }

    setStatus('Loading audio...');
    showBubble(text, 0);

    try {
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text: text,
                model_id: els.elevenModel.value || 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            logMessage('ai', `[ERROR ElevenLabs ${res.status}] ${err.slice(0, 100)}`);
            hideBubble();
            return speakBrowser(text);
        }

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);

        return new Promise((resolve) => {
            els.ttsAudio.src = audioUrl;
            els.ttsAudio.onplay = () => {
                state.speaking = true;
                setStatus('Bicara (ElevenLabs)...');
                startAudioLipSync(els.ttsAudio);
            };
            els.ttsAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                finishSpeaking();
                resolve();
            };
            els.ttsAudio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                finishSpeaking();
                speakBrowser(text).then(resolve);
            };
            els.ttsAudio.play().catch(err => {
                console.error(err);
                finishSpeaking();
                logMessage('ai', '[INFO] Auto-play diblokir, klik avatar dulu');
                resolve();
            });
        });
    } catch (e) {
        hideBubble();
        logMessage('ai', `[ERROR] ${e.message}`);
        return speakBrowser(text);
    }
}

async function speak(text) {
    if (els.ttsMode.value === 'elevenlabs') return speakElevenLabs(text);
    return speakBrowser(text);
}

// ============================================
// UI HELPERS
// ============================================
let bubbleTimer = null;
function showBubble(text, autoHideMs = 3000) {
    if (bubbleTimer) clearTimeout(bubbleTimer);
    els.bubbleText.textContent = text;
    els.bubble.classList.add('show');
    if (autoHideMs > 0) bubbleTimer = setTimeout(hideBubble, autoHideMs);
}
function hideBubble() { els.bubble.classList.remove('show'); }
function setStatus(text) { els.status.textContent = text; }

function logMessage(who, text) {
    const div = document.createElement('div');
    div.className = who === 'user' ? 'msg-user' : 'msg-ai';
    div.textContent = (who === 'user' ? '> ' : '🤖 ') + text;
    els.chatLog.appendChild(div);
    els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

// ============================================
// AI BRAIN
// ============================================
const DEMO_RESPONSES = [
    'Halo halo penonton! Apa kabar hari ini? ✨',
    'Wahh seru banget! Makasih ya udah nonton aku!',
    'Hihihi, kamu lucu deh! Sini cerita lagi dong!',
    'Iya iya aku setuju banget sama kamu!',
    'Wah keren! Aku jadi kepingin coba juga nih!',
    'Hmm, menurutku sih itu pilihan yang oke banget!',
    'Eh eh, gift-nya lucu banget! Makasiii!',
    'Kalian semua sayang banget sama aku ya~',
    'Aduh aku jadi malu nih hehehe!',
    'Wkwkwk kocak banget sumpah!',
    'Kamu yang terbaik deh pokoknya!',
    'Iyaaa aku ngerti, sabar ya~',
];

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-pro'];

async function callGemini(text, prompt, key) {
    let lastErr = null;
    for (const model of GEMINI_MODELS) {
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${prompt}\n\nUser: ${text}\nAvatar:` }] }],
                    generationConfig: { temperature: 0.9, maxOutputTokens: 100 }
                }),
            });
            if (!r.ok) {
                lastErr = `${r.status}: ${(await r.text()).slice(0, 150)}`;
                if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error(lastErr);
                continue;
            }
            const data = await r.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (reply) return { ok: true, reply };
        } catch (e) {
            lastErr = e.message;
            if (e.message.includes('40')) break;
        }
    }
    return { ok: false, error: lastErr };
}

async function getAIResponse(text) {
    if (els.aiMode.value === 'demo') {
        return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
    }
    const key = els.apiKey.value.trim();
    if (!key) return 'Set Gemini API Key dulu, atau pilih Mode Demo!';
    const prompt = els.personality.value || `Aku ${els.avatarName.value}, AI ramah.`;
    const result = await callGemini(text, prompt, key);
    if (result.ok) return result.reply;
    logMessage('ai', `[ERROR Gemini] ${result.error}`);
    return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
}

// ============================================
// REACTIONS & TRIGGERS
// ============================================
function spawnReaction(emoji, count = 1) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'reaction';
            el.textContent = emoji;
            el.style.left = (35 + Math.random() * 70) + '%';
            el.style.top = (40 + Math.random() * 30) + '%';
            els.reactions.appendChild(el);
            setTimeout(() => el.remove(), 2500);
        }, i * 100);
    }
}

async function handleSendMessage(text) {
    if (!text.trim() || state.speaking) return;
    logMessage('user', text);
    setStatus('Berpikir...');
    const reply = await getAIResponse(text);
    logMessage('ai', reply);
    await speak(reply);
}

const TRIGGERS = {
    like: { emoji: '❤️', count: 5, says: ['Makasih like-nya!', 'Yeay love love!', 'Aku juga sayang kalian!'] },
    rose: { emoji: '🌹', count: 8, says: ['Wah cantiknya, makasih ya rose-nya!'] },
    gift: { emoji: '🎁', count: 12, says: ['WAAAH GIFT-NYA GEDE BANGET! MAKASIH!'] },
    follow: { emoji: '➕', count: 3, says: ['Makasih udah follow! Selamat datang!'] },
};

async function handleTrigger(action) {
    const t = TRIGGERS[action];
    if (!t || state.speaking) return;
    spawnReaction(t.emoji, t.count);
    triggerExpression('happy');
    if (action === 'gift') spawnReaction('✨', 10);
    await speak(t.says[Math.floor(Math.random() * t.says.length)]);
}

function initSparkles() {
    for (let i = 0; i < 40; i++) {
        const s = document.createElement('span');
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.animationDelay = Math.random() * 4 + 's';
        s.style.animationDuration = (3 + Math.random() * 3) + 's';
        els.sparkles.appendChild(s);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
els.sendBtn.addEventListener('click', () => {
    const t = els.userMsg.value.trim();
    if (t) { els.userMsg.value = ''; handleSendMessage(t); }
});
els.userMsg.addEventListener('keypress', (e) => { if (e.key === 'Enter') els.sendBtn.click(); });

document.querySelectorAll('.trigger-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTrigger(btn.dataset.action));
});

els.modelSelect.addEventListener('change', () => {
    updateUIVisibility();
    saveSettings();
    if (els.modelSelect.value !== 'custom') {
        loadModel(els.modelSelect.value);
    }
});

els.loadModelBtn.addEventListener('click', () => {
    const url = els.customModelUrl.value.trim();
    if (url) {
        saveSettings();
        loadModel(url);
    }
});

els.aiMode.addEventListener('change', () => { updateUIVisibility(); saveSettings(); });
els.ttsMode.addEventListener('change', () => { updateUIVisibility(); saveSettings(); });
els.elevenVoice.addEventListener('change', () => { updateUIVisibility(); saveSettings(); });

[els.apiKey, els.elevenApiKey, els.elevenCustomId, els.elevenModel,
 els.avatarName, els.personality, els.voiceSelect, els.customModelUrl].forEach(el => {
    el.addEventListener('change', saveSettings);
});

els.pitch.addEventListener('input', () => { els.pitchVal.textContent = els.pitch.value; saveSettings(); });
els.rate.addEventListener('input', () => { els.rateVal.textContent = els.rate.value; saveSettings(); });
els.modelSize.addEventListener('input', () => {
    els.sizeVal.textContent = els.modelSize.value;
    if (state.model) positionModel(state.model);
    saveSettings();
});

els.obsBtn.addEventListener('click', () => {
    document.body.classList.toggle('obs-mode');
    els.obsBtn.textContent = document.body.classList.contains('obs-mode')
        ? '✕ Keluar Mode OBS' : '📺 Mode OBS (Transparan)';
    if (state.pixiApp) {
        state.pixiApp.renderer.resize(els.avatarContainer.clientWidth, els.avatarContainer.clientHeight);
        if (state.model) positionModel(state.model);
    }
});

els.panelHeader.addEventListener('click', (e) => {
    if (e.target === els.togglePanel || e.target.closest('.panel-header')) {
        els.settingsPanel.classList.toggle('collapsed');
    }
});

document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (e.key === 'h' || e.key === 'H') els.settingsPanel.classList.toggle('collapsed');
    if (e.key === 'o' || e.key === 'O') els.obsBtn.click();
});

// ============================================
// INIT
// ============================================
loadSettings();
initSparkles();

// Load default model on startup
window.addEventListener('load', async () => {
    const url = els.modelSelect.value !== 'custom'
        ? els.modelSelect.value
        : els.customModelUrl.value;
    if (url) {
        await loadModel(url);
    } else {
        hideLoading();
    }

    // Welcome speech (delayed to avoid auto-play issues)
    setTimeout(() => {
        speak(`Halo! Aku ${els.avatarName.value || 'Mira'}, VTuber AI yang siap nemenin live kamu hari ini!`);
    }, 1500);
});
