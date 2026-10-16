import Foundation
import Security

struct Connection: Codable {
    let baseURL: URL
    let apiKey: String
}
enum SyncError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case let .message(message) = self { return message }; return nil }
}
enum SecureStorage {
    static let service = "ARCHealth.connection"
    static func connection() throws -> Connection? {
        var result: CFTypeRef?
        let status = SecItemCopyMatching([kSecClass: kSecClassGenericPassword, kSecAttrService: service,
            kSecReturnData: true, kSecMatchLimit: kSecMatchLimitOne] as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw SyncError.message("Unlock your iPhone to access the connection.") }
        return try JSONDecoder().decode(Connection.self, from: data)
    }
    static func save(_ connection: Connection) throws {
        let data = try JSONEncoder().encode(connection)
        let query = [kSecClass: kSecClassGenericPassword, kSecAttrService: service] as CFDictionary
        let attributes = [kSecValueData: data, kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly] as CFDictionary
        var status = SecItemUpdate(query, attributes)
        if status == errSecItemNotFound {
            status = SecItemAdd([kSecClass: kSecClassGenericPassword, kSecAttrService: service,
                kSecValueData: data, kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly] as CFDictionary, nil)
        }
        guard status == errSecSuccess else { throw SyncError.message("Could not save the connection securely.") }
    }
    static func remove() { SecItemDelete([kSecClass: kSecClassGenericPassword, kSecAttrService: service] as CFDictionary) }
}

final class CheckpointStore {
    private let directory: URL
    init() throws {
        directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("HealthSync", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
        var url = directory
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try url.setResourceValues(values)
    }
    func load<T: Decodable>(_ name: String, as type: T.Type) throws -> T? {
        let url = directory.appendingPathComponent(name)
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return try JSONDecoder().decode(type, from: Data(contentsOf: url))
    }
    func save<T: Encodable>(_ value: T, as name: String) throws {
        let url = directory.appendingPathComponent(name)
        try JSONEncoder().encode(value).write(to: url, options: [.atomic, .completeFileProtection])
    }
    func remove(_ name: String) throws {
        let url = directory.appendingPathComponent(name)
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
}
