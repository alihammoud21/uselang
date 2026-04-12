export function BridgeUnavailableView() {
  return (
    <main className="screen bridge-unavailable-screen">
      <section className="bridge-unavailable-panel">
        <p className="section-label">SpeechCode</p>
        <h1>Open this inside the desktop app</h1>
        <p>
          The React renderer is running, but the Electron preload bridge is missing in this browser tab.
          Launch SpeechCode with <code>corepack pnpm dev:desktop</code> and use the floating overlay or
          dashboard from there.
        </p>
      </section>
    </main>
  );
}
