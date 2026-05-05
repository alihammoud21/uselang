import SwiftUI

private enum OfflinePalette {
    static let bg = Color(red: 0.97, green: 0.96, blue: 0.93)
    static let card = Color.white
    static let ink = Color(red: 0.07, green: 0.07, blue: 0.06)
    static let sub = Color(red: 0.43, green: 0.41, blue: 0.37)
    static let green = Color(red: 0.13, green: 0.72, blue: 0.33)
    static let red = Color(red: 0.93, green: 0.27, blue: 0.27)
    static let blue = Color(red: 0.15, green: 0.39, blue: 0.92)
    static let gold = Color(red: 0.78, green: 0.58, blue: 0.27)
}

private struct SelectedLessonContext: Identifiable, Hashable {
    let lesson: OfflineLesson
    let languageCode: String
    var id: String { lesson.id }
}

struct OfflineLessonEntryView: View {
    private let catalog = OfflineLessonRepository.shared.loadCatalog()
    @State private var selectedContext: SelectedLessonContext?
    @State private var homework = OfflineHomeworkStore.shared.pendingHomework()

    var body: some View {
        NavigationStack {
            ZStack {
                OfflinePalette.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("AI is unavailable right now")
                                .font(.system(size: 34, weight: .black, design: .rounded))
                                .foregroundStyle(OfflinePalette.ink)
                            Text("You're offline. Practice your lessons and keep your streak going.")
                                .font(.system(size: 17, weight: .medium, design: .rounded))
                                .foregroundStyle(OfflinePalette.sub)
                                .lineSpacing(3)
                            Button {
                                selectedContext = defaultContext
                            } label: {
                                Text("Start Practice")
                                    .font(.system(size: 17, weight: .black, design: .rounded))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 17)
                                    .background(OfflinePalette.ink)
                                    .foregroundStyle(.white)
                                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                            }
                            .buttonStyle(.plain)
                            .padding(.top, 8)
                        }
                        .padding(22)
                        .background(OfflinePalette.card)
                        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                        .shadow(color: .black.opacity(0.06), radius: 24, y: 12)

                        if !homework.isEmpty {
                            PracticeSection(title: "Your Practice", subtitle: "Continue assigned homework below.") {
                                ForEach(homework) { item in
                                    HomeworkCard(homework: item) {
                                        selectedContext = contextForHomework(item) ?? defaultContext
                                    }
                                }
                            }
                        }

                        PracticeSection(title: "Default Lessons", subtitle: "Fast local practice. No AI. No internet.") {
                            ForEach(catalog.courses) { course in
                                ForEach(course.units) { unit in
                                    ForEach(unit.lessons) { lesson in
                                        LessonCard(course: course, unit: unit, lesson: lesson) {
                                            selectedContext = SelectedLessonContext(lesson: lesson, languageCode: course.languageCode)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(20)
                }
            }
            .navigationDestination(item: $selectedContext) { ctx in
                OfflineLessonScreen(lesson: ctx.lesson, languageCode: ctx.languageCode)
            }
        }
        .onAppear {
            homework = OfflineHomeworkStore.shared.pendingHomework()
        }
    }

    private var defaultContext: SelectedLessonContext {
        let course = catalog.courses.first ?? catalog.courses[0]
        let lesson = course.units.first?.lessons.first ?? course.units[0].lessons[0]
        return SelectedLessonContext(lesson: lesson, languageCode: course.languageCode)
    }

    private func contextForHomework(_ homework: OfflineHomeworkAssignment) -> SelectedLessonContext? {
        for course in catalog.courses {
            if let lesson = course.units.flatMap(\.lessons).first(where: {
                $0.title.localizedCaseInsensitiveContains(homework.lessonTitle) ||
                homework.lessonTitle.localizedCaseInsensitiveContains($0.title)
            }) {
                return SelectedLessonContext(lesson: lesson, languageCode: course.languageCode)
            }
        }
        return nil
    }
}

private struct PracticeSection<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(OfflinePalette.ink)
            Text(subtitle)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(OfflinePalette.sub)
            content
        }
    }
}

private struct LessonCard: View {
    let course: OfflineCourse
    let unit: OfflineUnit
    let lesson: OfflineLesson
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(OfflinePalette.blue.opacity(0.12))
                    Text("+10")
                        .font(.system(size: 13, weight: .black, design: .rounded))
                        .foregroundStyle(OfflinePalette.blue)
                }
                .frame(width: 54, height: 54)

                VStack(alignment: .leading, spacing: 5) {
                    Text(course.title)
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .foregroundStyle(OfflinePalette.gold)
                    Text(lesson.title)
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(OfflinePalette.ink)
                    Text(unit.title)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(OfflinePalette.sub)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 15, weight: .black))
                    .foregroundStyle(OfflinePalette.sub.opacity(0.6))
            }
            .padding(16)
            .background(OfflinePalette.card)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

private struct HomeworkCard: View {
    let homework: OfflineHomeworkAssignment
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                Text(homework.lessonTitle)
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundStyle(OfflinePalette.ink)
                Text("\(homework.tasks.filter { !$0.done }.count) practice tasks waiting")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(OfflinePalette.sub)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(OfflinePalette.gold.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct OfflineLessonScreen: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var engine: OfflineLessonEngine
    @StateObject private var speech = OfflineSpeechService()
    @State private var typedAnswer = ""
    @State private var selectedAnswer = ""
    @State private var builderTokens: [String] = []
    @State private var selectedTokens: [String] = []
    @State private var isShaking = false
    let languageCode: String

    init(lesson: OfflineLesson, languageCode: String = "zh-CN") {
        _engine = StateObject(wrappedValue: OfflineLessonEngine(lesson: lesson))
        self.languageCode = languageCode
    }

    var body: some View {
        ZStack {
            feedbackBackground
            OfflinePalette.bg.ignoresSafeArea()
                .opacity(engine.lastAnswerCorrect == nil ? 1 : 0.18)

            VStack(spacing: 0) {
                topBar
                if engine.completed {
                    CompletionView(result: engine.result) {
                        dismiss()
                    }
                    .transition(.scale.combined(with: .opacity))
                } else {
                    exerciseBody
                        .id(engine.currentExercise.id)
                        .transition(.move(edge: .trailing).combined(with: .opacity))
                }
            }
            .animation(.spring(response: 0.35, dampingFraction: 0.82), value: engine.currentIndex)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: engine.lastAnswerCorrect)
        }
        .navigationBarBackButtonHidden(true)
        .onChange(of: engine.currentExercise.id) { _, _ in
            resetLocalState()
        }
    }

    private var feedbackBackground: some View {
        Group {
            if engine.lastAnswerCorrect == true {
                OfflinePalette.green.ignoresSafeArea()
            } else if engine.lastAnswerCorrect == false {
                OfflinePalette.red.ignoresSafeArea()
            }
        }
    }

    private var topBar: some View {
        VStack(spacing: 12) {
            HStack {
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .black))
                        .foregroundStyle(OfflinePalette.sub)
                        .frame(width: 36, height: 36)
                        .background(.white.opacity(0.7))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                ProgressView(value: engine.completed ? 1 : engine.progress)
                    .tint(OfflinePalette.green)
                    .scaleEffect(x: 1, y: 1.8, anchor: .center)
                Text("\(engine.xpEarned) XP")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(OfflinePalette.gold)
                    .frame(width: 62, alignment: .trailing)
            }
            HStack {
                Text("Streak \(engine.streak)")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(OfflinePalette.sub)
                Spacer()
                Text("\(min(engine.currentIndex + 1, engine.lesson.exercises.count))/\(engine.lesson.exercises.count)")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(OfflinePalette.sub)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 14)
        .padding(.bottom, 10)
    }

    private var exerciseBody: some View {
        VStack(spacing: 22) {
            VStack(alignment: .leading, spacing: 10) {
                Text(title(for: engine.currentExercise.type))
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(OfflinePalette.blue)
                Text(engine.currentExercise.prompt)
                    .font(.system(size: 30, weight: .black, design: .rounded))
                    .foregroundStyle(OfflinePalette.ink)
                    .lineSpacing(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 22)
            .padding(.top, 20)

            Spacer(minLength: 0)

            Group {
                switch engine.currentExercise.type {
                case .multipleChoice:
                    ChoiceExercise(options: engine.currentExercise.options ?? [], selected: $selectedAnswer)
                case .typeAnswer:
                    TypeExercise(text: $typedAnswer)
                case .listening:
                    ListeningExercise(
                        options: engine.currentExercise.options ?? [],
                        selected: $selectedAnswer,
                        languageCode: languageCode
                    ) {
                        speech.speak(engine.currentExercise.speakText ?? engine.currentExercise.correctAnswers.first ?? "", language: languageCode)
                    }
                case .speak:
                    SpeakExercise(
                        transcript: $typedAnswer,
                        expected: engine.currentExercise.speakText ?? engine.currentExercise.correctAnswers.first ?? "",
                        languageCode: languageCode
                    ) {
                        speech.speak(engine.currentExercise.speakText ?? "", language: languageCode)
                    } record: {
                        typedAnswer = await speech.recognizeOnce(language: languageCode)
                    }
                case .sentenceBuilder:
                    SentenceBuilderExercise(
                        available: $builderTokens,
                        selected: $selectedTokens
                    )
                    .onAppear {
                        if builderTokens.isEmpty && selectedTokens.isEmpty {
                            builderTokens = (engine.currentExercise.tokens ?? []).shuffled()
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .modifier(ShakeEffect(shakes: isShaking ? 2 : 0))

            Spacer(minLength: 0)

            feedbackFooter
        }
    }

    private var feedbackFooter: some View {
        VStack(spacing: 12) {
            if let correct = engine.lastAnswerCorrect {
                VStack(spacing: 6) {
                    Text(correct ? "Correct" : "Not quite")
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundStyle(correct ? OfflinePalette.green : OfflinePalette.red)
                    Text(engine.currentExercise.explanation)
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(OfflinePalette.sub)
                        .multilineTextAlignment(.center)
                }
                Button("Continue") {
                    engine.continueAfterFeedback()
                }
                .primaryOfflineButton(color: correct ? OfflinePalette.green : OfflinePalette.red)
            } else {
                Button("Check") {
                    submitCurrentAnswer()
                }
                .primaryOfflineButton(color: canSubmit ? OfflinePalette.ink : OfflinePalette.sub.opacity(0.35))
                .disabled(!canSubmit)
            }
        }
        .padding(20)
        .background(.white.opacity(0.92))
    }

    private var canSubmit: Bool {
        switch engine.currentExercise.type {
        case .multipleChoice, .listening:
            return !selectedAnswer.isEmpty
        case .typeAnswer, .speak:
            return !typedAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case .sentenceBuilder:
            return !selectedTokens.isEmpty
        }
    }

    private func submitCurrentAnswer() {
        let answer: String
        switch engine.currentExercise.type {
        case .multipleChoice, .listening:
            answer = selectedAnswer
        case .typeAnswer, .speak:
            answer = typedAnswer
        case .sentenceBuilder:
            answer = selectedTokens.joined(separator: " ")
        }
        engine.submit(answer)
        if engine.lastAnswerCorrect == false {
            isShaking = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                isShaking = false
            }
        }
    }

    private func resetLocalState() {
        typedAnswer = ""
        selectedAnswer = ""
        builderTokens = []
        selectedTokens = []
    }

    private func title(for type: OfflineExerciseType) -> String {
        switch type {
        case .multipleChoice: return "TAP ANSWER"
        case .typeAnswer: return "TYPE ANSWER"
        case .listening: return "LISTENING"
        case .speak: return "SPEAK"
        case .sentenceBuilder: return "BUILD SENTENCE"
        }
    }
}

private struct ChoiceExercise: View {
    let options: [String]
    @Binding var selected: String

    var body: some View {
        VStack(spacing: 12) {
            ForEach(options, id: \.self) { option in
                AnswerButton(title: option, selected: selected == option) {
                    selected = option
                }
            }
        }
    }
}

private struct TypeExercise: View {
    @Binding var text: String

    var body: some View {
        TextField("Type pinyin or characters", text: $text)
            .font(.system(size: 22, weight: .bold, design: .rounded))
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .padding(18)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 16, y: 8)
    }
}

private struct ListeningExercise: View {
    let options: [String]
    @Binding var selected: String
    var languageCode: String = "zh-CN"
    let play: () -> Void

    private var playLabel: String {
        switch languageCode.prefix(2) {
        case "zh": return "Play Mandarin"
        case "es": return "Play Spanish"
        case "fr": return "Play French"
        default:   return "Play Audio"
        }
    }

    var body: some View {
        VStack(spacing: 18) {
            Button(action: play) {
                HStack(spacing: 10) {
                    Image(systemName: "speaker.wave.2.fill")
                    Text(playLabel)
                }
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.vertical, 16)
                .frame(maxWidth: .infinity)
                .background(OfflinePalette.blue)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            }
            .buttonStyle(.plain)
            ChoiceExercise(options: options, selected: $selected)
        }
    }
}

private struct SpeakExercise: View {
    @Binding var transcript: String
    let expected: String
    var languageCode: String = "zh-CN"
    let play: () -> Void
    let record: () async -> Void

    private var hearLabel: String {
        switch languageCode.prefix(2) {
        case "zh": return "Hear Mandarin first"
        case "es": return "Hear Spanish first"
        case "fr": return "Hear French first"
        default:   return "Hear it first"
        }
    }

    var body: some View {
        VStack(spacing: 16) {
            Button(action: play) {
                Text(hearLabel)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(OfflinePalette.blue)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(OfflinePalette.blue.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)

            Button {
                Task { await record() }
            } label: {
                VStack(spacing: 8) {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 34, weight: .bold))
                    Text("Hold steady and say it")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 28)
                .background(OfflinePalette.ink)
                .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
            }
            .buttonStyle(.plain)

            if !transcript.isEmpty {
                Text("Heard: \(transcript)")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(OfflinePalette.sub)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Text("Expected: \(expected)")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(OfflinePalette.sub)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

private struct SentenceBuilderExercise: View {
    @Binding var available: [String]
    @Binding var selected: [String]

    var body: some View {
        VStack(spacing: 18) {
            TokenWrap(tokens: selected, emptyText: "Tap words below") { token in
                selected.removeAll { $0 == token }
                available.append(token)
            }
            TokenWrap(tokens: available, emptyText: "All words used") { token in
                available.removeAll { $0 == token }
                selected.append(token)
            }
        }
    }
}

private struct TokenWrap: View {
    let tokens: [String]
    let emptyText: String
    let action: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if tokens.isEmpty {
                Text(emptyText)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(OfflinePalette.sub.opacity(0.55))
                    .frame(maxWidth: .infinity, minHeight: 58)
                    .background(.white.opacity(0.55))
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 76), spacing: 10)], spacing: 10) {
                    ForEach(tokens, id: \.self) { token in
                        Button(token) { action(token) }
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .padding(.vertical, 13)
                            .frame(maxWidth: .infinity)
                            .background(.white)
                            .foregroundStyle(OfflinePalette.ink)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
            }
        }
    }
}

private struct AnswerButton: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 21, weight: .black, design: .rounded))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(selected ? OfflinePalette.blue.opacity(0.14) : .white)
                .foregroundStyle(selected ? OfflinePalette.blue : OfflinePalette.ink)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(selected ? OfflinePalette.blue : Color.black.opacity(0.06), lineWidth: selected ? 2 : 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

private struct CompletionView: View {
    let result: OfflineLessonResult
    let continueAction: () -> Void

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            ZStack {
                Circle().fill(OfflinePalette.green.opacity(0.14))
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 72, weight: .black))
                    .foregroundStyle(OfflinePalette.green)
            }
            .frame(width: 132, height: 132)

            Text("Lesson complete")
                .font(.system(size: 34, weight: .black, design: .rounded))
                .foregroundStyle(OfflinePalette.ink)

            HStack(spacing: 12) {
                SummaryStat(title: "XP", value: "\(result.xpEarned)")
                SummaryStat(title: "Accuracy", value: "\(result.accuracy)%")
                SummaryStat(title: "Streak", value: "\(result.bestStreak)")
            }
            .padding(.horizontal, 20)

            Spacer()
            Button("Continue") { continueAction() }
                .primaryOfflineButton(color: OfflinePalette.ink)
                .padding(20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct SummaryStat: View {
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(OfflinePalette.sub)
            Text(value)
                .font(.system(size: 24, weight: .black, design: .rounded))
                .foregroundStyle(OfflinePalette.ink)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private extension View {
    func primaryOfflineButton(color: Color) -> some View {
        self
            .font(.system(size: 17, weight: .black, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 17)
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .buttonStyle(.plain)
    }
}

private struct ShakeEffect: GeometryEffect {
    var shakes: CGFloat
    var animatableData: CGFloat {
        get { shakes }
        set { shakes = newValue }
    }

    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: sin(shakes * .pi * 4) * 10, y: 0))
    }
}
