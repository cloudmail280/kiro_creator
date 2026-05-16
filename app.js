/* ============================================
   Avatar AI - Genshin Style + ElevenLabs TTS
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
    ttsMode: document.getElementById('ttsMode'),
    elevenApiKey: document.getElementById('elevenApiKey'),
    elevenVoice: document.getElementById('elevenVoice'),
    elevenCustomId: document.getElementById('elevenCustomId'),
    elevenModel: document.getElementById('elevenModel'),
    elevenCustomGroup: document.getElementById('elevenCustomGroup'),
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
    ttsAudio: document.getElementById('ttsAudio'),
};

// ----------- State -----------
const state = {
    speaking: false,
    voices: [],
};

// ----------- Settings persistence -----------
function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('avatarSettings') || '{}');
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
    els.pitchVal.textContent = els.pitch.value;
    els.rateVal.textContent = els.rate.value;
    updateUIVisibility();
}

function saveSettings() {
    localStorage.setItem('avatarSettings', JSON.stringify({
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
        voice: els.voiceSelect.value,
    }));
}

function updateUIVisibility() {
    // Show/hide Gemini API key
    els.apiKeyGroup.style.display = els.aiMode.value === 'gemini' ? 'block' : 'none';

    // Show/hide ElevenLabs config
    const isElevenLabs = els.ttsMode.value === 'elevenlabs';
    document.querySelectorAll('.elevenlabs-config').forEach(el => {
        el.style.display = isElevenLabs ? 'block' : 'none';
    });
    document.querySelectorAll('.browser-tts-config').forEach(el => {
        el.style.display = isElevenLabs ? 'none' : 'block';
    });

    // Custom voice ID input
    els.elevenCustomGroup.style.display =
        (isElevenLabs && els.elevenVoice.value === 'custom') ? 'block' : 'none';
}

// ----------- Browser Voice Setup -----------
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
    const saved = JSON.parse(localStorage.getItem('avatarSettings') || '{}');
    if (saved.voice && state.voices.find(v => v.name === saved.voice)) {
        els.voiceSelect.value = saved.voice;
    }
}

if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

// ----------- Lip Sync (SVG path animation) -----------
const MOUTH_PATHS = {
    'closed': 'M 240 380 Q 250 384 260 380',
    'a':      'M 234 376 Q 250 408 266 376 Q 250 392 234 376',
    'i':      'M 232 380 Q 250 388 268 380 Q 250 384 232 380',
    'u':      'M 244 378 Q 250 394 256 378 Q 250 388 244 378',
    'e':      'M 238 378 Q 250 398 262 378 Q 250 392 238 378',
    'o':      'M 238 374 Q 250 402 262 374 Q 250 392 238 374',
    'happy':  'M 230 374 Q 250 402 270 374',
};

function getMouthShapeForChar(ch) {
    ch = ch.toLowerCase();
    if ('a'.includes(ch)) return 'a';
    if ('iey'.includes(ch)) return 'i';
    if ('u'.includes(ch)) return 'u';
    if ('o'.includes(ch)) return 'o';
    if (' .,!?'.includes(ch)) return 'closed';
    return 'e';
}

let lipSyncTimer = null;
function startLipSync(text, durationMs = null) {
    stopLipSync();
    const chars = text.split('');
    let i = 0;
    // If we know total duration (ElevenLabs audio), distribute evenly
    const interval = durationMs
        ? Math.max(60, durationMs / chars.length)
        : Math.max(70, 100 / parseFloat(els.rate.value));

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
    setMouth('closed');
}

function setMouth(shape) {
    const mouthShape = els.mouth.querySelector('.mouth-shape');
    if (mouthShape && MOUTH_PATHS[shape]) {
        mouthShape.setAttribute('d', MOUTH_PATHS[shape]);
    }
}

// ----------- Speak (Browser TTS) -----------
function speakBrowser(text) {
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
            finishSpeaking();
            resolve();
        };
        utterance.onerror = () => {
            finishSpeaking();
            resolve();
        };

        window.speechSynthesis.speak(utterance);
    });
}

function finishSpeaking() {
    state.speaking = false;
    els.avatar.classList.remove('talking');
    stopLipSync();
    hideBubble();
    setStatus('Idle');
}

// ----------- Speak (ElevenLabs) -----------
async function speakElevenLabs(text) {
    const apiKey = els.elevenApiKey.value.trim();
    if (!apiKey) {
        logMessage('ai', '[ERROR] ElevenLabs API Key kosong, fallback ke Browser TTS');
        return speakBrowser(text);
    }

    let voiceId = els.elevenVoice.value;
    if (voiceId === 'custom') {
        voiceId = els.elevenCustomId.value.trim();
        if (!voiceId) {
            logMessage('ai', '[ERROR] Voice ID custom kosong, fallback ke Browser TTS');
            return speakBrowser(text);
        }
    }

    const model = els.elevenModel.value || 'eleven_multilingual_v2';

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
                model_id: model,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.4,
                    use_speaker_boost: true,
                },
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            logMessage('ai', `[ERROR ElevenLabs ${res.status}] ${errBody.slice(0, 150)}`);
            // Fallback to browser TTS
            hideBubble();
            return speakBrowser(text);
        }

        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        return new Promise((resolve) => {
            els.ttsAudio.src = audioUrl;

            els.ttsAudio.onloadedmetadata = () => {
                const durationMs = els.ttsAudio.duration * 1000;
                state.speaking = true;
                els.avatar.classList.add('talking');
                setStatus('Bicara (ElevenLabs)...');
                startLipSync(text, durationMs);
            };

            els.ttsAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                finishSpeaking();
                resolve();
            };

            els.ttsAudio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                finishSpeaking();
                logMessage('ai', '[ERROR] Audio playback gagal, fallback ke Browser TTS');
                speakBrowser(text).then(resolve);
            };

            els.ttsAudio.play().catch(err => {
                console.error('Play failed:', err);
                finishSpeaking();
                logMessage('ai', '[ERROR] Auto-play diblokir, klik avatar dulu');
                resolve();
            });
        });
    } catch (e) {
        console.error('ElevenLabs error:', e);
        hideBubble();
        logMessage('ai', `[ERROR] ${e.message}, fallback ke Browser TTS`);
        return speakBrowser(text);
    }
}

// Universal speak function
async function speak(text) {
    if (els.ttsMode.value === 'elevenlabs') {
        return speakElevenLabs(text);
    }
    return speakBrowser(text);
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
                    contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${userText}\nAvatar:` }] }],
                    generationConfig: { temperature: 0.9, maxOutputTokens: 100 }
                }),
            });
            if (!res.ok) {
                const errBody = await res.text();
                lastError = `${res.status}: ${errBody.slice(0, 200)}`;
                if (res.status === 400 || res.status === 401 || res.status === 403) {
                    throw new Error(lastError);
                }
                continue;
            }
            const data = await res.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (reply) return { ok: true, reply };
            lastError = 'Empty response';
        } catch (e) {
            lastError = e.message;
            if (e.message.includes('400') || e.message.includes('401') || e.message.includes('403')) break;
        }
    }
    return { ok: false, error: lastError || 'Unknown error' };
}

async function getAIResponse(userText) {
    if (els.aiMode.value === 'demo') {
        return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
    }
    const apiKey = els.apiKey.value.trim();
    if (!apiKey) {
        return 'Eh, set Gemini API Key dulu ya, atau pilih Mode Demo!';
    }
    const systemPrompt = els.personality.value || `Aku ${els.avatarName.value}, AI yang ramah.`;
    const result = await callGeminiAPI(userText, systemPrompt, apiKey);
    if (result.ok) return result.reply;

    logMessage('ai', `[ERROR Gemini] ${result.error}`);
    const err = (result.error || '').toLowerCase();
    if (err.includes('api_key') || err.includes('401') || err.includes('403')) {
        return 'API Key salah/belum aktif. Cek lagi di aistudio.google.com!';
    }
    if (err.includes('429') || err.includes('quota')) {
        return 'Quota AI habis, tunggu sebentar ya!';
    }
    return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
}

// ----------- Reactions -----------
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

// ----------- Send message -----------
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
        emoji: '❤️', count: 5,
        say: () => {
            const phrases = ['Makasih like-nya!', 'Yeay love love!', 'Aku juga sayang kalian!', 'Makasih banyak!'];
            return phrases[Math.floor(Math.random() * phrases.length)];
        },
        animate: () => els.avatar.classList.add('happy'),
    },
    rose: {
        emoji: '🌹', count: 8,
        say: () => 'Wah cantiknyaa, makasih banyak ya rose-nya!',
        animate: () => els.avatar.classList.add('happy'),
    },
    gift: {
        emoji: '🎁', count: 12,
        say: () => 'WAAAH GIFT-NYA GEDE BANGET! MAKASIH SAYANGGG!',
        animate: () => {
            els.avatar.classList.add('happy');
            spawnReaction('✨', 10);
        },
    },
    follow: {
        emoji: '➕', count: 3,
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

// ----------- Sparkles -----------
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

// ----------- Idle behavior -----------
function startIdleBehavior() {
    const eyelids = document.querySelectorAll('.eyelid');

    setInterval(() => {
        if (state.speaking) return;
        eyelids.forEach(lid => lid.setAttribute('ry', '32'));
        setTimeout(() => {
            eyelids.forEach(lid => lid.setAttribute('ry', '0'));
        }, 130);
    }, 3000 + Math.random() * 3000);

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
    updateUIVisibility();
    saveSettings();
});

els.ttsMode.addEventListener('change', () => {
    updateUIVisibility();
    saveSettings();
});

els.elevenVoice.addEventListener('change', () => {
    updateUIVisibility();
    saveSettings();
});

[els.apiKey, els.elevenApiKey, els.elevenCustomId, els.elevenModel,
 els.avatarName, els.personality, els.voiceSelect].forEach(el => {
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
        ? '✕ Keluar Mode OBS'
        : '📺 Mode OBS (Transparan)';
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

// ----------- Init -----------
loadSettings();
initSparkles();
startIdleBehavior();
setMouth('closed');

// Welcome
setTimeout(() => {
    speak(`Halo! Aku ${els.avatarName.value || 'Mira'}, siap nemenin live kamu hari ini!`);
}, 800);
