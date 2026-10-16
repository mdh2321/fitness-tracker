import Foundation
import HealthKit
import Combine
import UIKit
import Network
import BackgroundTasks

@MainActor
final class SyncCoordinator: ObservableObject {
    static let shared = SyncCoordinator()
    static let refreshIdentifier = "com.arc.health.refresh"
    @Published var connected = UserDefaults.standard.bool(forKey: "arc.connected")
    @Published var busy = false
    @Published var message = "Connect Apple Health to your ARC dashboard."
    @Published var lastSuccess: Date?
    @Published var lastDataUpload: Date?
    @Published var pending = false
    @Published var backgroundWarning: String?
    private let reader = HealthReader()
    private var observers: [HKObserverQuery] = []
    private var monitor: NWPathMonitor?
    private var running: Task<Bool, Never>?
    private var requestedAgain = false

    // Called synchronously during application launch so observer queries exist before delivery.
    func startObservers() {
        guard connected, HKHealthStore.isHealthDataAvailable(), observers.isEmpty else { return }
        for type: HKSampleType in [reader.workoutType, reader.stepType, reader.sleepType, reader.heartType] {
            let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, error in
                Task { @MainActor in
                    guard let self else { completion(); return }
                    if error == nil { _ = await self.sync() }
                    // Always finish the HealthKit delivery; failed uploads remain on disk.
                    completion()
                }
            }
            reader.store.execute(query)
            observers.append(query)
            reader.store.enableBackgroundDelivery(for: type, frequency: type == reader.stepType ? .hourly : .immediate) { [weak self] success, _ in
                if !success { Task { @MainActor in self?.backgroundWarning = "Background delivery could not be enabled. Open ARC Health to sync." } }
            }
        }
        let monitor = NWPathMonitor()
        monitor.pathUpdateHandler = { [weak self] path in
            if path.status == .satisfied { Task { @MainActor in if self?.pending == true { _ = await self?.sync() } } }
        }
        monitor.start(queue: DispatchQueue(label: "ARCHealth.network"))
        self.monitor = monitor
        scheduleRefresh()
    }
    func scheduleRefresh() {
        guard connected else { return }
        let task = BGAppRefreshTaskRequest(identifier: Self.refreshIdentifier)
        task.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(task)
    }
    func connect(url: String, key: String) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            let connection = try ARCClient.connection(url: url, key: key)
            if let previous = try SecureStorage.connection(), previous.baseURL != connection.baseURL {
                throw SyncError.message("Reconnect to the same ARC website so saved checkpoints remain valid.")
            }
            try await ARCClient(connection).verify()
            try await reader.authorize()
            try SecureStorage.save(connection)
            connected = true
            UserDefaults.standard.set(true, forKey: "arc.connected")
            startObservers()
            message = "Connected. Choose Sync now to import your history."
        } catch { message = error.localizedDescription }
    }
    func disconnect() async {
        running?.cancel()
        if let running { _ = await running.value }
        for observer in observers { reader.store.stop(observer) }
        observers.removeAll()
        reader.store.disableAllBackgroundDelivery { _, _ in }
        monitor?.cancel(); monitor = nil
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.refreshIdentifier)
        SecureStorage.remove()
        connected = false
        UserDefaults.standard.set(false, forKey: "arc.connected")
        // Keep protected checkpoints for reconnecting to the same server. No data is deleted from ARC.
        message = "Disconnected. No more health data will be sent."
    }
    func sync() async -> Bool {
        guard connected else { return false }
        if let running { requestedAgain = true; return await running.value }
        let task = Task { await performSync() }
        running = task
        let result = await task.value
        running = nil
        return result
    }
    func cancel() { running?.cancel() }
    private func performSync() async -> Bool {
        busy = true
        defer { busy = false; scheduleRefresh() }
        do {
            guard UIApplication.shared.isProtectedDataAvailable else { throw SyncError.message("Unlock your iPhone to resume syncing.") }
            guard let connection = try SecureStorage.connection() else { throw SyncError.message("Reconnect ARC using your sync key.") }
            let client = ARCClient(connection), storage = try CheckpointStore()
            var checkpoint = try storage.load("checkpoint.json", as: SyncCheckpoint.self) ?? SyncCheckpoint()
            lastSuccess = checkpoint.lastSuccess; lastDataUpload = checkpoint.lastDataUpload
            // Persist an initial history boundary before the first query.
            try storage.save(checkpoint, as: "checkpoint.json")
            let deadline = Date(timeIntervalSinceNow: UIApplication.shared.applicationState == .active ? 180 : 18)
            var cycles = 0
            repeat {
                try Task.checkCancellation()
                requestedAgain = false
                var hasMore = false
                let upload: PendingUpload
                if let saved = try storage.load("pending.json", as: PendingUpload.self) {
                    upload = saved; hasMore = true
                } else {
                    let built = try await buildBatch(checkpoint)
                    upload = built.0; hasMore = built.1
                    try storage.save(upload, as: "pending.json")
                }
                pending = true; message = "Syncing securely with ARC…"
                try Task.checkCancellation()
                let receipt = try await client.upload(upload)
                checkpoint = upload.nextCheckpoint
                checkpoint.lastSuccess = Date()
                if receipt.imported + receipt.updated + receipt.deleted + receipt.steps + receipt.sleep > 0 { checkpoint.lastDataUpload = Date() }
                checkpoint.importedWorkouts += receipt.imported
                checkpoint.importedDays += receipt.steps + receipt.sleep
                // Checkpoint first, then remove pending. A crash between these writes only replays a receipt.
                try storage.save(checkpoint, as: "checkpoint.json")
                try storage.remove("pending.json")
                lastSuccess = checkpoint.lastSuccess; lastDataUpload = checkpoint.lastDataUpload; pending = false
                cycles += 1
                if !hasMore && !requestedAgain {
                    message = checkpoint.lastDataUpload == nil
                        ? "Connected, but no readable health data was returned. Check permissions in Apple Health."
                        : "Up to date with the Health data available to ARC."
                    return true
                }
                if Date() >= deadline || cycles >= 100 {
                    message = "Progress saved. More history will sync on the next pass."
                    return true
                }
            } while !Task.isCancelled
            return false
        } catch {
            message = error is CancellationError ? "Sync paused. Progress is saved." : error.localizedDescription
            return false
        }
    }
    private func buildBatch(_ current: SyncCheckpoint) async throws -> (PendingUpload, Bool) {
        var next = current
        let workouts = try await reader.changes(type: reader.workoutType, anchor: current.anchors["workouts"], start: nil, limit: 50)
        next.anchors["workouts"] = workouts.anchor
        var workoutSamples = Dictionary(uniqueKeysWithValues: workouts.samples.compactMap { $0 as? HKWorkout }.map { ($0.uuid, $0) })
        // Refresh recent workouts for heart-rate/distance values that arrive after the workout itself.
        if workouts.samples.isEmpty && workouts.deleted.isEmpty {
            let start = Calendar.current.date(byAdding: .day, value: -14, to: Date())!
            for case let workout as HKWorkout in try await reader.samples(type: reader.workoutType, from: start, to: Date(), limit: 25) { workoutSamples[workout.uuid] = workout }
        }
        let deleted = Set(workouts.deleted.map { $0.uuid })
        var uploaded: [WorkoutUpload] = []
        for workout in workoutSamples.values.sorted(by: { $0.startDate < $1.startDate }) where !deleted.contains(workout.uuid) && workout.duration > 0 {
            try Task.checkCancellation()
            uploaded.append(try await reader.workout(workout))
        }
        var more = workouts.samples.count + workouts.deleted.count >= 50
        for (key, type) in [("steps", reader.stepType as HKSampleType), ("sleep", reader.sleepType as HKSampleType)] {
            let page = try await reader.changes(type: type, anchor: current.anchors[key], start: current.historyStart)
            next.anchors[key] = page.anchor
            more = more || page.hasMore
            var ledger = next.sampleDays[key] ?? [:]
            var dirty = key == "steps" ? next.dirtyStepDays : next.dirtySleepDays
            var removed = key == "steps" ? next.deletedStepDays : next.deletedSleepDays
            for sample in page.samples {
                let dates = HealthDates.days(from: sample.startDate, to: sample.endDate, extraDay: key == "sleep")
                ledger[sample.uuid.uuidString] = dates
                dirty.formUnion(dates)
            }
            for deletion in page.deleted {
                if let dates = ledger.removeValue(forKey: deletion.uuid.uuidString) { dirty.formUnion(dates); removed.formUnion(dates) }
            }
            next.sampleDays[key] = ledger
            if key == "steps" { next.dirtyStepDays = dirty; next.deletedStepDays = removed }
            else { next.dirtySleepDays = dirty; next.deletedSleepDays = removed }
        }
        let days = next.dirtyStepDays.union(next.dirtySleepDays).sorted().prefix(7)
        var dayUploads: [DayUpload] = []
        for date in days {
            try Task.checkCancellation()
            var day = DayUpload(date: date)
            if next.dirtyStepDays.contains(date) {
                let count = try await reader.steps(day: date)
                if let count, count > 0 { day.steps = count }
                else if next.deletedStepDays.contains(date) { day.steps = 0; day.stepsConfirmedDeletion = true }
                next.dirtyStepDays.remove(date); next.deletedStepDays.remove(date)
            }
            if next.dirtySleepDays.contains(date) {
                day.sleep = try await reader.sleep(day: date)
                if day.sleep == nil && next.deletedSleepDays.contains(date) {
                    day.sleep = SleepSummary(totalMinutes: 0, confirmedDeletion: true)
                }
                next.dirtySleepDays.remove(date); next.deletedSleepDays.remove(date)
            }
            // An empty Health query is never treated as permission to erase existing data.
            if day.steps != nil || day.sleep != nil { dayUploads.append(day) }
        }
        more = more || !next.dirtyStepDays.isEmpty || !next.dirtySleepDays.isEmpty
        let batch = UploadBatch(deviceId: next.deviceId, workouts: uploaded, deletedWorkoutIds: deleted.map { $0.uuidString.lowercased() }.sorted(), days: dayUploads)
        return (PendingUpload(payload: try JSONEncoder().encode(batch), batchId: batch.batchId, nextCheckpoint: next), more)
    }
}
