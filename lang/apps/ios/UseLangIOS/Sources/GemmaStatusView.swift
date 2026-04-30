import SwiftUI

struct GemmaStatusView: View {
    @ObservedObject var modelManager: GemmaModelManager
    @ObservedObject var service: GemmaService
    @State private var downloadError: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            headerSection

            switch modelManager.state {
            case .unsupported:
                unsupportedView
            case .notDownloaded:
                downloadButton
            case .downloading(let progress):
                downloadProgress(progress: progress)
            case .ready:
                if service.isLoaded {
                    readyView
                } else if service.isLoading {
                    loadingModelView
                } else {
                    loadModelButton
                }
            case .error(let message):
                errorView(message: message)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.06), radius: 12, y: 6)
        )
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("ON-DEVICE AI")
                .font(.system(size: 10, weight: .semibold))
                .tracking(0.08)
                .foregroundStyle(.secondary)
            Text("Gemma 4 E2B-it")
                .font(.system(size: 17, weight: .bold, design: .default))
        }
    }

    // MARK: - Unsupported

    private var unsupportedView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("This device cannot run Gemma locally", systemImage: "exclamationmark.triangle")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.secondary)
            Text("On-device AI requires supported hardware. Server-side LLM fallback is disabled.")
                .font(.system(size: 13))
                .foregroundStyle(.tertiary)
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Install Button

    private var downloadButton: some View {
        Button(action: startDownload) {
            HStack {
                Image(systemName: "square.and.arrow.down")
                    .font(.system(size: 18))
                VStack(alignment: .leading) {
                    Text("Install bundled model")
                        .font(.system(size: 15, weight: .semibold))
                    Text("Copies Gemma from the app bundle")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(14)
            .background(Color.accentColor.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .tint(.accentColor)
    }

    // MARK: - Install Progress

    private func downloadProgress(progress: Double) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ProgressView(value: progress)
                    .progressViewStyle(.linear)
                    .tint(.accentColor)
                Text("\(Int(progress * 100))%")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Text("Installing bundled Gemma 4 E2B-it...")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Load Model Button

    private var loadModelButton: some View {
        Button(action: loadModel) {
            HStack {
                Image(systemName: "brain")
                    .font(.system(size: 18))
                VStack(alignment: .leading) {
                    Text("Load into memory")
                        .font(.system(size: 15, weight: .semibold))
                    Text("Ready to use for lesson generation")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(14)
            .background(Color.green.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .tint(.green)
    }

    // MARK: - Loading Model

    private var loadingModelView: some View {
        HStack {
            ProgressView()
                .padding(.trailing, 4)
            Text("Loading model into memory…")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Ready

    private var readyView: some View {
        HStack {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
                .font(.system(size: 18))
            VStack(alignment: .leading) {
                Text("On-device AI ready")
                    .font(.system(size: 15, weight: .semibold))
                if service.isGenerating {
                    Text("Generating…")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                } else {
                    Text("Lesson plans and drills run locally")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if service.isGenerating {
                ProgressView()
                    .padding(.trailing, 4)
            }
        }
        .padding(14)
        .background(Color.green.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Error

    private func errorView(message: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(message, systemImage: "xmark.circle")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.red)
            Button("Retry") {
                modelManager.checkExistingModel()
            }
            .font(.system(size: 13, weight: .semibold))
            .tint(.accentColor)
        }
        .padding(14)
        .background(Color.red.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Actions

    private func startDownload() {
        Task {
            do {
                try await modelManager.downloadModel()
            } catch {
                downloadError = error.localizedDescription
            }
        }
    }

    private func loadModel() {
        Task {
            do {
                try await service.loadModel()
            } catch {
                downloadError = error.localizedDescription
            }
        }
    }
}
