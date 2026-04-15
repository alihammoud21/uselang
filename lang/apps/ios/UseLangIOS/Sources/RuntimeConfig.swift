import Foundation

struct RuntimeConfig {
    /// URL the WKWebView loads — the app route on local dev or production
    let webAppURL: URL

    /// Base URL for API calls from the web layer (proxied through Vite in dev, or production API)
    let apiBaseURL: URL

    /// Marketing website URL (separate from the app runtime)
    let websiteURL: URL

    /// App Store URL — used by the marketing site CTA
    let appStoreURL: URL?

    static let shared = RuntimeConfig.fromBundle()

    private static func fromBundle() -> RuntimeConfig {
        let info = Bundle.main.infoDictionary ?? [:]

        let webURLString = info["UseLangWebURL"] as? String ?? ""
        let apiBaseString = info["UseLangApiBaseURL"] as? String ?? ""
        let websiteString = info["UseLangWebsiteURL"] as? String ?? "https://uselang.app"
        let appStoreString = info["UseLangAppStoreURL"] as? String ?? ""

        let webURL = URL(string: webURLString)!
        let apiBase = URL(string: apiBaseString.isEmpty ? webURLString : apiBaseString)!
        let website = URL(string: websiteString)!
        let appStore = appStoreString.isEmpty ? nil : URL(string: appStoreString)

        return RuntimeConfig(
            webAppURL: webURL,
            apiBaseURL: apiBase,
            websiteURL: website,
            appStoreURL: appStore
        )
    }
}
