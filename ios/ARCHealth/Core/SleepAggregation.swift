import Foundation

struct SleepInterval {
    // HealthKit category raw values: 0 in bed, 1 unspecified asleep, 2 awake, 3 core, 4 deep, 5 REM.
    let start: Date
    let end: Date
    let stage: Int
    let source: String
}

enum SleepAggregation {
    static func summarize(_ input: [SleepInterval], wakeDate: String, calendar: Calendar = .current) -> SleepSummary? {
        let valid = input.filter { $0.end > $0.start && (0...5).contains($0.stage) }
        guard !valid.isEmpty else { return nil }
        // Prefer Oura, otherwise the source with the greatest non-overlapping asleep coverage.
        // Never add the same night recorded by multiple devices together.
        let bySource = Dictionary(grouping: valid, by: \.source)
        var sources: [String: [SleepInterval]] = [:]
        for (source, values) in bySource {
            var sessions: [[SleepInterval]] = []
            var end = Date.distantPast
            for interval in values.sorted(by: { $0.start < $1.start }) {
                if interval.start.timeIntervalSince(end) > 2 * 3600 { sessions.append([]) }
                sessions[sessions.count - 1].append(interval)
                end = max(end, interval.end)
            }
            let selected = sessions.filter { group in
                let asleep = group.filter { [1, 3, 4, 5].contains($0.stage) }
                guard let wake = asleep.map(\.end).max() else { return false }
                return HealthDates.day(wake, calendar: calendar) == wakeDate
            }.flatMap { $0 }
            if !selected.isEmpty { sources[source] = selected }
        }
        guard !sources.isEmpty else { return nil }
        let selected = sources.keys.sorted().max { a, b in
            let aOura = a.localizedCaseInsensitiveContains("oura"), bOura = b.localizedCaseInsensitiveContains("oura")
            if aOura != bOura { return !aOura }
            return asleepSeconds(sources[a]!) < asleepSeconds(sources[b]!)
        }!
        let chosen = sources[selected]!
        guard chosen.contains(where: { [1, 3, 4, 5].contains($0.stage) }) else { return nil }
        let bounds = Array(Set(chosen.flatMap { [$0.start, $0.end] })).sorted()
        var seconds = [Int: Double]()
        var inBed = 0.0
        for (start, end) in zip(bounds, bounds.dropFirst()) {
            let covering = chosen.filter { $0.start < end && $0.end > start }
            let duration = end.timeIntervalSince(start)
            if covering.contains(where: { $0.stage == 0 }) { inBed += duration }
            // Specific stages take precedence over an overlapping generic asleep interval.
            let stage = [2, 4, 5, 3, 1].first { s in covering.contains { $0.stage == s } }
            if let stage { seconds[stage, default: 0] += duration }
        }
        let total = [1, 3, 4, 5].reduce(0) { $0 + seconds[$1, default: 0] } / 60
        guard total > 0 else { return nil }
        return SleepSummary(totalMinutes: total, inBedMinutes: inBed > 0 ? inBed / 60 : nil,
                            deepMinutes: seconds[4].map { $0 / 60 }, remMinutes: seconds[5].map { $0 / 60 },
                            coreMinutes: seconds[3].map { $0 / 60 }, awakeMinutes: seconds[2].map { $0 / 60 })
    }
    private static func asleepSeconds(_ intervals: [SleepInterval]) -> Double {
        let intervals = intervals.filter { [1, 3, 4, 5].contains($0.stage) }.sorted { $0.start < $1.start }
        var end = Date.distantPast, total = 0.0
        for interval in intervals {
            total += max(0, interval.end.timeIntervalSince(max(end, interval.start)))
            end = max(end, interval.end)
        }
        return total
    }
}
