import SwiftUI
import UIKit
@preconcurrency import WebKit

struct WebContainerView: UIViewControllerRepresentable {
    let url: URL
    let modelManager: GemmaModelManager
    let gemmaService: GemmaService

    func makeCoordinator() -> Coordinator {
        Coordinator(modelManager: modelManager, gemmaService: gemmaService)
    }

    func makeUIViewController(context: Context) -> WebContainerViewController {
        let controller = WebContainerViewController()
        controller.configure(url: url, coordinator: context.coordinator)
        return controller
    }

    func updateUIViewController(_ controller: WebContainerViewController, context: Context) {
        controller.configure(url: url, coordinator: context.coordinator)
    }
}

final class WebContainerViewController: UIViewController {
    private let webView: WKWebView = {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let nativeShellScript = WKUserScript(
            source: "window.__USELANG_NATIVE_APP__ = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(nativeShellScript)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.backgroundColor = .clear
        webView.isOpaque = false
        // Allow Web Speech API (SpeechRecognition) to use the microphone.
        // Without this the WKUIDelegate is nil and all getUserMedia / SpeechRecognition
        // requests are silently denied before they even reach the JS error handler.

        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif

        return webView
    }()

    private var loadedInitialURL = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    func configure(url: URL, coordinator: Coordinator) {
        if webView.navigationDelegate !== coordinator {
            webView.navigationDelegate = coordinator
        }
        if webView.uiDelegate !== coordinator {
            webView.uiDelegate = coordinator
        }
        coordinator.attach(webView: webView)

        guard !loadedInitialURL else { return }
        loadedInitialURL = true
        webView.load(URLRequest(url: url))
    }
}

final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private weak var webView: WKWebView?
    private let modelManager: GemmaModelManager
    private let gemmaService: GemmaService

    private static let nativeShellScriptSource = "window.__USELANG_NATIVE_APP__ = true;"
    private static let bridgeScriptSource = """
    window.__USELANG_NATIVE_APP__ = true;
    (function () {
      if (window.__USELANG_NATIVE_BRIDGE_READY__) return;
      window.__USELANG_NATIVE_BRIDGE_READY__ = true;
      const pending = new Map();
      window.__useLangNativeResolve = function (id, payload) {
        const entry = pending.get(id);
        if (!entry) return;
        pending.delete(id);
        if (payload && payload.ok === false) {
          entry.reject(new Error(payload.error || 'Native request failed.'));
          return;
        }
        entry.resolve(payload ? payload.data : null);
      };
      function request(action, payload) {
        return new Promise((resolve, reject) => {
          const id = `native-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          pending.set(id, { resolve, reject });
          window.webkit.messageHandlers.uselangNative.postMessage({ id, action, payload: payload || {} });
        });
      }
      window.UseLangNative = {
        available: true,
        platform: 'ios',
        gemma: {
          status: function () { return request('gemma.status'); },
          download: function () { return request('gemma.download'); },
          load: function () { return request('gemma.load'); },
          generate: function (prompt) { return request('gemma.generate', { prompt: prompt || '' }); }
        }
      };
    })();
    """

    init(modelManager: GemmaModelManager, gemmaService: GemmaService) {
        self.modelManager = modelManager
        self.gemmaService = gemmaService
    }

    func attach(webView: WKWebView) {
        self.webView = webView
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "uselangNative")
        webView.configuration.userContentController.add(self, name: "uselangNative")
        webView.configuration.userContentController.removeAllUserScripts()
        webView.configuration.userContentController.addUserScript(
            WKUserScript(
                source: Self.nativeShellScriptSource,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        webView.configuration.userContentController.addUserScript(
            WKUserScript(
                source: Self.bridgeScriptSource,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        webView.evaluateJavaScript(Self.bridgeScriptSource, completionHandler: nil)
    }

    private func sendResponse(id: String, data: [String: Any]? = nil, error: String? = nil) {
        guard let webView else { return }
        let payload: [String: Any] = error == nil
            ? ["ok": true, "data": data ?? [:]]
            : ["ok": false, "error": error ?? "Native request failed."]

        guard
            let jsonData = try? JSONSerialization.data(withJSONObject: payload),
            let json = String(data: jsonData, encoding: .utf8)
        else { return }

        let script = "window.__useLangNativeResolve(\(jsonString(id)), \(json));"
        DispatchQueue.main.async {
            webView.evaluateJavaScript(script, completionHandler: nil)
        }
    }

    private func jsonString(_ value: String) -> String {
        let escaped = value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
        return "\"\(escaped)\""
    }

    private func gemmaStatusPayload() -> [String: Any] {
        let stateString: String
        let progress: Double

        switch modelManager.state {
        case .unsupported:
            stateString = "unsupported"
            progress = 0
        case .notDownloaded:
            stateString = "notDownloaded"
            progress = 0
        case .downloading(let value):
            stateString = "downloading"
            progress = value
        case .ready:
            stateString = "ready"
            progress = 1
        case .error(let message):
            stateString = "error:\(message)"
            progress = 0
        }

        return [
            "state": stateString,
            "progress": progress,
            "isLoaded": gemmaService.isLoaded,
            "isGenerating": gemmaService.isGenerating,
            "modelSizeBytes": modelManager.modelSizeBytes,
        ]
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "uselangNative" else { return }
        guard
            let body = message.body as? [String: Any],
            let id = body["id"] as? String,
            let action = body["action"] as? String
        else { return }

        switch action {
        case "gemma.status":
            sendResponse(id: id, data: gemmaStatusPayload())
        case "gemma.download":
            Task { @MainActor in
                do {
                    try await modelManager.downloadModel()
                    sendResponse(id: id, data: gemmaStatusPayload())
                } catch {
                    sendResponse(id: id, error: error.localizedDescription)
                }
            }
        case "gemma.load":
            Task { @MainActor in
                do {
                    try await gemmaService.loadModel()
                    sendResponse(id: id, data: gemmaStatusPayload())
                } catch {
                    sendResponse(id: id, error: error.localizedDescription)
                }
            }
        case "gemma.generate":
            let payload = body["payload"] as? [String: Any]
            let prompt = payload?["prompt"] as? String ?? ""
            Task { @MainActor in
                do {
                    let result = try await gemmaService.generate(prompt: prompt)
                    sendResponse(id: id, data: [
                        "text": result.text,
                        "parsedJSON": result.parsedJSON ?? [:],
                    ])
                } catch {
                    sendResponse(id: id, error: error.localizedDescription)
                }
            }
        default:
            sendResponse(id: id, error: "Unsupported native action: \(action)")
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let targetURL = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        if targetURL.scheme == "http" || targetURL.scheme == "https" || targetURL.scheme == "about" {
            decisionHandler(.allow)
            return
        }

        UIApplication.shared.open(targetURL)
        decisionHandler(.cancel)
    }

    // ── WKUIDelegate: grant microphone access to the web page ─────────────────
    // Required for Web Speech API (SpeechRecognition) to work inside WKWebView.
    // Without this delegate the browser silently denies mic requests.
    @available(iOS 15.0, *)
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        // Grant microphone (and camera) access — iOS already shows its own
        // system permission dialog the first time so the user retains control.
        decisionHandler(.grant)
    }
}
