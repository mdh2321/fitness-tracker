import Foundation

struct WorkoutUpload: Codable {
    var id: String
    var name: String
    var start: String
    var end: String
    var localDate: String
    var durationSeconds: Double
    var distanceKm: Double?
    var averageHeartRate: Double?
    var maximumHeartRate: Double?
    var activeCalories: Double?
}
struct SleepSummary: Codable, Equatable {
    var totalMinutes: Double
    var inBedMinutes: Double?
    var deepMinutes: Double?
    var remMinutes: Double?
    var coreMinutes: Double?
    var awakeMinutes: Double?
    var confirmedDeletion = false
}
struct DayUpload: Codable {
    var date: String
    var steps: Int?
    var stepsConfirmedDeletion = false
    var sleep: SleepSummary?
}
struct UploadBatch: Codable {
    var version = 1
    var batchId = UUID().uuidString.lowercased()
    var deviceId: String
    var workouts: [WorkoutUpload]
    var deletedWorkoutIds: [String]
    var days: [DayUpload]
}
struct SyncCheckpoint: Codable {
    var deviceId = UUID().uuidString.lowercased()
    var historyStart = Calendar.current.date(byAdding: .day, value: -90, to: Date())!
    var anchors: [String: Data] = [:]
    // Keep dates for tombstones, because deleted HealthKit objects contain only UUIDs.
    var sampleDays: [String: [String: [String]]] = [:]
    var dirtyStepDays: Set<String> = []
    var dirtySleepDays: Set<String> = []
    var deletedStepDays: Set<String> = []
    var deletedSleepDays: Set<String> = []
    var lastSuccess: Date?
    var lastDataUpload: Date?
    var importedWorkouts = 0
    var importedDays = 0
}
struct PendingUpload: Codable {
    var payload: Data
    var batchId: String
    var nextCheckpoint: SyncCheckpoint
}
struct Receipt: Decodable {
    let accepted: Bool
    let batchId: String
    let imported: Int
    let updated: Int
    let deleted: Int
    let steps: Int
    let sleep: Int
}

enum HealthDates {
    static func day(_ date: Date, calendar: Calendar = .current) -> String {
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", components.year!, components.month!, components.day!)
    }
    static func date(_ value: String, calendar: Calendar = .current) -> Date {
        let c = value.split(separator: "-").compactMap { Int($0) }
        return calendar.date(from: DateComponents(year: c[0], month: c[1], day: c[2]))!
    }
    static func days(from start: Date, to end: Date, extraDay: Bool = false, calendar: Calendar = .current) -> [String] {
        var current = calendar.startOfDay(for: start)
        let last = calendar.date(byAdding: .day, value: extraDay ? 1 : 0, to: calendar.startOfDay(for: end))!
        var days: [String] = []
        while current <= last {
            days.append(day(current, calendar: calendar))
            current = calendar.date(byAdding: .day, value: 1, to: current)!
        }
        return days
    }
    static func instant(_ date: Date) -> String { ISO8601DateFormatter().string(from: date) }
}
