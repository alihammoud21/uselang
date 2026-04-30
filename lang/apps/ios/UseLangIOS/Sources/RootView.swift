import SwiftUI

struct RootView: View {
    private let webURL = URL(string: Bundle.main.object(forInfoDictionaryKey: "UseLangWebURL") as? String ?? "")
    private let forceOfflineLessons = ProcessInfo.processInfo.arguments.contains("-UseLangForceOfflineLessons")
    @StateObject private var gemmaModelManager = GemmaModelManager()
    @StateObject private var gemmaService: GemmaService
    @StateObject private var networkMonitor = OfflineNetworkMonitor()

    init() {
        let manager = GemmaModelManager()
        _gemmaModelManager = StateObject(wrappedValue: manager)
        _gemmaService = StateObject(wrappedValue: GemmaService(modelManager: manager))
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.99, green: 0.98, blue: 0.97),
                    Color(red: 0.95, green: 0.98, blue: 1.0)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            if forceOfflineLessons || networkMonitor.isOffline {
                OfflineLessonEntryView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let webURL {
                WebContainerView(url: webURL, modelManager: gemmaModelManager, gemmaService: gemmaService)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .ignoresSafeArea()
            } else {
                MissingConfigurationView()
                    .padding(24)
            }
        }
    }
}

private struct MissingConfigurationView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("UseLang iOS shell is missing a web URL.")
                .font(.system(size: 28, weight: .bold, design: .default))
                .foregroundStyle(.black)
            Text("Set `USELANG_WEB_URL` in the Xcode configuration before running on a device.")
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(.black.opacity(0.6))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
