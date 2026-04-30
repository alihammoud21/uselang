import AVFoundation
import Foundation
import Network
import Speech

struct OfflineCourseCatalog: Decodable {
    let courses: [OfflineCourse]
}

struct OfflineCourse: Identifiable, Decodable, Hashable {
    let id: String
    let title: String
    let languageCode: String
    let units: [OfflineUnit]
}

struct OfflineUnit: Identifiable, Decodable, Hashable {
    let id: String
    let title: String
    let lessons: [OfflineLesson]
}

struct OfflineLesson: Identifiable, Decodable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let exercises: [OfflineExercise]
}

enum OfflineExerciseType: String, Decodable {
    case multipleChoice
    case typeAnswer
    case listening
    case speak
    case sentenceBuilder
}

struct OfflineExercise: Identifiable, Decodable, Hashable {
    let id: String
    let type: OfflineExerciseType
    let prompt: String
    let options: [String]?
    let tokens: [String]?
    let speakText: String?
    let correctAnswers: [String]
    let explanation: String
}

struct OfflineHomeworkAssignment: Identifiable, Codable, Hashable {
    let id: String
    let lessonTitle: String
    let languageCode: String
    let assignedAt: Date
    let tasks: [OfflineHomeworkTask]
}

struct OfflineHomeworkTask: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let task: String
    let type: String
    var done: Bool
}

struct OfflineLessonResult: Equatable {
    let xpEarned: Int
    let correctCount: Int
    let totalCount: Int
    let bestStreak: Int

    var accuracy: Int {
        guard totalCount > 0 else { return 0 }
        return Int((Double(correctCount) / Double(totalCount) * 100).rounded())
    }
}

@MainActor
final class OfflineNetworkMonitor: ObservableObject {
    @Published private(set) var isOffline = false
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "lang.offline.network")

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.isOffline = path.status != .satisfied
            }
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}

final class OfflineLessonRepository {
    static let shared = OfflineLessonRepository()

    func loadCatalog() -> OfflineCourseCatalog {
        guard let url = Bundle.main.url(forResource: "OfflineLessons", withExtension: "json") else {
            return Self.fallbackCatalog
        }
        do {
            let data = try Data(contentsOf: url)
            return try JSONDecoder().decode(OfflineCourseCatalog.self, from: data)
        } catch {
            return Self.fallbackCatalog
        }
    }

    private static let fallbackCatalog = OfflineCourseCatalog(courses: [
        OfflineCourse(
            id: "mandarin-basics",
            title: "Mandarin Basics",
            languageCode: "zh-CN",
            units: [
                OfflineUnit(
                    id: "unit-greetings",
                    title: "Unit 1: Greetings",
                    lessons: [
                        OfflineLesson(
                            id: "lesson-greetings-1",
                            title: "Lesson 1: Say Hello",
                            subtitle: "Practice essential greetings offline.",
                            exercises: [
                                OfflineExercise(
                                    id: "mc-hello",
                                    type: .multipleChoice,
                                    prompt: "Hello",
                                    options: ["你好", "再见", "谢谢"],
                                    tokens: nil,
                                    speakText: nil,
                                    correctAnswers: ["你好"],
                                    explanation: "你好 means hello."
                                )
                            ]
                        )
                    ]
                )
            ]
        )
    ])
}

final class OfflineHomeworkStore {
    static let shared = OfflineHomeworkStore()
    private let key = "lang:homework:assignments"

    func pendingHomework() -> [OfflineHomeworkAssignment] {
        guard let data = UserDefaults.standard.data(forKey: key) else { return [] }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard let assignments = try? decoder.decode([OfflineHomeworkAssignment].self, from: data) else { return [] }
        return assignments.filter { $0.tasks.contains { !$0.done } }
    }
}

@MainActor
final class OfflineSpeechService: NSObject, ObservableObject, AVSpeechSynthesizerDelegate {
    private let synthesizer = AVSpeechSynthesizer()
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var finishRecognition: ((String) -> Void)?
    private var transcript = ""

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    var hasMandarinVoice: Bool {
        AVSpeechSynthesisVoice(language: "zh-CN") != nil
    }

    var supportsMandarinSpeech: Bool {
        SFSpeechRecognizer(locale: Locale(identifier: "zh-CN"))?.supportsOnDeviceRecognition == true
    }

    func speakMandarin(_ text: String) {
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty, let voice = AVSpeechSynthesisVoice(language: "zh-CN") else { return }
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        let utterance = AVSpeechUtterance(string: clean)
        utterance.voice = voice
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        synthesizer.speak(utterance)
    }

    func recognizeMandarinOnce() async -> String {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { [weak self] status in
                guard status == .authorized else {
                    continuation.resume(returning: "")
                    return
                }
                Task { @MainActor in
                    self?.startRecognition { text in
                        continuation.resume(returning: text)
                    }
                }
            }
        }
    }

    func stopRecognition() {
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        finishRecognition = nil
    }

    private func startRecognition(completion: @escaping (String) -> Void) {
        stopRecognition()
        transcript = ""
        finishRecognition = completion

        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "zh-CN")), recognizer.supportsOnDeviceRecognition else {
            completion("")
            return
        }

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            completion("")
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        if #available(iOS 13.0, *) {
            request.requiresOnDeviceRecognition = true
        }
        recognitionRequest = request

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            stopRecognition()
            completion("")
            return
        }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                Task { @MainActor in
                    self.transcript = result.bestTranscription.formattedString
                    if result.isFinal {
                        self.finishCurrentRecognition()
                    }
                }
            }
            if error != nil {
                Task { @MainActor in
                    self.finishCurrentRecognition()
                }
            }
        }

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 4_500_000_000)
            finishCurrentRecognition()
        }
    }

    private func finishCurrentRecognition() {
        let text = transcript
        let completion = finishRecognition
        stopRecognition()
        completion?(text)
    }
}

@MainActor
final class OfflineLessonEngine: ObservableObject {
    @Published private(set) var lesson: OfflineLesson
    @Published private(set) var currentIndex = 0
    @Published private(set) var xpEarned = 0
    @Published private(set) var streak = 0
    @Published private(set) var bestStreak = 0
    @Published private(set) var correctCount = 0
    @Published private(set) var completed = false
    @Published private(set) var lastAnswerCorrect: Bool?

    init(lesson: OfflineLesson) {
        self.lesson = lesson
    }

    var currentExercise: OfflineExercise {
        lesson.exercises[currentIndex]
    }

    var progress: Double {
        guard !lesson.exercises.isEmpty else { return 1 }
        return Double(currentIndex) / Double(lesson.exercises.count)
    }

    var result: OfflineLessonResult {
        OfflineLessonResult(
            xpEarned: xpEarned,
            correctCount: correctCount,
            totalCount: lesson.exercises.count,
            bestStreak: bestStreak
        )
    }

    func submit(_ answer: String) {
        let correct = isCorrect(answer, for: currentExercise)
        if correct {
            streak += 1
            bestStreak = max(bestStreak, streak)
            correctCount += 1
            xpEarned += 10 + min(streak * 2, 10)
        } else {
            streak = 0
        }
        lastAnswerCorrect = correct
    }

    func continueAfterFeedback() {
        lastAnswerCorrect = nil
        if currentIndex + 1 >= lesson.exercises.count {
            completed = true
        } else {
            currentIndex += 1
        }
    }

    private func isCorrect(_ answer: String, for exercise: OfflineExercise) -> Bool {
        let normalizedAnswer = normalize(answer)
        return exercise.correctAnswers.contains { normalize($0) == normalizedAnswer }
    }

    private func normalize(_ value: String) -> String {
        value
            .folding(options: [.diacriticInsensitive, .caseInsensitive, .widthInsensitive], locale: .current)
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "。", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
    }
}
