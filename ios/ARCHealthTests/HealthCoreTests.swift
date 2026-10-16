import XCTest
@testable import ARCHealthCore

final class HealthCoreTests: XCTestCase {
    let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Australia/Melbourne")!
        return c
    }()
    func date(_ value: String) -> Date { ISO8601DateFormatter().date(from: value)! }
    func testOverlappingStagesAndSourcesAreNotDoubleCounted() {
        let start = date("2026-10-14T22:00:00+11:00"), end = date("2026-10-15T06:00:00+11:00")
        let intervals = [
            SleepInterval(start: start, end: end, stage: 1, source: "Oura"),
            SleepInterval(start: start, end: end, stage: 1, source: "Apple Watch"),
            SleepInterval(start: start, end: start.addingTimeInterval(3600), stage: 4, source: "Oura"),
            SleepInterval(start: end.addingTimeInterval(-1800), end: end, stage: 2, source: "Oura"),
        ]
        let result = SleepAggregation.summarize(intervals, wakeDate: "2026-10-15", calendar: calendar)
        XCTAssertEqual(result?.totalMinutes, 450)
        XCTAssertEqual(result?.deepMinutes, 60)
        XCTAssertEqual(result?.awakeMinutes, 30)
        XCTAssertNil(SleepAggregation.summarize(intervals, wakeDate: "2026-10-14", calendar: calendar))
    }
    func testOtherSourceIsUsedWhenOuraOnlyHasThePreviousNight() {
        let previous = date("2026-10-13T22:00:00+11:00")
        let current = date("2026-10-14T22:00:00+11:00")
        let intervals = [SleepInterval(start: previous, end: previous.addingTimeInterval(28800), stage: 1, source: "Oura"),
                         SleepInterval(start: current, end: current.addingTimeInterval(25200), stage: 1, source: "Apple Watch")]
        XCTAssertEqual(SleepAggregation.summarize(intervals, wakeDate: "2026-10-15", calendar: calendar)?.totalMinutes, 420)
    }
    func testMissingDataIsNotZeroSleep() {
        XCTAssertNil(SleepAggregation.summarize([], wakeDate: "2026-10-15", calendar: calendar))
        let start = date("2026-10-14T22:00:00+11:00")
        XCTAssertNil(SleepAggregation.summarize([SleepInterval(start: start, end: start.addingTimeInterval(300), stage: 0, source: "Oura")], wakeDate: "2026-10-15", calendar: calendar))
    }
    func testLocalDaysAcrossDaylightSaving() {
        let start = date("2026-10-03T23:00:00+10:00"), end = date("2026-10-05T01:00:00+11:00")
        XCTAssertEqual(HealthDates.days(from: start, to: end, calendar: calendar), ["2026-10-03", "2026-10-04", "2026-10-05"])
    }
    func testPendingUploadKeepsExactBatchAndProspectiveCheckpoint() throws {
        var checkpoint = SyncCheckpoint()
        checkpoint.anchors["workouts"] = Data([1, 2, 3])
        let batch = UploadBatch(deviceId: checkpoint.deviceId, workouts: [], deletedWorkoutIds: [], days: [])
        let pending = PendingUpload(payload: try JSONEncoder().encode(batch), batchId: batch.batchId, nextCheckpoint: checkpoint)
        let recovered = try JSONDecoder().decode(PendingUpload.self, from: JSONEncoder().encode(pending))
        XCTAssertEqual(recovered.payload, pending.payload)
        XCTAssertEqual(recovered.batchId, batch.batchId)
        XCTAssertEqual(recovered.nextCheckpoint.anchors["workouts"], Data([1, 2, 3]))
    }
}
