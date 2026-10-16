import SwiftUI
import UIKit
import BackgroundTasks

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        let sync = SyncCoordinator.shared
        BGTaskScheduler.shared.register(forTaskWithIdentifier: SyncCoordinator.refreshIdentifier, using: .main) { task in
            Task { @MainActor in
                sync.scheduleRefresh()
                let work = Task {
                    let success = await sync.sync()
                    task.setTaskCompleted(success: success)
                }
                task.expirationHandler = { Task { @MainActor in sync.cancel(); work.cancel() } }
            }
        }
        sync.startObservers()
        return true
    }
}
@main
struct ARCHealthApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @Environment(\.scenePhase) private var phase
    @StateObject private var sync = SyncCoordinator.shared
    var body: some Scene {
        WindowGroup {
            ConnectionView(sync: sync)
                .onChange(of: phase) { _, phase in
                    if phase == .active && sync.connected { Task { _ = await sync.sync() } }
                }
        }
    }
}
