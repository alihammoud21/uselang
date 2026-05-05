import AVFoundation
import Foundation
import React
import Speech

@objc(OfflineVoiceModule)
class OfflineVoiceModule: RCTEventEmitter, AVSpeechSynthesizerDelegate {
  private let synthesizer = AVSpeechSynthesizer()
  private let audioEngine = AVAudioEngine()
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var speechRecognizer: SFSpeechRecognizer?
  private var activeResolve: RCTPromiseResolveBlock?
  private var activeReject: RCTPromiseRejectBlock?
  private var shouldResumeListeningAfterInterruption = false
  private var speechStartedAt: Date?

  override init() {
    super.init()
    synthesizer.delegate = self
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleAudioRouteChange(_:)),
      name: AVAudioSession.routeChangeNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleAudioInterruption(_:)),
      name: AVAudioSession.interruptionNotification,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return [
      "OfflineSpeechResult",
      "OfflineSpeechError",
      "OfflineSpeechEnd",
      "OfflineSpeechVolume",
      "OfflineAudioRouteChange",
      "OfflineAudioInterruption",
    ]
  }

  @objc(getSpeechStatus:resolver:rejecter:)
  func getSpeechStatus(
    _ localeIdentifier: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let resolved = normalizeLocale(localeIdentifier)
    let recognizer = SFSpeechRecognizer(locale: Locale(identifier: resolved))
    let localeSupported = recognizer != nil
    let recognitionAvailable = recognizer != nil
    let onDeviceSupported = recognizer?.supportsOnDeviceRecognition ?? false

    NSLog("[OfflineVoiceModule] speech status locale=%@ recognizer=%@ available=%@ supportsOnDevice=%@ auth=%ld",
      resolved,
      recognizer == nil ? "nil" : "ok",
      recognitionAvailable ? "true" : "false",
      onDeviceSupported ? "true" : "false",
      SFSpeechRecognizer.authorizationStatus().rawValue
    )

    resolve([
      "moduleAvailable": true,
      "locale": normalizeLocale(localeIdentifier),
      "resolvedLocale": resolved,
      "localeSupported": localeSupported,
      "recognitionAvailable": recognitionAvailable,
      "onDeviceSupported": localeSupported && onDeviceSupported,
      "speechAuthorizationStatus": SFSpeechRecognizer.authorizationStatus().rawValue,
      "message": localeSupported && onDeviceSupported
        ? ""
        : "Offline Mandarin speech is not available on this device. Install Mandarin Dictation/Siri support, then try again.",
    ])
  }

  @objc(requestSpeechAuthorization:rejecter:)
  func requestSpeechAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    SFSpeechRecognizer.requestAuthorization { status in
      NSLog("[OfflineVoiceModule] speech authorization status=%ld", status.rawValue)
      resolve([
        "status": status.rawValue,
        "granted": status == .authorized,
      ])
    }
  }

  @objc(startSpeech:resolver:rejecter:)
  func startSpeech(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let localeIdentifier = normalizeLocale((options["locale"] as? String) ?? "zh-CN")
    let requiresOnDevice = (options["requiresOnDevice"] as? Bool) ?? true

    guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
      reject("speech_permission_denied", "Speech recognition permission denied.", nil)
      return
    }

    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier)) else {
      reject("recognizer_unavailable", "Mandarin recognizer unavailable.", nil)
      return
    }

    guard !requiresOnDevice || recognizer.supportsOnDeviceRecognition else {
      reject("offline_stt_unavailable", "Offline Mandarin speech is not available on this device.", nil)
      return
    }

    DispatchQueue.main.async {
      self.stopSpeechInternal(sendEnd: false)
      self.speechRecognizer = recognizer

      // Stop any active TTS to release the audio hardware before starting mic
      let synth = AVSpeechSynthesizer()
      if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }

      // Reset the audio engine to clear any stale state from prior sessions
      if self.audioEngine.isRunning { self.audioEngine.stop() }
      self.audioEngine.reset()

      do {
        try self.configureListeningSession()
      } catch {
        reject("audio_session_failed", error.localizedDescription, error)
        return
      }

      // Small delay to let the audio session settle after mode switch
      self.speechStartedAt = Date()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
        self.startRecognitionAfterSetup(recognizer: recognizer, localeIdentifier: localeIdentifier, requiresOnDevice: requiresOnDevice, resolve: resolve, reject: reject)
      }
    }
  }

  private func startRecognitionAfterSetup(
    recognizer: SFSpeechRecognizer,
    localeIdentifier: String,
    requiresOnDevice: Bool,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
      let request = SFSpeechAudioBufferRecognitionRequest()
      request.shouldReportPartialResults = true
      if #available(iOS 13.0, *) {
        request.requiresOnDeviceRecognition = requiresOnDevice
      }
      self.recognitionRequest = request

      let inputNode = self.audioEngine.inputNode
      let nativeFormat = inputNode.outputFormat(forBus: 0)
      let format: AVAudioFormat
      if nativeFormat.sampleRate > 0 && nativeFormat.channelCount > 0 {
        format = nativeFormat
      } else if let fallback = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: 48_000,
        channels: 1,
        interleaved: false
      ) {
        format = fallback
      } else {
        reject("audio_format_failed", "Microphone format unavailable.", nil)
        return
      }
      NSLog("[OfflineVoiceModule] input format sampleRate=%f channels=%u", format.sampleRate, format.channelCount)
      inputNode.removeTap(onBus: 0)
      inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
        request.append(buffer)
        let level = self.normalizedLevel(buffer)
        self.sendEvent(withName: "OfflineSpeechVolume", body: ["level": level])
      }

      self.audioEngine.prepare()
      do {
        try self.audioEngine.start()
      } catch {
        inputNode.removeTap(onBus: 0)
        reject("audio_engine_failed", error.localizedDescription, error)
        return
      }

      NSLog("[OfflineVoiceModule] recognition started locale=%@ requiresOnDevice=%@", localeIdentifier, requiresOnDevice ? "true" : "false")
      self.recognitionTask = recognizer.recognitionTask(with: request) { result, error in
        if let result = result {
          self.sendEvent(withName: "OfflineSpeechResult", body: [
            "text": result.bestTranscription.formattedString,
            "isFinal": result.isFinal,
          ])
          if result.isFinal {
            self.stopSpeechInternal(sendEnd: true)
          }
        }

        if let error = error {
          let nsError = error as NSError
          if nsError.domain == "kAFAssistantErrorDomain" && nsError.code == 216 {
            return
          }
          NSLog("[OfflineVoiceModule] recognition error=%@", error.localizedDescription)
          self.sendEvent(withName: "OfflineSpeechError", body: ["message": error.localizedDescription])
          self.stopSpeechInternal(sendEnd: true)
        }
      }

      resolve(["started": true, "locale": localeIdentifier])
  }

  @objc(stopSpeech:rejecter:)
  func stopSpeech(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.stopSpeechInternal(sendEnd: true)
      resolve(nil)
    }
  }

  @objc(abortSpeech:rejecter:)
  func abortSpeech(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.stopSpeechInternal(sendEnd: false)
      resolve(nil)
    }
  }

  @objc(getTtsStatus:resolver:rejecter:)
  func getTtsStatus(
    _ localeIdentifier: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let locale = normalizeLocale(localeIdentifier)
    let voice = bestVoice(for: locale)
    resolve([
      "available": voice != nil,
      "locale": locale,
      "voiceIdentifier": voice?.identifier ?? "",
      "voiceName": voice?.name ?? "",
      "voiceLanguage": voice?.language ?? "",
      "voiceCount": AVSpeechSynthesisVoice.speechVoices().count,
    ])
  }

  @objc(speak:localeIdentifier:rate:resolver:rejecter:)
  func speak(
    _ text: String,
    localeIdentifier: String,
    rate: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !clean.isEmpty else {
      resolve(nil)
      return
    }

    DispatchQueue.main.async {
      self.finishActiveSpeech()
      self.stopSpeechInternal(sendEnd: false)

      let locale = self.normalizeLocale(localeIdentifier)
      guard let voice = self.bestVoice(for: locale) else {
        reject("tts_unavailable", "Mandarin voice not installed on this device", nil)
        return
      }

      do {
        try self.configureSpeakingSession()
      } catch {
        reject("audio_session_failed", error.localizedDescription, error)
        return
      }

      let utterance = AVSpeechUtterance(string: clean)
      utterance.voice = voice
      utterance.rate = AVSpeechUtteranceDefaultSpeechRate * Float(truncating: rate)
      utterance.pitchMultiplier = 1.0
      utterance.volume = 1.0

      self.activeResolve = resolve
      self.activeReject = reject
      NSLog("[OfflineVoiceModule] tts speak locale=%@ voice=%@ textLength=%ld", locale, voice.identifier, clean.count)
      self.synthesizer.speak(utterance)
    }
  }

  @objc(stopSpeaking:rejecter:)
  func stopSpeaking(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if self.synthesizer.isSpeaking {
        self.synthesizer.stopSpeaking(at: .immediate)
      }
      self.finishActiveSpeech()
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
      resolve(nil)
    }
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
    finishActiveSpeech()
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
    finishActiveSpeech()
  }

  private func finishActiveSpeech() {
    let resolve = activeResolve
    activeResolve = nil
    activeReject = nil
    resolve?(nil)
  }

  private func stopSpeechInternal(sendEnd: Bool) {
    if audioEngine.isRunning {
      audioEngine.stop()
      NSLog("[OfflineVoiceModule] audio engine stopped")
    }
    audioEngine.inputNode.removeTap(onBus: 0)
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()
    recognitionTask = nil
    recognitionRequest = nil
    speechRecognizer = nil
    if sendEnd {
      sendEvent(withName: "OfflineSpeechEnd", body: [:])
    }
  }

  private func configureListeningSession() throws {
    // CRITICAL: minimal config. On the iOS Simulator, aggressive preferred-rate
    // overrides + `.measurement` mode + setActive(false)→setActive(true) toggling
    // collides with the host machine's CoreAudio (esp. when other apps hold the
    // mic, e.g. Wispr Flow, Willow Voice, Screen Studio) and deadlocks
    // AudioToolbox's SetProperty RPC, which crashes the app with SIGABRT after
    // a ~10s RPC timeout. Don't fight the system — let it pick its own rates.
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      .playAndRecord,
      mode: .default,
      options: [.defaultToSpeaker, .allowBluetooth]
    )
    try session.setActive(true, options: [])
    NSLog("[OfflineVoiceModule] audio session configured for listening route=%@", currentRouteDescription())
  }

  private func configureSpeakingSession() throws {
    let session = AVAudioSession.sharedInstance()
    // Same minimal-config rule as listening — don't toggle setActive(false) here.
    try session.setCategory(.playback, mode: .spokenAudio, options: [])
    try session.setActive(true, options: [])
    NSLog("[OfflineVoiceModule] audio session configured for speaking route=%@", currentRouteDescription())
  }

  @objc private func handleAudioRouteChange(_ notification: Notification) {
    let reasonValue = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 0
    let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue)
    NSLog("[OfflineVoiceModule] route change reason=%lu route=%@", reasonValue, currentRouteDescription())
    DispatchQueue.main.async {
      // Ignore self-inflicted route changes triggered by our own audio session
      // configuration. .categoryChange and .routeConfigurationChange fire the
      // moment we call setCategory/setActive or audioEngine.start() — killing
      // the session we just started. Only true hardware events (headphones
      // plugged/unplugged, Bluetooth connect) should interrupt recognition.
      if reason == .categoryChange || reason == .routeConfigurationChange || reason == .override {
        NSLog("[OfflineVoiceModule] route change ignored (self-inflicted reason=%lu)", reasonValue)
        return
      }
      // Also ignore any route change that fires within 700 ms of session start
      // (covers USB host audio takeover on Mac-connected devices).
      if let startedAt = self.speechStartedAt, Date().timeIntervalSince(startedAt) < 0.70 {
        NSLog("[OfflineVoiceModule] route change ignored (startup grace window, reason=%lu)", reasonValue)
        return
      }
      let wasListening = self.audioEngine.isRunning
      if wasListening {
        self.stopSpeechInternal(sendEnd: true)
      }
      self.sendEvent(withName: "OfflineAudioRouteChange", body: [
        "reason": reasonValue,
        "reasonName": self.routeReasonName(reason),
        "wasListening": wasListening,
        "route": self.currentRouteDescription(),
      ])
    }
  }

  @objc private func handleAudioInterruption(_ notification: Notification) {
    let rawType = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt ?? 0
    guard let type = AVAudioSession.InterruptionType(rawValue: rawType) else { return }
    DispatchQueue.main.async {
      switch type {
      case .began:
        self.shouldResumeListeningAfterInterruption = self.audioEngine.isRunning
        self.stopSpeechInternal(sendEnd: true)
        if self.synthesizer.isSpeaking {
          self.synthesizer.stopSpeaking(at: .immediate)
        }
        self.finishActiveSpeech()
        NSLog("[OfflineVoiceModule] interruption began resumeListening=%@", self.shouldResumeListeningAfterInterruption ? "true" : "false")
        self.sendEvent(withName: "OfflineAudioInterruption", body: [
          "type": "began",
          "shouldResumeListening": self.shouldResumeListeningAfterInterruption,
        ])
      case .ended:
        let optionValue = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
        NSLog("[OfflineVoiceModule] interruption ended options=%lu", optionValue)
        self.sendEvent(withName: "OfflineAudioInterruption", body: [
          "type": "ended",
          "shouldResumeListening": self.shouldResumeListeningAfterInterruption,
        ])
        self.shouldResumeListeningAfterInterruption = false
      @unknown default:
        break
      }
    }
  }

  private func currentRouteDescription() -> String {
    let route = AVAudioSession.sharedInstance().currentRoute
    let inputs = route.inputs.map { $0.portName }.joined(separator: ",")
    let outputs = route.outputs.map { $0.portName }.joined(separator: ",")
    return "in=[\(inputs)] out=[\(outputs)]"
  }

  private func routeReasonName(_ reason: AVAudioSession.RouteChangeReason?) -> String {
    guard let reason = reason else { return "unknown" }
    switch reason {
    case .newDeviceAvailable: return "newDeviceAvailable"
    case .oldDeviceUnavailable: return "oldDeviceUnavailable"
    case .categoryChange: return "categoryChange"
    case .override: return "override"
    case .wakeFromSleep: return "wakeFromSleep"
    case .noSuitableRouteForCategory: return "noSuitableRouteForCategory"
    case .routeConfigurationChange: return "routeConfigurationChange"
    default: return "unknown"
    }
  }

  private func normalizedLevel(_ buffer: AVAudioPCMBuffer) -> Double {
    guard let data = buffer.floatChannelData?[0] else {
      return 0
    }
    let frames = Int(buffer.frameLength)
    if frames == 0 {
      return 0
    }
    var sum: Float = 0
    for i in 0..<frames {
      sum += data[i] * data[i]
    }
    let rms = sqrt(sum / Float(frames))
    let avgPower = 20 * log10(max(rms, 0.000_000_1))
    return Double(max(0, min(1, (avgPower + 50) / 50)))
  }

  private func normalizeLocale(_ localeIdentifier: String) -> String {
    return localeIdentifier.replacingOccurrences(of: "_", with: "-")
  }

  private func bestVoice(for localeIdentifier: String) -> AVSpeechSynthesisVoice? {
    let locale = normalizeLocale(localeIdentifier)
    return AVSpeechSynthesisVoice(language: locale)
  }
}
