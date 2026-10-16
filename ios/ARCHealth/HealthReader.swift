import Foundation
import HealthKit

struct HealthPage {
    let samples: [HKSample]
    let deleted: [HKDeletedObject]
    let anchor: Data
    var hasMore: Bool { samples.count + deleted.count >= 250 }
}

final class HealthReader {
    let store = HKHealthStore()
    let workoutType = HKObjectType.workoutType()
    let stepType = HKObjectType.quantityType(forIdentifier: .stepCount)!
    let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
    let heartType = HKObjectType.quantityType(forIdentifier: .heartRate)!
    var readTypes: Set<HKObjectType> {
        [workoutType, stepType, sleepType, heartType,
         HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
         HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
         HKObjectType.quantityType(forIdentifier: .distanceCycling)!,
         HKObjectType.quantityType(forIdentifier: .distanceSwimming)!]
    }
    func authorize() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw SyncError.message("Apple Health is not available on this device.") }
        try await store.requestAuthorization(toShare: [], read: readTypes)
    }
    func changes(type: HKSampleType, anchor: Data?, start: Date?, limit: Int = 250) async throws -> HealthPage {
        let saved = try anchor.map { try NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: $0) } ?? nil
        let predicate = start.map { HKQuery.predicateForSamples(withStart: $0, end: nil, options: []) }
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKAnchoredObjectQuery(type: type, predicate: predicate, anchor: saved, limit: limit) { _, samples, deleted, anchor, error in
                if let error { continuation.resume(throwing: error); return }
                guard let anchor else { continuation.resume(throwing: SyncError.message("Health did not return a sync checkpoint.")); return }
                do {
                    let data = try NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true)
                    continuation.resume(returning: HealthPage(samples: samples ?? [], deleted: deleted ?? [], anchor: data))
                } catch { continuation.resume(throwing: error) }
            }
            store.execute(query)
        }
    }
    func samples(type: HKSampleType, from start: Date, to end: Date, limit: Int = HKObjectQueryNoLimit) async throws -> [HKSample] {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: HKQuery.predicateForSamples(withStart: start, end: end, options: []), limit: limit,
                                      sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]) { _, samples, error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: samples ?? []) }
            }
            store.execute(query)
        }
    }
    func workout(_ w: HKWorkout) async throws -> WorkoutUpload {
        let bpm = HKUnit.count().unitDivided(by: .minute())
        var average = w.statistics(for: heartType)?.averageQuantity()?.doubleValue(for: bpm)
        var maximum = w.statistics(for: heartType)?.maximumQuantity()?.doubleValue(for: bpm)
        if average == nil {
            let values: (Double?, Double?) = try await withCheckedThrowingContinuation { continuation in
                let query = HKStatisticsQuery(quantityType: heartType,
                    quantitySamplePredicate: HKQuery.predicateForSamples(withStart: w.startDate, end: w.endDate, options: [.strictStartDate, .strictEndDate]),
                    options: [.discreteAverage, .discreteMax]) { _, statistics, error in
                    if let error { continuation.resume(throwing: error); return }
                    continuation.resume(returning: (statistics?.averageQuantity()?.doubleValue(for: bpm), statistics?.maximumQuantity()?.doubleValue(for: bpm)))
                }
                store.execute(query)
            }
            average = values.0; maximum = values.1
        }
        var calendar = Calendar.current
        if let zone = w.metadata?[HKMetadataKeyTimeZone] as? String, let timezone = TimeZone(identifier: zone) { calendar.timeZone = timezone }
        return WorkoutUpload(id: w.uuid.uuidString.lowercased(), name: Self.name(w.workoutActivityType),
            start: HealthDates.instant(w.startDate), end: HealthDates.instant(w.endDate), localDate: HealthDates.day(w.startDate, calendar: calendar),
            durationSeconds: w.duration, distanceKm: w.totalDistance?.doubleValue(for: .meterUnit(with: .kilo)),
            averageHeartRate: average, maximumHeartRate: maximum, activeCalories: w.totalEnergyBurned?.doubleValue(for: .kilocalorie()))
    }
    func steps(day: String) async throws -> Int? {
        let start = HealthDates.date(day), end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsCollectionQuery(quantityType: stepType,
                quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end, options: []),
                options: .cumulativeSum, anchorDate: start, intervalComponents: DateComponents(day: 1))
            query.initialResultsHandler = { _, collection, error in
                if let error { continuation.resume(throwing: error); return }
                let quantity = collection?.statistics(for: start)?.sumQuantity()?.doubleValue(for: .count())
                continuation.resume(returning: quantity.map { Int($0.rounded()) })
            }
            store.execute(query)
        }
    }
    func sleep(day: String) async throws -> SleepSummary? {
        let date = HealthDates.date(day)
        let start = Calendar.current.date(byAdding: .day, value: -1, to: date)!
        let end = Calendar.current.date(byAdding: .day, value: 1, to: date)!
        let values = try await samples(type: sleepType, from: start, to: end)
        let intervals = values.compactMap { sample -> SleepInterval? in
            guard let sample = sample as? HKCategorySample else { return nil }
            return SleepInterval(start: sample.startDate, end: sample.endDate, stage: sample.value,
                                 source: sample.sourceRevision.source.bundleIdentifier + " " + sample.sourceRevision.source.name)
        }
        return SleepAggregation.summarize(intervals, wakeDate: day)
    }
    static func name(_ activity: HKWorkoutActivityType) -> String {
        switch activity {
        case .running: return "Running"
        case .walking: return "Walking"
        case .cycling: return "Cycling"
        case .swimming: return "Swimming"
        case .hiking: return "Hiking"
        case .traditionalStrengthTraining: return "Traditional Strength Training"
        case .functionalStrengthTraining: return "Functional Strength Training"
        case .highIntensityIntervalTraining: return "HIIT"
        case .coreTraining: return "Core Training"
        case .yoga: return "Yoga"
        case .pilates: return "Pilates"
        case .rowing: return "Rowing"
        case .elliptical: return "Elliptical"
        case .stairClimbing: return "Stair Climbing"
        case .tennis: return "Tennis"
        case .soccer: return "Soccer"
        case .basketball: return "Basketball"
        case .dance: return "Dance"
        case .boxing: return "Boxing"
        default: return "Other"
        }
    }
}
