import Foundation

enum GemmaServiceError: Error, LocalizedError {
    case modelNotReady
    case generationFailed(String)
    case jsonParseFailed(String)
    case unsupportedDevice

    var errorDescription: String? {
        switch self {
        case .modelNotReady: return "Gemma model is not loaded yet."
        case .generationFailed(let msg): return "Generation failed: \(msg)"
        case .jsonParseFailed(let raw): return "Could not parse model output as JSON: \(raw)"
        case .unsupportedDevice: return "This device cannot run Gemma locally."
        }
    }
}

@MainActor
final class GemmaService: ObservableObject {
    @Published private(set) var isLoaded = false
    @Published private(set) var isLoading = false
    @Published private(set) var isGenerating = false

    private let modelManager: GemmaModelManager

    struct GenerationResult {
        let text: String
        let parsedJSON: [String: Any]?
    }

    init(modelManager: GemmaModelManager) {
        self.modelManager = modelManager
    }

    func loadModel() async throws {
        guard modelManager.state == .ready else {
            throw GemmaServiceError.modelNotReady
        }
        isLoading = true
        defer { isLoading = false }
        throw GemmaServiceError.generationFailed("The on-device Gemma runtime is not linked into this Xcode target yet. The model can download, but local inference still needs the native runtime integration.")
    }

    func unloadModel() {
        isLoaded = false
    }

    func generate(prompt: String) async throws -> GenerationResult {
        guard isLoaded else {
            throw GemmaServiceError.modelNotReady
        }
        isGenerating = true
        defer { isGenerating = false }
        throw GemmaServiceError.generationFailed("Gemma local generation is not linked into this target yet.")
    }

    func generateStructured(prompt: String) async throws -> [String: Any] {
        let result = try await generate(prompt: prompt)
        if let json = result.parsedJSON {
            return json
        }
        throw GemmaServiceError.jsonParseFailed(result.text)
    }

    private func parseJSON(from text: String) -> [String: Any]? {
        // Try to extract JSON from the model output
        // The model may wrap JSON in markdown code blocks or add preamble text
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)

        // Try direct parse first
        if let data = trimmed.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            return json
        }

        // Try extracting from ```json ... ``` blocks
        if let range = trimmed.range(of: "```json", options: []),
           let endRange = trimmed.range(of: "```", options: [], range: trimmed.index(range.upperBound, offsetBy: 0)..<trimmed.endIndex) {
            let jsonSubstring = trimmed[range.upperBound..<endRange.lowerBound]
            let jsonString = String(jsonSubstring).trimmingCharacters(in: .whitespacesAndNewlines)
            if let data = jsonString.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                return json
            }
        }

        // Try extracting from { ... } blocks
        if let startIndex = trimmed.firstIndex(of: "{"),
           let endIndex = trimmed.lastIndex(of: "}") {
            let jsonSubstring = trimmed[startIndex...endIndex]
            let jsonString = String(jsonSubstring)
            if let data = jsonString.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                return json
            }
        }

        return nil
    }
}
