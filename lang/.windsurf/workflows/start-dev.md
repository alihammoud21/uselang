---
description: Start the UseLang dev server (keep Metro bundler alive for physical device)
---

## Start Metro bundler for physical iPhone testing

Run this once in a terminal and leave it running. Your physical iPhone Dev Client will connect automatically over WiFi.

// turbo
1. Start Metro bundler with cache cleared:
```
PATH="/opt/homebrew/opt/node@20/bin:$PATH" npx expo start --clear
```

2. On your iPhone, open the **Expo Dev Client** app (UseLang). It will auto-detect the running server on the same WiFi.
   - If it doesn't auto-detect, tap **"Enter URL manually"** and type: `http://192.168.2.109:8081`

3. The first load may take 15–30 seconds while the JS bundle compiles.

## Notes
- The bundler must stay running in that terminal window while you test.
- Hot-reload works: save any `.tsx` file and the phone updates instantly — no rebuild needed.
- If you see "Request timed out", just restart the bundler with the command above.
- For a one-time install on a new device: `PATH="/opt/homebrew/opt/node@20/bin:$PATH" npx expo run:ios --device`
