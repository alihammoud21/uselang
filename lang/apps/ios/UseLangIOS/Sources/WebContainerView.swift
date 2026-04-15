import SwiftUI
import UIKit
import WebKit

struct WebContainerView: UIViewControllerRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
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

        guard !loadedInitialURL else { return }
        loadedInitialURL = true
        webView.load(URLRequest(url: url))
    }
}

final class Coordinator: NSObject, WKNavigationDelegate {
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
}
