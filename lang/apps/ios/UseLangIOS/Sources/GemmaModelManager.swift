import Foundation

enum GemmaModelState: Equatable {
    case unsupported
    case notDownloaded
    case downloading(progress: Double)
    case ready
    case error(String)
}

@MainActor
final class GemmaModelManager: ObservableObject {
    @Published private(set) var state: GemmaModelState = .notDownloaded
    @Published private(set) var modelSizeBytes: Int64 = 0

    private let modelDir: URL
    private let modelFilename = "gemma-4-e2b-it.task"

    private static let kModelURL = "https://www.kaggle.com/api/v1/models/google/gemma-4-e2b-it-litert/versions/1/download"

    init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        modelDir = appSupport.appendingPathComponent("GemmaModels", isDirectory: true)
        checkExistingModel()
    }

    var modelFileURL: URL {
        modelDir.appendingPathComponent(modelFilename)
    }

    var isDeviceSupported: Bool {
        // Gemma 4 E2B-it requires at least 6 GB RAM and A14+ / M1+
        // iPhone 12 and later, iPad with A14+, or any M-series Mac
        let procInfo = ProcessInfo.processInfo
        let physicalMemory = procInfo.physicalMemory
        // 6 GB minimum
        let minMemory: UInt64 = 6 * 1024 * 1024 * 1024
        return physicalMemory >= minMemory
    }

    func checkExistingModel() {
        if !isDeviceSupported {
            state = .unsupported
            return
        }

        let fileManager = FileManager.default
        do {
            if !fileManager.fileExists(atPath: modelDir.path) {
                try fileManager.createDirectory(at: modelDir, withIntermediateDirectories: true)
            }

            let modelPath = modelFileURL.path
            if fileManager.fileExists(atPath: modelPath) {
                let attrs = try fileManager.attributesOfItem(atPath: modelPath)
                modelSizeBytes = (attrs[.size] as? Int64) ?? 0
                state = .ready
            } else {
                state = .notDownloaded
            }
        } catch {
            state = .error(error.localizedDescription)
        }
    }

    func downloadModel() async throws {
        state = .error("On-device Gemma runtime is not installed in this Xcode target yet.")
    }

    func deleteModel() throws {
        let fileManager = FileManager.default
        if fileManager.fileExists(atPath: modelFileURL.path) {
            try fileManager.removeItem(atPath: modelFileURL.path)
        }
        modelSizeBytes = 0
        state = .notDownloaded
    }
}
