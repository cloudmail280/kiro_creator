/* ============================================
   Avatar AI - TikTok Live Companion (Level 1)
   - Web Speech API for TTS
   - Lip-sync via mouth shape animation
   - Demo AI mode (offline) + Gemini API mode
   ============================================ */

// ----------- DOM References -----------
const els = {
    avatar: document.getElementById('avatar'),
    mouth: document.getElementById('mouth'),
    bubble: document.getElementById('speechBubble'),
    bubbleText: document.getElementById('bubbleText'),
    status: document.getElementById('status'),
    reactions: document.getElementById('reactions'),
    sparkles: document.getElementById('sparkles'),
    chatLog: document.getElementById('chatLog'),
    userMsg: document.getElementById('userMsg'),
    sendBtn: document.getElementById('sendBtn'),
    aiMode: document.getElementById('aiMode'),
    apiKeyGroup: document.getElementById('apiKeyGroup'),
    apiKey: document.getElementById('apiKey'),
    avatarName: document.getElementById('avatarName'),
    personality: document.getElementById('personality'),
    voiceSelect: document.getElementById('voiceSelect'),
    pitch: document.getElementById('pitch'),
    pitchVal: document.getElementById('pitchVal'),
    rate: document.getElementById('rate'),
    rateVal: document.getElementById('rateVal'),
    obsBtn: document.getElementById('obsMode'),
    settingsPanel: document.getElementById('settingsPanel'),
    togglePanel: document.getElementById('togglePanel'),
    panelHeader: document.querySelector('.panel-header'),
};

// ----------- State -----------
const state = {
    speaking: false,
    voices: [],
    selectedVoice: null,
};

// ----------- Settings persistence -----------
function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('avatarSettings') || '{}');
    if (saved.aiMode) els.aiMode.value = saved.aiMode;
    if (saved.apiKey) els.apiKey.value = saved.apiKey;
    if (saved.avatarName) els.avatarName.value = saved.avatarName;
    if (saved.personality) els.personality.value = saved.personality;
    if (saved.pitch) els.pitch.value = saved.pitch;
    if (saved.rate) els.rate.value = saved.rate;
    els.pitchVal.textContent = els.pitch.value;
    els.rateVal.textContent = els.rate.value;
    els.apiKeyGroup.style.display = els.aiMode.value === 'gemini' ? 'block' : 'none';
}

function saveSettings() {
    localStorage.setItem('avatarSettings', JSON.stringify({
        aiMode: els.aiMode.value,
        apiKey: els.apiKey.value,
        avatarName: els.avatarName.value,
        personality: els.personality.value,
        pitch: els.pitch.value,
        rate: els.rate.value,
        voice: els.voiceSelect.value,
    }));
}

// ----------- Voice Setup -----------
function loadVoices() {
    state.voices = window.speechSynthesis.getVoices();
    els.voiceSelect.innerHTML = '';

    // Prefer Indonesian voices first
    const sorted = [...state.voices].sort((a, b) => {
        const aId = a.lang.toLowerCase().startsWith('id') ? -1 : 0;
        const bId = b.lang.toLowerCase().startsWith('id') ? -1 : 0;
        return aId - bId;
    });

    sorted.forEach((voice, idx) => {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})`;
        els.voiceSelect.appendChild(opt);
    });

    const saved = JSON.parse(localStorage.getItem('avatarSettings') || '{}');
    if (saved.voice && state.voices.find(v => v.name === saved.voice)) {
        els.voiceSelect.value = saved.voice;
    }
}

if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

// ----------- Lip Sync -----------
const MOUTH_SHAPES = ['shape-a', 'shape-i', 'shape-u', 'shape-e', 'shape-o', 'shape-closed'];

function getMouthShapeForChar(ch) {
    ch = ch.toLowerCase();
    if ('a'.includes(ch)) return 'shape-a';
    if ('iey'.includes(ch)) return 'shape-i';
    if ('u'.includes(ch)) return 'shape-u';
    if ('o'.includes(ch)) return 'shape-o';
    if (' .,!?'.includes(ch)) return 'shape-closed';
    return 'shape-e';
}

let lipSyncTimer = null;
function startLipSync(text) {
    stopLipSync();
    const chars = text.split('');
    let i = 0;
    // Sync speed approximated to TTS rate
    const interval = Math.max(60, 100 / parseFloat(els.rate.value));

    lipSyncTimer = setInterval(() => {
        if (i >= chars.length) {
            stopLipSync();
            return;
        }
        setMouth(getMouthShapeForChar(chars[i]));
        i++;
    }, interval);
}

function stopLipSync() {
    if (lipSyncTimer) {
        clearInterval(lipSyncTimer);
        lipSyncTimer = null;
    }
    setMouth('shape-closed');
}

function setMouth(shape) {
    MOUTH_SHAPES.forEach(s => els.mouth.classList.remove(s));
    els.mouth.classList.add(shape);
}

// ----------- Speak -----------
function speak(text) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            console.warn('Speech Synthesis not supported');
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

        utterance.onstart = () => {
            state.speaking = true;
            els.avatar.classList.add('talking');
            setStatus('Bicara...');
            startLipSync(text);
            showBubble(text, 0);
        };

        utterance.onend = () => {
            state.speaking = false;
            els.avatar.classList.remove('talking');
            stopLipSync();
            hideBubble();
            setStatus('Idle');
            resolve();
        };

        utterance.onerror = () => {
            stopLipSync();
            els.avatar.classList.remove('talking');
            hideBubble();
            resolve();
        };

        window.speechSynthesis.speak(utterance);
    });
}

// ----------- Speech Bubble -----------
let bubbleTimer = null;
function showBubble(text, autoHideMs = 3000) {
    if (bubbleTimer) clearTimeout(bubbleTimer);
    els.bubbleText.textContent = text;
    els.bubble.classList.add('show');
    if (autoHideMs > 0) {
        bubbleTimer = setTimeout(hideBubble, autoHideMs);
    }
}

function hideBubble() {
    els.bubble.classList.remove('show');
}

// ----------- Status -----------
function setStatus(text) {
    els.status.textContent = text;
}

// ----------- Chat Log -----------
function logMessage(who, text) {
    const div = document.createElement('div');
    div.className = who === 'user' ? 'msg-user' : 'msg-ai';
    div.textContent = (who === 'user' ? '> ' : '🤖 ') + text;
    els.chatLog.appendChild(div);
    els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

// ----------- AI Brain -----------
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
    'Ohh begituu, makasih udah kasih tau!',
    'Eitss jangan gitu dong, hihi~',
    'Wuaa aku senang banget hari ini bareng kalian!',
];

// List of Gemini models to try (fallback order)
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-pro',
];

async function callGeminiAPI(userText, systemPrompt, apiKey) {
    let lastError = null;

    for (const model of GEMINI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\nUser: ${userText}\nAvatar:` }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 100,
                    }
                }),
            });

            if (!res.ok) {
                const errBody = await res.text();
                lastError = `${res.status}: ${errBody.slice(0, 200)}`;
                console.warn(`Gemini ${model} failed:`, lastError);
                // If 400/401/403, key issue — stop trying other models
                if (res.status === 400 || res.status === 401 || res.status === 403) {
                    throw new Error(lastError);
                }
                continue; // Try next model on 404 (model not found)
            }

            const data = await res.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (reply) {
                console.log(`Gemini OK with ${model}`);
                return { ok: true, reply };
            }
            lastError = 'Empty response';
        } catch (e) {
            lastError = e.message;
            console.error(`Error with ${model}:`, e);
            // If clear auth/key error, stop
            if (e.message.includes('400') || e.message.includes('401') || e.message.includes('403') || e.message.includes('API_KEY')) {
                break;
            }
        }
    }

    return { ok: false, error: lastError || 'Unknown error' };
}

async function getAIResponse(userText) {
    if (els.aiMode.value === 'demo') {
        return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
    }

    // Gemini API mode
    const apiKey = els.apiKey.value.trim();
    if (!apiKey) {
        return 'Eh, aku belum punya kunci AI nih. Set dulu API Key-nya ya, atau pilih Mode Demo!';
    }

    const systemPrompt = els.personality.value || `Aku ${els.avatarName.value}, AI yang ramah.`;
    const result = await callGeminiAPI(userText, systemPrompt, apiKey);

    if (result.ok) {
        return result.reply;
    }

    // Show actual error in chat log for debugging
    logMessage('ai', `[ERROR Gemini] ${result.error}`);

    // Detect specific errors
    const err = (result.error || '').toLowerCase();
    if (err.includes('api_key') || err.includes('api key not valid') || err.includes('401') || err.includes('403')) {
        return 'API Key-nya salah atau belum aktif. Cek lagi di aistudio.google.com ya!';
    }
    if (err.includes('quota') || err.includes('429') || err.includes('rate')) {
        return 'Quota AI-nya habis nih, tunggu sebentar ya!';
    }
    if (err.includes('failed to fetch') || err.includes('network')) {
        return 'Koneksi internet error, cek WiFi/data kamu ya!';
    }
    if (err.includes('safety') || err.includes('blocked')) {
        return 'Hmm pesannya kena filter aman, coba pesan lain ya!';
    }

    // Fallback: use demo response
    return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
}

// ----------- Reactions (emoji float) -----------
function spawnReaction(emoji, count = 1) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'reaction';
            el.textContent = emoji;
            el.style.left = (40 + Math.random() * 60) + '%';
            el.style.top = (40 + Math.random() * 30) + '%';
            els.reactions.appendChild(el);
            setTimeout(() => el.remove(), 2000);
        }, i * 100);
    }
}

// ----------- Send message handler -----------
async function handleSendMessage(text) {
    if (!text.trim() || state.speaking) return;

    logMessage('user', text);
    setStatus('Berpikir...');

    const reply = await getAIResponse(text);
    logMessage('ai', reply);
    await speak(reply);
}

// ----------- Quick Triggers -----------
const TRIGGER_RESPONSES = {
    like: {
        emoji: '❤️',
        count: 5,
        say: () => {
            const phrases = ['Makasih like-nya!', 'Yeay love love!', 'Aku juga sayang kalian!', 'Makasih!'];
            return phrases[Math.floor(Math.random() * phrases.length)];
        },
        animate: () => els.avatar.classList.add('happy'),
    },
    rose: {
        emoji: '🌹',
        count: 8,
        say: () => 'Wah cantiknyaa, makasih banyak ya rose-nya!',
        animate: () => els.avatar.classList.add('happy'),
    },
    gift: {
        emoji: '🎁',
        count: 12,
        say: () => 'WAAAH GIFT-NYA GEDE BANGET! MAKASIH SAYANGGG!',
        animate: () => {
            els.avatar.classList.add('happy');
            spawnReaction('✨', 10);
        },
    },
    follow: {
        emoji: '➕',
        count: 3,
        say: () => 'Makasih udah follow! Selamat datang di keluarga kita!',
        animate: () => els.avatar.classList.add('happy'),
    },
};

async function handleTrigger(action) {
    const trigger = TRIGGER_RESPONSES[action];
    if (!trigger || state.speaking) return;
    spawnReaction(trigger.emoji, trigger.count);
    trigger.animate();
    setTimeout(() => els.avatar.classList.remove('happy'), 1500);
    await speak(trigger.say());
}

// ----------- Sparkles background -----------
function initSparkles() {
    for (let i = 0; i < 30; i++) {
        const s = document.createElement('span');
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.animationDelay = Math.random() * 4 + 's';
        s.style.animationDuration = (3 + Math.random() * 3) + 's';
        els.sparkles.appendChild(s);
    }
}

// ----------- Auto blink + look around -----------
function startIdleBehavior() {
    // Blink every 3-6 seconds
    setInterval(() => {
        if (state.speaking) return;
        els.avatar.classList.add('blink');
        setTimeout(() => els.avatar.classList.remove('blink'), 150);
    }, 3000 + Math.random() * 3000);

    // Look around occasionally
    setInterval(() => {
        if (state.speaking) return;
        const dirs = ['look-left', 'look-right', 'look-up', ''];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        els.avatar.classList.remove('look-left', 'look-right', 'look-up');
        if (dir) els.avatar.classList.add(dir);
        setTimeout(() => {
            els.avatar.classList.remove('look-left', 'look-right', 'look-up');
        }, 1500);
    }, 5000);
}

// ----------- Tap interaction -----------
els.avatar.style.pointerEvents = 'auto';
els.avatar.style.cursor = 'pointer';
els.avatar.addEventListener('click', () => {
    if (state.speaking) return;
    spawnReaction('💖', 3);
    els.avatar.classList.add('happy');
    setTimeout(() => els.avatar.classList.remove('happy'), 800);
});

// ----------- Event Listeners -----------
els.sendBtn.addEventListener('click', () => {
    const text = els.userMsg.value.trim();
    if (text) {
        els.userMsg.value = '';
        handleSendMessage(text);
    }
});

els.userMsg.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') els.sendBtn.click();
});

document.querySelectorAll('.trigger-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTrigger(btn.dataset.action));
});

els.aiMode.addEventListener('change', () => {
    els.apiKeyGroup.style.display = els.aiMode.value === 'gemini' ? 'block' : 'none';
    saveSettings();
});

[els.apiKey, els.avatarName, els.personality, els.voiceSelect].forEach(el => {
    el.addEventListener('change', saveSettings);
});

els.pitch.addEventListener('input', () => {
    els.pitchVal.textContent = els.pitch.value;
    saveSettings();
});

els.rate.addEventListener('input', () => {
    els.rateVal.textContent = els.rate.value;
    saveSettings();
});

els.obsBtn.addEventListener('click', () => {
    document.body.classList.toggle('obs-mode');
    els.obsBtn.textContent = document.body.classList.contains('obs-mode')
        ? 'Keluar Mode OBS'
        : 'Mode OBS (Background Transparan)';
});

els.panelHeader.addEventListener('click', (e) => {
    if (e.target === els.togglePanel || e.target.closest('.panel-header')) {
        els.settingsPanel.classList.toggle('collapsed');
    }
});

// Press 'H' to toggle panel (useful for OBS)
document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            els.settingsPanel.classList.toggle('collapsed');
        }
    }
    // Press 'O' to toggle OBS mode
    if (e.key === 'o' || e.key === 'O') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            els.obsBtn.click();
        }
    }
});

// ----------- Init -----------
loadSettings();
initSparkles();
startIdleBehavior();
setMouth('shape-closed');

// Welcome
setTimeout(() => {
    speak(`Halo! Aku ${els.avatarName.value || 'Mira'}, siap nemenin live kamu hari ini!`);
}, 800);
