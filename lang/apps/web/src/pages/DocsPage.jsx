import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MarketingNav, MarketingFooter } from '@/pages/MarketingShared'
import { APP_ROUTES } from '@/lib/routes'

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
const Icon = {
  Rocket: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/>
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  Monitor: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  Camera: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  Wifi: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M1 6s5.5-5 11-5 11 5 11 5"/>
      <path d="M5 10s3.5-3 7-3 7 3 7 3"/>
      <path d="M9 14s1.5-1 3-1 3 1 3 1"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  Wrench: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  CreditCard: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  Mic: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  ),
  Search: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Apple: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ),
  Windows: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  ),
  Linux: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021C7.309.356 4.945 2.396 3.337 5.67c-.87 1.775-1.043 3.87-.726 5.8.217 1.318.689 2.604 1.415 3.618.315.434.621.694.825.734.213.043.4-.038.578-.199l.002-.001c.18-.161.327-.378.44-.658.174-.43.253-1.053.253-2.046V12c0-1.037.073-1.92.258-2.593.298-1.083.905-1.786 1.876-2.178.396-.16.807-.23 1.218-.23 1.06 0 2.145.417 2.907 1.098.655.582 1.027 1.333 1.121 2.166.068.6-.002 1.192-.176 1.684l.002-.002c-.213.603-.559 1.034-.997 1.25-.408.2-.868.193-1.278-.022-.338-.18-.576-.494-.672-.91-.076-.33-.043-.67.079-.953.145-.33.393-.568.705-.657.122-.034.243-.05.362-.05.285 0 .548.092.76.265l.001.001c.228.186.388.466.437.8.058.41-.044.82-.28 1.11-.104.127-.217.228-.336.304l.003-.002c-.267.17-.573.232-.88.165-.31-.068-.573-.26-.742-.548-.12-.202-.19-.457-.19-.737 0-.354.097-.673.273-.924.166-.236.4-.39.654-.444l-.003.001c.132-.028.264-.04.393-.04.285 0 .558.083.789.247l.003.002c.237.167.43.42.553.736.13.328.175.713.115 1.065-.065.376-.244.702-.512.922l-.001.001c-.267.22-.59.34-.93.34-.097 0-.195-.01-.29-.031l.005.001c-.617-.138-1.118-.624-1.312-1.275-.14-.47-.12-.977.05-1.443l-.001.003c.2-.533.574-.963 1.053-1.211.446-.232.954-.273 1.431-.111l-.004-.001c.495.166.9.54 1.131 1.053.24.54.27 1.17.075 1.758l.001-.002c-.2.598-.624 1.07-1.163 1.296-.546.23-1.155.201-1.68-.077l.003.001c-.525-.278-.906-.793-1.026-1.432-.097-.521-.032-1.06.18-1.517l-.002.003c.221-.476.6-.844 1.06-1.027l-.003.001c.265-.102.547-.15.827-.142l-.002-.001c.305.01.607.101.875.265l-.002-.001c.282.172.517.43.682.756.177.347.258.764.225 1.172-.037.443-.196.847-.456 1.148l.001-.001c-.26.302-.61.485-.977.517l-.003.001c-.133.012-.266.01-.395-.006l.005.001c-.4-.05-.767-.262-1.021-.604l.001.001c-.267-.361-.38-.838-.311-1.307.07-.47.304-.883.657-1.154.324-.248.72-.365 1.11-.329l-.003-.001c.4.037.78.228 1.055.546l-.001-.001c.286.33.444.782.438 1.265-.005.484-.175.942-.469 1.284-.265.31-.612.481-.97.481-.082 0-.163-.009-.243-.027l.005.001c-.52-.116-.945-.527-1.119-1.101-.126-.414-.095-.864.085-1.268l-.001.003c.184-.41.507-.727.9-.877.28-.106.579-.118.862-.035l-.002-.001z"/>
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   ARTICLE DATA
───────────────────────────────────────────── */
const CATEGORIES = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    desc: 'Set up your profile, pick your language, and start your first session.',
    color: '#c9a97a',
    bg: '#f5ede0',
    icon: <Icon.Rocket />,
    articles: [
      {
        id: 'what-is-uselang',
        title: 'What is UseLang?',
        desc: 'A quick overview of how voice-first AI language coaching works.',
        content: [
          { type: 'p', text: 'UseLang is a voice-first AI language coach. Rather than memorizing flashcards or watching video lessons, you just speak — in any language you\'re learning — and the AI listens, corrects, and coaches you in real time.' },
          { type: 'h2', text: 'How it works' },
          { type: 'steps', items: [
            'Choose the language you want to learn and your current level.',
            'Press the microphone button and say anything — a word, a sentence, a whole paragraph.',
            'The AI responds like a tutor: it acknowledges what you said, corrects any mistakes, and continues the conversation.',
            'Over time, it adjusts its difficulty to match your progress.',
          ]},
          { type: 'h2', text: 'What makes it different' },
          { type: 'list', items: [
            'Real-time pronunciation feedback — not just grammar',
            'Adapts to your correction tolerance (gentle vs. strict)',
            'Works completely offline with a local AI model',
            'Available on web, desktop (Mac/Windows/Linux), and mobile',
            'Language Lens: point your camera or take a screenshot to learn from anything on your screen',
          ]},
          { type: 'p', text: 'UseLang is not a replacement for human conversation, but it gives you a low-stakes environment to build fluency before you need it in the real world.' },
        ],
      },
      {
        id: 'set-up-profile',
        title: 'Setting up your profile',
        desc: 'Choose your target language, native language, goal, and coaching style.',
        content: [
          { type: 'p', text: 'When you first sign up, UseLang walks you through a 6-step onboarding to personalize your experience. You can change any of these settings later in the Settings tab.' },
          { type: 'h2', text: 'The 6 steps' },
          { type: 'steps', items: [
            'Language you\'re learning — pick from French, Spanish, Arabic, Mandarin, Italian, German, Dutch, or English.',
            'Language you already speak — so the AI knows how to bridge explanations.',
            'Your goal — travel, work, family, school, or general interest.',
            'Confidence level — beginner, basics, or conversational.',
            'Coaching style — encouraging, balanced, or strict.',
            'Correction intensity — light (major mistakes only), balanced, or strict (every detail).',
          ]},
          { type: 'tip', text: 'Not sure about your level? Pick "beginner" — the AI will naturally calibrate up within a few sessions based on your responses.' },
        ],
      },
      {
        id: 'first-session',
        title: 'Your first conversation',
        desc: 'What to expect when you press the mic button for the first time.',
        content: [
          { type: 'p', text: 'Once your profile is set up, tap the microphone button on the main screen. The AI will greet you in your target language and prompt you to respond.' },
          { type: 'h2', text: 'Tips for your first session' },
          { type: 'list', items: [
            'Speak naturally, even if you only know a few words — the AI handles mixed-language input.',
            'Don\'t rush. Silence is fine. The AI waits for you to finish.',
            'If you don\'t understand something the AI said, just say "Can you explain that?" or "Say it again more slowly."',
            'The AI remembers what you covered in this session. Previous sessions can be reviewed in the History tab.',
          ]},
          { type: 'h2', text: 'What the AI corrects' },
          { type: 'p', text: 'Depending on your correction intensity setting, the AI will flag pronunciation issues, wrong word gender (e.g. Spanish articles), tense errors, or word-order mistakes. It always finishes the correction with encouragement and continues the flow of conversation.' },
        ],
      },
      {
        id: 'understanding-progress',
        title: 'Understanding your progress',
        desc: 'How UseLang tracks vocabulary, fluency, and session streaks.',
        content: [
          { type: 'p', text: 'UseLang tracks three things: session streaks, words encountered, and correction trends. You can see all of this in the Usage Dashboard.' },
          { type: 'h2', text: 'Session streaks' },
          { type: 'p', text: 'A streak counts any day you complete at least one session. Missing a day resets the streak. Pro plan users can freeze streaks for up to 3 days per month.' },
          { type: 'h2', text: 'Words encountered' },
          { type: 'p', text: 'Every word or phrase the AI introduces is logged. You can review your word list by filtering the History tab by "Vocabulary".' },
          { type: 'h2', text: 'Correction trends' },
          { type: 'p', text: 'Over time, if the AI is correcting the same mistake repeatedly, it will flag it as a "known weakness" and actively practice it with you during future sessions.' },
        ],
      },
    ],
  },
  {
    id: 'desktop-app',
    label: 'Desktop App',
    desc: 'Install and configure the native app on Mac, Windows, or Linux.',
    color: '#a07c52',
    bg: '#f0e6d6',
    icon: <Icon.Monitor />,
    articles: [
      {
        id: 'install-macos',
        title: 'Install on macOS',
        desc: 'Menu bar app with global hotkeys and system-level microphone access.',
        platforms: ['macos'],
        content: [
          { type: 'p', text: 'The macOS app lives in your menu bar — a small icon that\'s always one click away, no matter which app you\'re in. It requires macOS 13 (Ventura) or later.' },
          { type: 'h2', text: 'Installation' },
          { type: 'steps', items: [
            'Go to the Downloads page and click "Download for macOS".',
            'Open the downloaded .dmg file.',
            'Drag UseLang.app into your Applications folder.',
            'On first launch: right-click the app → Open (needed once to bypass Gatekeeper).',
            'Grant microphone access when macOS asks.',
            'The UseLang icon appears in your menu bar.',
          ]},
          { type: 'h2', text: 'Global hotkey' },
          { type: 'p', text: 'Press ⌘ Shift L anywhere on your Mac to open UseLang and start a session. Change the hotkey under Preferences → Shortcuts.' },
          { type: 'h2', text: 'Language Lens (screenshot coaching)' },
          { type: 'p', text: 'Press ⌘ Shift S to enter Language Lens mode. Click and drag to capture any region of your screen. UseLang reads the text, translates it, and launches a focused lesson on the vocabulary and grammar it found.' },
          { type: 'tip', text: 'Language Lens works with any on-screen text — websites, emails, PDFs, subtitles, menus, product packaging. If your camera is on, it also reads text from physical objects in the camera feed.' },
          { type: 'h2', text: 'Uninstall' },
          { type: 'p', text: 'Drag UseLang.app from Applications to Trash. Your learning data stays in your account and syncs back if you reinstall.' },
        ],
      },
      {
        id: 'install-windows',
        title: 'Install on Windows',
        desc: 'System tray app with Snipping Tool integration and Win+Shift+L hotkey.',
        platforms: ['windows'],
        content: [
          { type: 'p', text: 'The Windows app runs in your system tray (bottom-right of the taskbar). It supports Windows 10 (build 1903+) and Windows 11.' },
          { type: 'h2', text: 'Installation' },
          { type: 'steps', items: [
            'Go to the Downloads page and click "Download for Windows".',
            'Run the UseLang-Setup.exe installer.',
            'Follow the installer prompts. No admin rights required for a per-user install.',
            'UseLang starts automatically and appears in the system tray.',
            'Click Allow if Windows Defender SmartScreen prompts you.',
            'Grant microphone access in Windows Settings → Privacy → Microphone.',
          ]},
          { type: 'h2', text: 'Global hotkey' },
          { type: 'p', text: 'Press Win + Shift + L anywhere on Windows to open UseLang. Change the hotkey in the app\'s Settings → Shortcuts tab.' },
          { type: 'h2', text: 'Language Lens on Windows' },
          { type: 'p', text: 'Press Win + Shift + S to open the built-in Snipping Tool, then switch to UseLang mode by clicking the UseLang tray icon and selecting "Language Lens from clipboard". UseLang automatically detects when an image is copied to the clipboard and offers to analyze it.' },
          { type: 'p', text: 'Alternatively, press Win + Shift + U to activate UseLang\'s built-in region-capture tool directly — no Snipping Tool needed.' },
          { type: 'h2', text: 'Screen recording mode' },
          { type: 'p', text: 'Open Settings → Language Lens → Enable screen recording mode. UseLang will watch a selected window (or your whole screen) and pop up vocabulary cards when it detects new text or speech — great for watching foreign-language shows or playing games in your target language.' },
          { type: 'tip', text: 'For gaming: enable "Game overlay mode" in Settings. UseLang draws a semi-transparent coaching overlay without leaving your game window.' },
          { type: 'h2', text: 'Uninstall' },
          { type: 'p', text: 'Go to Settings → Apps → Installed Apps → UseLang → Uninstall. Your account data is stored in the cloud and is not deleted.' },
        ],
      },
      {
        id: 'install-linux',
        title: 'Install on Linux',
        desc: 'AppImage, .deb, .rpm, and CLI tool. Supports X11 and Wayland.',
        platforms: ['linux'],
        content: [
          { type: 'p', text: 'UseLang is available for Linux as an AppImage (runs anywhere), .deb (Debian/Ubuntu), .rpm (Fedora/RHEL), and a CLI tool for headless or tiling WM setups.' },
          { type: 'h2', text: 'AppImage (any distro)' },
          { type: 'code', lang: 'bash', text: `# Download
curl -L https://dl.uselang.com/linux/UseLang.AppImage -o UseLang.AppImage

# Make executable
chmod +x UseLang.AppImage

# Run
./UseLang.AppImage` },
          { type: 'h2', text: 'Debian / Ubuntu (.deb)' },
          { type: 'code', lang: 'bash', text: `wget https://dl.uselang.com/linux/uselang_latest_amd64.deb
sudo dpkg -i uselang_latest_amd64.deb` },
          { type: 'h2', text: 'Fedora / RHEL (.rpm)' },
          { type: 'code', lang: 'bash', text: `sudo dnf install https://dl.uselang.com/linux/uselang_latest.x86_64.rpm` },
          { type: 'h2', text: 'Global hotkey (X11 & Wayland)' },
          { type: 'p', text: 'In the app\'s Preferences → Shortcuts, set your preferred hotkey. On Wayland compositors without global hotkey support, use the xdg-open URI scheme: add a custom binding to uselang://start in your compositor config.' },
          { type: 'h2', text: 'Language Lens on Linux' },
          { type: 'p', text: 'UseLang integrates with popular screenshot tools. When you take a screenshot that is saved to ~/Pictures or copied to clipboard, UseLang detects it and offers to analyze it.' },
          { type: 'p', text: 'Supported tools: gnome-screenshot, flameshot, spectacle (KDE), scrot, grim (Wayland).' },
          { type: 'code', lang: 'bash', text: `# CLI usage — pipe any screenshot into UseLang
flameshot gui --raw | uselang lens --stdin --lang fr` },
          { type: 'h2', text: 'Screen recording (OBS integration)' },
          { type: 'p', text: 'Enable the UseLang OBS Plugin to run language coaching alongside any OBS scene. Install from the OBS Plugin Manager or manually place the plugin file into ~/.config/obs-studio/plugins/.' },
          { type: 'tip', text: 'Running UseLang on a server? Use the headless CLI: uselang session --lang es --tts-engine espeak for a fully terminal-based coaching session.' },
        ],
      },
      {
        id: 'local-ai-setup',
        title: 'Local Gemma setup',
        desc: 'Run UseLang offline using the on-device Gemma runtime.',
        content: [
          { type: 'p', text: 'UseLang tutor text runs through local Gemma on the device. The app does not call cloud LLMs or OpenAI-compatible chat APIs.' },
          { type: 'h2', text: 'Requirements' },
          { type: 'list', items: [
            '8 GB RAM minimum (16 GB recommended for smooth performance)',
            '5 GB free disk space for the model',
            'A native mobile build with the Gemma inference runtime',
            'Bundled/local Gemma model, tokenizer, and tokenizer_config files',
          ]},
          { type: 'h2', text: 'Setup' },
          { type: 'steps', items: [
            'Build the native app with the inference module included.',
            'Bundle Gemma model files with the app or install them into a local file:// location.',
            'Set EXPO_PUBLIC_GEMMA_MODEL_SOURCE, EXPO_PUBLIC_GEMMA_TOKENIZER_SOURCE, and EXPO_PUBLIC_GEMMA_TOKENIZER_CONFIG_SOURCE to those local files.',
            'Open Settings → Offline and load Gemma.',
          ]},
          { type: 'h2', text: 'Verifying the connection' },
          { type: 'p', text: 'Settings → Offline shows whether local Gemma is loaded. Remote model URLs are rejected.' },
        ],
      },
    ],
  },
  {
    id: 'language-lens',
    label: 'Language Lens',
    desc: 'Screenshot, screen record, or point your camera — learn from anything.',
    color: '#8a7c6e',
    bg: '#ede8e0',
    icon: <Icon.Camera />,
    articles: [
      {
        id: 'what-is-language-lens',
        title: 'What is Language Lens?',
        desc: 'The screen-reading AI agent that teaches you from real-world content.',
        content: [
          { type: 'p', text: 'Language Lens is a feature of the UseLang desktop app that turns anything visible on your screen (or through your camera) into a live language lesson.' },
          { type: 'h2', text: 'What it can read' },
          { type: 'list', items: [
            'Text on websites, PDFs, emails, and documents',
            'Subtitles in videos (Netflix, YouTube, VLC, any player)',
            'Text in images and photos',
            'On-screen UI text in apps or games',
            'Physical text captured via your webcam or phone camera',
            'Menus, signs, packaging, books',
          ]},
          { type: 'h2', text: 'What it teaches' },
          { type: 'p', text: 'For each piece of text Language Lens captures, it provides: a translation, a pronunciation guide, a grammar breakdown for key phrases, and a set of example sentences to practice with. You can then tap the mic and have a conversation about what you just saw.' },
          { type: 'h2', text: 'Screenshot vs. screen recording vs. camera' },
          { type: 'list', items: [
            'Screenshot: capture once, analyze a moment. Best for reading something quickly.',
            'Screen recording: continuous monitoring of a window. Best for watching shows or playing games in your target language.',
            'Camera: point at physical objects. Best for menus, signs, books, flashcards, product labels.',
          ]},
          { type: 'tip', text: 'Language Lens works best when your target language is actually on screen. If you\'re watching an English show with English subtitles, switch the subtitle track to your target language first — then Language Lens can coach you on what you\'re reading.' },
        ],
      },
      {
        id: 'lens-macos',
        title: 'Language Lens on macOS',
        desc: 'Global hotkeys, region capture, and menu bar quick-launch.',
        platforms: ['macos'],
        content: [
          { type: 'h2', text: 'Hotkeys' },
          { type: 'list', items: [
            '⌘ Shift S — region screenshot → instant lesson',
            '⌘ Shift R — start/stop screen recording on selected window',
            '⌘ Shift C — open camera lens (uses front or back camera)',
            '⌘ Shift L — open main UseLang window',
          ]},
          { type: 'h2', text: 'Screen recording mode' },
          { type: 'p', text: 'When screen recording is active, UseLang runs in the background. A subtle floating badge shows "Lens ON". Every 3–10 seconds (configurable), it grabs a frame, checks for new text, and if it finds new content in your target language, it shows a coaching card in the corner of your screen.' },
          { type: 'p', text: 'You can configure the sensitivity, card position, and auto-dismiss timing in Preferences → Language Lens.' },
          { type: 'h2', text: 'Do Not Disturb integration' },
          { type: 'p', text: 'Language Lens respects macOS Focus Mode. When Do Not Disturb is on, coaching cards are queued and shown when DND is lifted.' },
        ],
      },
      {
        id: 'lens-windows',
        title: 'Language Lens on Windows',
        desc: 'Clipboard monitoring, Win+Shift+U capture, and game overlay.',
        platforms: ['windows'],
        content: [
          { type: 'h2', text: 'Hotkeys' },
          { type: 'list', items: [
            'Win + Shift + U — region capture → instant lesson',
            'Win + Shift + R — start/stop screen recording',
            'Win + Shift + C — open camera lens',
            'Win + Shift + L — open main UseLang window',
          ]},
          { type: 'h2', text: 'Clipboard auto-detect' },
          { type: 'p', text: 'When enabled (Settings → Language Lens → Monitor clipboard), UseLang watches for new images or text copied to the clipboard. Any time you copy foreign-language text — from a browser, PDF, or email — UseLang immediately offers to coach you on it.' },
          { type: 'h2', text: 'Game overlay' },
          { type: 'p', text: 'Enable game overlay mode (Settings → Language Lens → Game overlay) to get a DirectX/Vulkan-compatible transparent overlay. UseLang reads on-screen text in games that display text in your target language — great for RPGs, strategy games, or any game available in a foreign language.' },
          { type: 'h2', text: 'Xbox Game Bar widget' },
          { type: 'p', text: 'Press Win + G while gaming to open Game Bar, then find the UseLang widget. It shows your current coaching card and a mic button without you needing to alt-tab out of your game.' },
          { type: 'tip', text: 'Change the game language in your Steam/Epic/GOG settings, then launch the game. UseLang\'s overlay will detect the in-game text language automatically and switch to coaching mode for that language.' },
        ],
      },
      {
        id: 'lens-linux',
        title: 'Language Lens on Linux',
        desc: 'Flameshot/grim integration, OBS plugin, and CLI pipe mode.',
        platforms: ['linux'],
        content: [
          { type: 'h2', text: 'Screenshot tools supported' },
          { type: 'list', items: [
            'flameshot — GUI region capture, auto-detected by UseLang',
            'grim + slurp — Wayland native, pipe to UseLang CLI',
            'scrot — lightweight X11 option',
            'gnome-screenshot — GNOME default',
            'spectacle — KDE Plasma default',
          ]},
          { type: 'h2', text: 'CLI pipe mode' },
          { type: 'code', lang: 'bash', text: `# Capture region and analyze in French
grim -g "$(slurp)" - | uselang lens --lang fr

# Watch a window for new text (screen recording mode)
uselang lens --watch --window "vlc" --lang ja

# Analyze an image file
uselang lens --file ~/Desktop/menu.jpg --lang es` },
          { type: 'h2', text: 'OBS plugin for screen recording coaching' },
          { type: 'steps', items: [
            'In OBS Studio, go to Tools → Plugin Manager → Browse Plugins.',
            'Search for "UseLang" and click Install.',
            'Add a UseLang source to any scene.',
            'In the source settings, choose which language to coach and how often to show cards.',
            'While streaming or recording, UseLang shows coaching overlays on your OBS canvas.',
          ]},
          { type: 'tip', text: 'The headless CLI is great for SSH sessions or Raspberry Pi setups. Run uselang session --lang fr --audio-device hw:0,0 to use a specific USB microphone for a fully offline terminal coaching session.' },
        ],
      },
    ],
  },
  {
    id: 'offline',
    label: 'Offline & Local AI',
    desc: 'Use UseLang without internet using a private local AI model.',
    color: '#7a8c7a',
    bg: '#e4ede4',
    icon: <Icon.Wifi />,
    articles: [
      {
        id: 'offline-overview',
        title: 'How offline mode works',
        desc: 'What works without internet and what requires a connection.',
        content: [
          { type: 'p', text: 'UseLang\'s offline mode lets you practice without any internet connection. Tutor text runs entirely through local Gemma on the device.' },
          { type: 'h2', text: 'What works offline' },
          { type: 'list', items: [
            'Full conversation coaching with local AI',
            'Language Lens (screenshot, screen recording, camera)',
            'Speech-to-text (uses your device\'s built-in engine)',
            'Text-to-speech pronunciation playback',
            'Session history (stored locally)',
          ]},
          { type: 'h2', text: 'What requires internet' },
          { type: 'list', items: [
            'Account login (login is cached for 30 days)',
            'Syncing session history across devices',
            'Upgrading or managing your subscription',
            'Downloading optional voice packs or sync data',
          ]},
          { type: 'tip', text: 'Log in while online at least once before going offline. UseLang caches your credentials and profile for 30 days.' },
        ],
      },
      {
        id: 'supported-models',
        title: 'Supported local AI models',
        desc: 'Which models work best for language coaching, and hardware needs.',
        content: [
          { type: 'h2', text: 'Recommended model' },
          { type: 'p', text: 'gemma-3-4b-it (Q4_K_M) — Google\'s instruction-tuned model, optimized for conversational tasks. 3.4 GB download. Works well on 8 GB RAM.' },
          { type: 'h2', text: 'Other compatible models' },
          { type: 'list', items: [
            'Only local Gemma is supported for core tutor responses.',
          ]},
          { type: 'tip', text: 'Core tutor responses do not support alternate cloud or API-hosted models.' },
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    desc: 'Fix common issues with the mic, local AI, audio, and sessions.',
    color: '#c9825c',
    bg: '#f5e6dc',
    icon: <Icon.Wrench />,
    articles: [
      {
        id: 'mic-not-working',
        title: 'Microphone not working',
        desc: 'Steps to fix mic permission issues on Mac, Windows, and Linux.',
        content: [
          { type: 'h2', text: 'Check browser permissions (web app)' },
          { type: 'steps', items: [
            'Click the lock icon in your browser\'s address bar.',
            'Find "Microphone" and set it to Allow.',
            'Refresh the page and try again.',
          ]},
          { type: 'h2', text: 'macOS' },
          { type: 'steps', items: [
            'System Settings → Privacy & Security → Microphone.',
            'Make sure UseLang (or your browser) is checked.',
            'If it\'s missing, open UseLang and grant access when prompted.',
          ]},
          { type: 'h2', text: 'Windows' },
          { type: 'steps', items: [
            'Settings → Privacy & Security → Microphone.',
            'Ensure "Microphone access" is On.',
            'Scroll down and ensure UseLang (or your browser) is toggled on.',
          ]},
          { type: 'h2', text: 'Linux' },
          { type: 'p', text: 'UseLang uses PulseAudio/PipeWire. Run pavucontrol to check which microphone is set as default. Make sure the input level is not muted.' },
          { type: 'code', lang: 'bash', text: `# Check available mics
pactl list sources short

# Test recording
arecord -d 3 test.wav && aplay test.wav` },
          { type: 'tip', text: 'If the mic works in other apps but not UseLang, try toggling the "Use legacy audio engine" option in Settings → Audio.' },
        ],
      },
      {
        id: 'gemma-not-loading',
        title: "Gemma won't load",
        desc: 'Diagnose local model setup issues.',
        content: [
          { type: 'h2', text: 'Checklist' },
          { type: 'list', items: [
            'The native app includes the Gemma inference module.',
            'The Gemma model, tokenizer, and tokenizer_config sources point to local file:// resources.',
            'Settings → Offline shows local Gemma as loaded.',
          ]},
          { type: 'h2', text: 'Common fixes' },
          { type: 'list', items: [
            'Rebuild the native app after adding the inference module.',
            'Verify that the Gemma file paths are local, not http(s) URLs.',
            'Restart the app after replacing model files.',
          ]},
        ],
      },
      {
        id: 'poor-audio',
        title: 'Poor audio quality or echo',
        desc: 'Fix echo, background noise, and speech recognition errors.',
        content: [
          { type: 'h2', text: 'Echo' },
          { type: 'p', text: 'Echo happens when the AI\'s voice output feeds back into the microphone. UseLang uses echo cancellation automatically, but it works best when speakers and mic are physically separated.' },
          { type: 'list', items: [
            'Use headphones — this is the most reliable fix.',
            'If using built-in speakers on a laptop, lower the volume slightly.',
            'Enable "Enhanced noise suppression" in Settings → Audio.',
          ]},
          { type: 'h2', text: 'Speech recognition errors' },
          { type: 'list', items: [
            'Speak clearly and at a normal pace — the AI handles accents well but struggles with very fast speech.',
            'Make sure you\'re in a reasonably quiet environment.',
            'If you\'re using a Bluetooth headset, try switching to wired — Bluetooth audio in microphone mode uses a lower-quality codec.',
            'Try switching between the "Web Speech" and "Whisper" speech engines in Settings → Audio → Speech engine.',
          ]},
        ],
      },
      {
        id: 'session-issues',
        title: 'Session keeps dropping or freezing',
        desc: 'Why sessions disconnect and how to keep them stable.',
        content: [
          { type: 'h2', text: 'Local Gemma sessions' },
          { type: 'p', text: 'If a local session freezes, the model may have run out of memory. Try closing other applications or restarting the app.' },
          { type: 'h2', text: 'Connection lost mid-session' },
          { type: 'p', text: 'Tutor text does not depend on internet. Optional sync, STT, or TTS services may pause until connectivity returns.' },
        ],
      },
    ],
  },
  {
    id: 'account',
    label: 'Account & Billing',
    desc: 'Manage your plan, change your language, and control your data.',
    color: '#7a8ca0',
    bg: '#dce4ec',
    icon: <Icon.CreditCard />,
    articles: [
      {
        id: 'upgrade-plan',
        title: 'Upgrading your plan',
        desc: 'How to go from Free to Starter or Pro.',
        content: [
          { type: 'p', text: 'You can upgrade at any time from the Pricing section on the homepage or from Settings → Account → Plan.' },
          { type: 'steps', items: [
            'Go to Settings → Account.',
            'Under Current Plan, click Upgrade.',
            'Select Starter or Pro.',
            'Complete checkout — your plan activates instantly.',
          ]},
          { type: 'p', text: 'Yearly plans are billed once and save 33% compared to monthly. You can switch between monthly and yearly at renewal time.' },
          { type: 'h2', text: 'What changes when you upgrade' },
          { type: 'list', items: [
            'Session limits increase immediately.',
            'Offline mode is unlocked on Starter and Pro.',
            'Pro plan adds streak freeze, priority support, and all future premium features.',
          ]},
        ],
      },
      {
        id: 'cancel-subscription',
        title: 'Cancelling your subscription',
        desc: 'How to cancel and what happens to your data.',
        content: [
          { type: 'p', text: 'You can cancel any time. Go to Settings → Account → Manage Plan → Cancel Subscription.' },
          { type: 'p', text: 'Your paid access continues until the end of your current billing period. After that, your account reverts to the Free plan. Your session history, vocabulary, and profile are never deleted.' },
          { type: 'tip', text: 'If you cancel within 7 days of starting a paid plan, contact support for a full refund. We don\'t ask questions.' },
        ],
      },
      {
        id: 'change-language',
        title: 'Changing your language',
        desc: 'Switch your target or native language at any time.',
        content: [
          { type: 'p', text: 'Go to Settings → Language. You can change both your target language (what you\'re learning) and your native language (what you already speak) at any time.' },
          { type: 'p', text: 'Your existing session history is kept separate by language, so switching doesn\'t erase your progress. If you switch back, your previous progress is right where you left it.' },
        ],
      },
      {
        id: 'privacy',
        title: 'Privacy & your data',
        desc: 'What we store, what we don\'t, and how to delete your account.',
        content: [
          { type: 'h2', text: 'What we store' },
          { type: 'list', items: [
            'Your profile settings (language, level, coaching preferences)',
            'Session transcripts (text only, not audio)',
            'Vocabulary lists and correction history',
            'Streak and usage statistics',
          ]},
          { type: 'h2', text: 'What we never store' },
          { type: 'list', items: [
            'Raw audio recordings',
            'Screenshots or screen recordings from Language Lens',
            'Any content from your local AI sessions (this never leaves your machine)',
          ]},
          { type: 'h2', text: 'Delete your account' },
          { type: 'p', text: 'Go to Settings → Account → Delete Account. This permanently removes all your data from our servers within 30 days. This action cannot be undone.' },
        ],
      },
    ],
  },
]

const ALL_ARTICLES = CATEGORIES.flatMap((cat) =>
  cat.articles.map((a) => ({ ...a, categoryId: cat.id, categoryLabel: cat.label }))
)

/* ─────────────────────────────────────────────
   ARTICLE RENDERER
───────────────────────────────────────────── */
function ArticleContent({ blocks }) {
  return (
    <div className="space-y-4 text-[0.88rem] leading-[1.72] text-ink/70">
      {blocks.map((block, i) => {
        if (block.type === 'p') return (
          <p key={i}>{block.text}</p>
        )
        if (block.type === 'h2') return (
          <h2 key={i} className="pt-2 text-[1rem] font-bold tracking-[-0.02em] text-ink">{block.text}</h2>
        )
        if (block.type === 'list') return (
          <ul key={i} className="space-y-1.5 pl-1">
            {block.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2.5">
                <span className="mt-[0.4em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )
        if (block.type === 'steps') return (
          <ol key={i} className="space-y-2 pl-1">
            {block.items.map((item, j) => (
              <li key={j} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[0.65rem] font-bold text-accent">
                  {j + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        )
        if (block.type === 'code') return (
          <pre key={i} className="overflow-x-auto rounded-xl bg-ink/[0.04] p-4 text-[0.78rem] leading-[1.65] text-ink/75">
            <code>{block.text}</code>
          </pre>
        )
        if (block.type === 'tip') return (
          <div key={i} className="flex gap-3 rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
            <span className="mt-0.5 text-base leading-none">💡</span>
            <p className="text-[0.83rem] text-ink/65">{block.text}</p>
          </div>
        )
        return null
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PLATFORM BADGES
───────────────────────────────────────────── */
function PlatformBadges({ platforms }) {
  if (!platforms?.length) return null
  const MAP = { macos: { label: 'macOS', icon: <Icon.Apple /> }, windows: { label: 'Windows', icon: <Icon.Windows /> }, linux: { label: 'Linux', icon: <Icon.Linux /> } }
  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {platforms.map((p) => (
        <span key={p} className="flex items-center gap-1.5 rounded-full bg-ink/[0.04] px-2.5 py-1 text-[0.68rem] font-medium text-ink/45">
          {MAP[p]?.icon}
          {MAP[p]?.label}
        </span>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export function DocsPage({ auth, route }) {
  const go = (r) => route.navigate(r)

  const [query, setQuery] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [activeArticle, setActiveArticle] = useState(null)

  const activeCategory = CATEGORIES.find((c) => c.id === activeCategoryId)

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return ALL_ARTICLES.filter(
      (a) => a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
    )
  }, [query])

  function openArticle(article) {
    setActiveArticle(article)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCategory(catId) {
    setActiveCategoryId(catId)
    setActiveArticle(null)
    setQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goHome() {
    setActiveCategoryId(null)
    setActiveArticle(null)
    setQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showSearch = query.trim().length > 0
  const showHome = !activeCategoryId && !activeArticle && !showSearch

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #f5f0ea 100%)' }}>
      <MarketingNav auth={auth} go={go} />

      <main className="mx-auto max-w-4xl px-5 pt-[5.5rem] pb-20">

        {/* ── HERO ── */}
        <AnimatePresence mode="wait">
          {showHome && (
            <motion.div key="hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="mb-10 text-center">
              <p className="eyebrow mb-3">Help Center</p>
              <h1 className="text-[clamp(2rem,5vw,3rem)] font-extrabold tracking-[-0.04em] leading-[1.1] text-ink">
                How can we help?
              </h1>
              <p className="mt-3 text-[0.9rem] text-ink/40">
                Guides, setup walkthroughs, troubleshooting, and more.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BREADCRUMB ── */}
        {(activeCategoryId || activeArticle) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-center gap-1.5 text-[0.78rem] text-ink/35">
            <button type="button" onClick={goHome} className="hover:text-ink transition-colors">Docs</button>
            {activeCategoryId && (
              <>
                <Icon.ChevronRight />
                {activeArticle
                  ? <button type="button" onClick={() => { setActiveArticle(null) }} className="hover:text-ink transition-colors">{activeCategory?.label}</button>
                  : <span className="text-ink/65">{activeCategory?.label}</span>
                }
              </>
            )}
            {activeArticle && (
              <>
                <Icon.ChevronRight />
                <span className="text-ink/65">{activeArticle.title}</span>
              </>
            )}
          </motion.div>
        )}

        {/* ── SEARCH BAR ── */}
        <div className="relative mb-8">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none">
            <Icon.Search />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveCategoryId(null); setActiveArticle(null) }}
            placeholder="Search articles…"
            className="w-full rounded-2xl border border-ink/[0.07] bg-white py-3.5 pl-11 pr-5 text-[0.88rem] placeholder:text-ink/25 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] focus:outline-none focus:border-accent/30 focus:shadow-[0_4px_20px_-6px_rgba(201,169,122,0.18)] transition-all"
          />
        </div>

        {/* ── SEARCH RESULTS ── */}
        <AnimatePresence mode="wait">
          {showSearch && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="mb-4 text-[0.78rem] text-ink/35">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"</p>
              {searchResults.length === 0 ? (
                <div className="rounded-2xl bg-white border border-ink/[0.06] p-8 text-center">
                  <p className="text-3xl mb-3">🔍</p>
                  <p className="text-[0.88rem] text-ink/40">No articles matched. Try different keywords or <button type="button" onClick={goHome} className="text-accent underline underline-offset-2">browse categories</button>.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((a) => (
                    <button key={a.id} type="button" onClick={() => { openCategory(a.categoryId); openArticle(a) }}
                      className="flex w-full items-start gap-4 rounded-2xl border border-ink/[0.06] bg-white p-4 text-left transition-all hover:border-accent/20 hover:shadow-[0_4px_16px_-4px_rgba(201,169,122,0.14)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.85rem] font-semibold text-ink">{a.title}</p>
                        <p className="mt-0.5 text-[0.75rem] text-ink/40">{a.desc}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-ink/[0.04] px-2 py-0.5 text-[0.65rem] text-ink/35">{a.categoryLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── HOME: CATEGORY GRID ── */}
          {showHome && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((cat, i) => (
                  <motion.button
                    key={cat.id}
                    type="button"
                    onClick={() => openCategory(cat.id)}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="group flex flex-col items-start rounded-2xl border border-ink/[0.06] bg-white p-5 text-left transition-all hover:border-[rgba(201,169,122,0.25)] hover:shadow-[0_8px_28px_-8px_rgba(201,169,122,0.16)]"
                  >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-[0.9rem]"
                      style={{ background: cat.bg, color: cat.color }}>
                      {cat.icon}
                    </span>
                    <p className="text-[0.9rem] font-bold tracking-[-0.02em] text-ink">{cat.label}</p>
                    <p className="mt-1 text-[0.75rem] leading-[1.5] text-ink/38">{cat.desc}</p>
                    <span className="mt-3 text-[0.72rem] font-medium text-ink/25 group-hover:text-accent transition-colors">
                      {cat.articles.length} article{cat.articles.length !== 1 ? 's' : ''} →
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Popular articles */}
              <div className="mt-12">
                <h2 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink/30">Popular articles</h2>
                <div className="space-y-2">
                  {[
                    ALL_ARTICLES.find((a) => a.id === 'local-ai-setup'),
                    ALL_ARTICLES.find((a) => a.id === 'what-is-language-lens'),
                    ALL_ARTICLES.find((a) => a.id === 'mic-not-working'),
                    ALL_ARTICLES.find((a) => a.id === 'install-macos'),
                    ALL_ARTICLES.find((a) => a.id === 'install-windows'),
                    ALL_ARTICLES.find((a) => a.id === 'lm-studio-not-connecting'),
                  ].filter(Boolean).map((a) => (
                    <button key={a.id} type="button"
                      onClick={() => { openCategory(a.categoryId); openArticle(a) }}
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-white/60 px-4 py-3 text-left transition-all hover:border-ink/[0.06] hover:bg-white">
                      <span className="flex-1 text-[0.83rem] font-medium text-ink/70 hover:text-ink transition-colors">{a.title}</span>
                      <span className="shrink-0 text-[0.68rem] text-ink/28">{a.categoryLabel}</span>
                      <Icon.ChevronRight />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CATEGORY: ARTICLE LIST ── */}
          {activeCategoryId && !activeArticle && activeCategory && (
            <motion.div key={`cat-${activeCategoryId}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[0.9rem]"
                  style={{ background: activeCategory.bg, color: activeCategory.color }}>
                  {activeCategory.icon}
                </span>
                <div>
                  <h1 className="text-[1.4rem] font-bold tracking-[-0.03em] text-ink">{activeCategory.label}</h1>
                  <p className="text-[0.78rem] text-ink/38">{activeCategory.desc}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {activeCategory.articles.map((article) => (
                  <button key={article.id} type="button" onClick={() => openArticle(article)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-ink/[0.06] bg-white p-5 text-left transition-all hover:border-accent/20 hover:shadow-[0_4px_20px_-6px_rgba(201,169,122,0.14)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.9rem] font-semibold text-ink">{article.title}</p>
                      <p className="mt-0.5 text-[0.75rem] text-ink/38 leading-snug">{article.desc}</p>
                      {article.platforms && (
                        <div className="mt-2 flex gap-1.5">
                          {article.platforms.map((p) => (
                            <span key={p} className="rounded-full bg-ink/[0.04] px-2 py-0.5 text-[0.62rem] text-ink/35 capitalize">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Icon.ChevronRight />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ARTICLE VIEW ── */}
          {activeArticle && (
            <motion.div key={`article-${activeArticle.id}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <div className="rounded-2xl border border-ink/[0.06] bg-white p-7">
                <PlatformBadges platforms={activeArticle.platforms} />
                <h1 className="text-[1.5rem] font-extrabold tracking-[-0.04em] leading-[1.1] text-ink mb-2">
                  {activeArticle.title}
                </h1>
                <p className="text-[0.83rem] text-ink/38 mb-7 pb-7 border-b border-ink/[0.05]">{activeArticle.desc}</p>
                <ArticleContent blocks={activeArticle.content} />
              </div>

              {/* related articles */}
              {activeCategory && (
                <div className="mt-8">
                  <h2 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink/30">More in {activeCategory.label}</h2>
                  <div className="space-y-2">
                    {activeCategory.articles.filter((a) => a.id !== activeArticle.id).map((a) => (
                      <button key={a.id} type="button" onClick={() => openArticle(a)}
                        className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-white/60 px-4 py-3 text-left transition-all hover:border-ink/[0.06] hover:bg-white">
                        <span className="flex-1 text-[0.83rem] font-medium text-ink/60">{a.title}</span>
                        <Icon.ChevronRight />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STILL STUCK ── */}
        {!showSearch && (
          <div className="mt-14 rounded-2xl border border-accent/15 bg-accent/[0.04] p-7 text-center">
            <p className="text-xl mb-2">🤔</p>
            <p className="text-[0.88rem] font-semibold text-ink/70">Still stuck?</p>
            <p className="mt-1 text-[0.78rem] text-ink/38">Our support team replies within a few hours.</p>
            <a href="mailto:support@uselang.com"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink/[0.05] px-5 py-2.5 text-[0.8rem] font-semibold text-ink/60 transition hover:bg-ink/[0.08]">
              Contact support →
            </a>
          </div>
        )}

      </main>

      <MarketingFooter go={go} />
    </div>
  )
}
