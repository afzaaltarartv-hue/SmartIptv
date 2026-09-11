# Universal M3U IPTV Player

A lightweight, ultra-low-latency, and responsive web-based IPTV player engineered for Smart TVs, iPhone 12 Pro Max, Android TV browsers, and desktop.

## Features

- **Multi-Backend Playback Engine**:
  - **Ultra-Low Latency HLS**: Synchronized to live broadcast edge.
  - **Balanced Buffer HLS**: Configurable 1s–15s buffer depth.
  - **Native Browser Engine**: Hardware-accelerated HLS playback for iOS Safari & Smart TVs.
- **iPhone 12 Pro Max & Mobile Optimized**:
  - Full safe-area inset support (`viewport-fit=cover`).
  - Edge-to-edge aspect ratio fill (19.5:9 zoom).
  - Pure OLED Black theme.
  - Mobile touch gestures: Vertical swipe left for brightness, swipe right for volume, double-tap left/right to seek ±10s.
- **Smart TV & Remote Control Mode**:
  - High-contrast D-pad focus outlines.
  - Remote shortcuts: `▲/▼` Volume & Channels, `◄/►` Seek, `Enter` Play/Pause, `F` Fullscreen, `M` Mute.
  - On-screen remote helper bar.
- **High-Fidelity 5-Band Audio Equalizer**:
  - 5-band graphic faders (60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz).
  - Preamp volume booster up to 220% (+8dB).
  - Bass shelf & dialogue clarity enhancers.
  - Audio presets: *Flat*, *Bass Boost*, *Dialogue Clear*, *Cinema*, *Night Mode*.
- **Playlist Management & Storage**:
  - Drag-and-drop `.m3u` / `.m3u8` file upload.
  - Direct M3U URL import with automatic CORS proxy.
  - Curated legal 24/7 live channels (NASA TV UHD, Bloomberg, Red Bull TV, Euronews, DW News, Sky News, 60FPS test stream).
  - Offline IndexedDB channel database.
  - Cross-device sync export/import (JSON).

## GitHub Pages Deployment

The automated workflow in `.github/workflows/deploy.yml` builds and deploys your website to GitHub Pages automatically.

### How to Prevent the "White Screen" on GitHub Pages:
GitHub Pages needs to serve the compiled build from `dist/`. Choose either of these two setup options:

#### Option 1 (Recommended): GitHub Actions Mode
1. In your GitHub repository, go to **Settings** → **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Go to the **Actions** tab and trigger or re-run the **Deploy to GitHub Pages** workflow.
4. Your site will be published at your GitHub Pages URL!

#### Option 2: Branch Mode (`gh-pages`)
1. Push your repository to GitHub. The workflow will automatically compile and commit your app to a branch called `gh-pages`.
2. In your GitHub repository, go to **Settings** → **Pages**.
3. Under **Branch**, select **`gh-pages`** and folder **`/ (root)`**, then click **Save**.

### Required GitHub Settings:
If the action ever reports permission issues:
- Go to **Settings** → **Actions** → **General**.
- Under **Workflow permissions**, select **Read and write permissions**, then click **Save**.
