import Foundation

// Refuse redirects so a server redirect cannot forward the sync credential to another host.
final class NoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
final class ARCClient {
    private let connection: Connection
    private let session: URLSession
    init(_ connection: Connection) {
        self.connection = connection
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 25
        configuration.timeoutIntervalForResource = 30
        session = URLSession(configuration: configuration, delegate: NoRedirects(), delegateQueue: nil)
    }
    deinit { session.invalidateAndCancel() }
    static func connection(url: String, key: String) throws -> Connection {
        guard let url = URL(string: url.trimmingCharacters(in: .whitespacesAndNewlines)), url.scheme == "https",
              url.host != nil, url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              url.path.isEmpty || url.path == "/", !key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw SyncError.message("Enter your ARC HTTPS website address and sync key.")
        }
        return Connection(baseURL: url, apiKey: key.trimmingCharacters(in: .whitespacesAndNewlines))
    }
    private func request(payload: Data? = nil) async throws -> Data {
        var request = URLRequest(url: connection.baseURL.appendingPathComponent("api/sync/healthkit"))
        request.httpMethod = payload == nil ? "GET" : "POST"
        request.setValue(connection.apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = payload
        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw SyncError.message("ARC returned an invalid response.") }
        switch response.statusCode {
        case 200: return data
        case 401: throw SyncError.message("The sync key was rejected. Update the connection and retry.")
        case 404: throw SyncError.message("This ARC server does not have native syncing deployed yet.")
        case 409: throw SyncError.message("ARC found a sync conflict. Your pending batch is saved; contact support before resetting it.")
        case 422: throw SyncError.message("ARC could not accept this batch. It is saved for retry; no checkpoint was advanced.")
        default: throw SyncError.message("ARC is unavailable (HTTP \(response.statusCode)). Your batch is saved for retry.")
        }
    }
    func verify() async throws {
        struct Service: Decodable { let version: Int; let service: String }
        let data = try await request()
        let service = try JSONDecoder().decode(Service.self, from: data)
        guard service.version == 1 && service.service == "ARC HealthKit" else { throw SyncError.message("This server uses a different sync version.") }
    }
    func upload(_ pending: PendingUpload) async throws -> Receipt {
        let data = try await request(payload: pending.payload)
        let receipt = try JSONDecoder().decode(Receipt.self, from: data)
        guard receipt.accepted && receipt.batchId.lowercased() == pending.batchId.lowercased() else { throw SyncError.message("ARC did not acknowledge this batch. It will be retried.") }
        return receipt
    }
}
