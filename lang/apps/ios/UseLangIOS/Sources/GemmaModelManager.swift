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
        guard isDeviceSupported else {
            state = .unsupported
            throw GemmaServiceError.unsupportedDevice
        }

        guard let bundledURL = Bundle.main.url(forResource: "gemma-4-e2b-it", withExtension: "task") else {
            let message = "Bundle gemma-4-e2b-it.task with the app. Remote Gemma model downloads are disabled."
            state = .error(message)
            throw GemmaServiceError.generationFailed(message)
        }

        let fileManager = FileManager.default
        if !fileManager.fileExists(atPath: modelDir.path) {
            try fileManager.createDirectory(at: modelDir, withIntermediateDirectories: true)
        }

        state = .downloading(progress: 0.1)

        if fileManager.fileExists(atPath: modelFileURL.path) {
            try fileManager.removeItem(at: modelFileURL)
        }

        try fileManager.copyItem(at: bundledURL, to: modelFileURL)

        let attrs = try fileManager.attributesOfItem(atPath: modelFileURL.path)
        modelSizeBytes = (attrs[.size] as? Int64) ?? 0
        state = .ready
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
