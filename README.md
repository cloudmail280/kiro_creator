# 🎀 Avatar AI - TikTok Live Companion (Level 1)

Avatar AI 2D yang bisa **bicara**, **lip sync**, dan **bereaksi** ke trigger seperti like/gift. Cocok dipakai sebagai overlay TikTok Live via OBS.

**Live demo:** Buka file `index.html` di browser (Chrome/Edge recommended).

---

## ✨ Fitur

| Fitur | Detail |
|-------|--------|
| **Avatar 2D CSS Art** | Karakter anime girl dengan mata, mulut, blush, ribbon |
| **Lip Sync** | Mulut bergerak sesuai huruf (a/i/u/e/o) saat bicara |
| **TTS Suara Indonesia** | Pakai Web Speech API (gratis, offline) |
| **2 Mode AI** | Demo (offline, jawaban random) atau Gemini API (free tier) |
| **Quick Triggers** | Tombol Like, Rose, Big Gift, Follow → animasi + suara |
| **Click Avatar** | Klik avatar = avatar happy + emoji love bertebaran |
| **Auto Idle** | Avatar berkedip & melirik kanan-kiri otomatis |
| **OBS Mode** | Background transparan, panel hilang — siap dipakai sebagai browser source |
| **Personality Custom** | Edit nama & kepribadian avatar sesuai selera |
| **Pitch & Speed** | Atur tinggi suara dan kecepatan bicara |

---

## 🚀 Cara Pakai

### 1. Local (Buka Langsung)
1. Download semua file (`index.html`, `style.css`, `app.js`)
2. Buka `index.html` di Chrome/Edge
3. Setting nama avatar & mode AI di panel kiri
4. Mulai chat atau klik trigger button!

### 2. Online (GitHub Pages)
Repo ini bisa di-host gratis di GitHub Pages:
1. Settings → Pages → Source: `main` branch
2. Akses di `https://cloudmail280.github.io/kiro_creator/`

### 3. Pakai di OBS untuk TikTok Live
1. Buka avatar di browser, pilih **Mode OBS** (background transparan)
2. Di OBS, tambah **Browser Source**
3. URL: `file:///path/to/index.html` atau URL GitHub Pages
4. Width: 1920, Height: 1080
5. Centang **Refresh browser when scene becomes active**
6. Selama live, ketik comment penonton di panel atau trigger like/gift manual

---

## 🤖 Setup Gemini API (Opsional, untuk AI beneran)

Mode demo udah jalan tanpa setup, tapi kalau mau avatar bener-bener pintar:

1. Pergi ke https://aistudio.google.com/app/apikey
2. Login Google → klik **Create API Key**
3. Copy API key (format: `AIzaSy...`)
4. Di panel avatar, pilih Mode AI = **Gemini API**
5. Paste API key di kolom yang muncul
6. Edit Personality sesuai karakter avatar
7. Selesai! Sekarang avatar bisa jawab dengan AI sungguhan

**Free tier Gemini:** 15 request/menit, 1500 request/hari — cukup banget buat live.

---

## ⌨️ Keyboard Shortcuts

| Key | Fungsi |
|-----|--------|
| **H** | Hide/show panel settings |
| **O** | Toggle Mode OBS |
| **Enter** (di chat) | Kirim pesan |

---

## 🎨 Kustomisasi

Edit di file `style.css`:

```css
:root {
    --skin: #ffd9c0;       /* warna kulit */
    --hair: #6a4ce8;       /* warna rambut */
    --eye: #5b3aff;        /* warna mata */
    --mouth: #e85a8a;      /* warna mulut */
    --bg-1: #ffd6e8;       /* background gradient 1 */
    --bg-2: #c5b3ff;       /* background gradient 2 */
}
```

Ganti warna sesuai selera, refresh browser, langsung berubah!

---

## 🛠️ Tech Stack

- **HTML/CSS/JavaScript** vanilla — no framework
- **Web Speech API** — TTS gratis built-in browser
- **Gemini API** (opsional) — AI brain
- **CSS Animations** — semua animasi avatar dari CSS murni

---

## 📋 Roadmap (Next Levels)

- [ ] **Level 2**: Konek langsung ke TikTok Live (auto baca comment)
- [ ] **Level 3**: ElevenLabs voice + Live2D model + memory percakapan
- [ ] Multiple avatar/personality switcher
- [ ] Background music yang turun volume saat avatar bicara
- [ ] Counter total like/gift hari ini

---

## 📝 License

MIT — bebas dipakai & dimodifikasi.

Made with 💖 for TikTok creators.
