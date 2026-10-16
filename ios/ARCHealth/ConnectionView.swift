import SwiftUI

struct ConnectionView: View {
    @ObservedObject var sync: SyncCoordinator
    @State private var address = "https://fitness-tracker-black-two.vercel.app"
    @State private var key = ""
    @State private var showConnection = false
    @State private var showDisconnect = false
    private let ink = Color(red: 0.15, green: 0.17, blue: 0.15)
    private let accent = Color(red: 0.32, green: 0.40, blue: 0.30)
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    HStack {
                        Text("ARC").font(.system(size: 26, weight: .medium, design: .serif)).tracking(4)
                        Spacer()
                        Text("HEALTH COMPANION").font(.system(size: 10, weight: .medium)).tracking(2).foregroundStyle(.secondary)
                    }.padding(.top, 24)
                    VStack(alignment: .leading, spacing: 14) {
                        Text("A clearer view\nof your days.").font(.system(size: 43, weight: .regular, design: .serif)).tracking(-1)
                        Text("Your Apple Health data, together in ARC.")
                            .font(.system(size: 16)).foregroundStyle(.secondary)
                    }.padding(.vertical, 20)
                    Divider()
                    VStack(alignment: .leading, spacing: 18) {
                        Label(sync.busy ? "Syncing" : sync.connected ? "Connected to ARC" : "Ready when you are", systemImage: sync.busy ? "arrow.triangle.2.circlepath" : "circle.fill")
                            .font(.system(size: 14, weight: .medium)).foregroundStyle(accent)
                        Text(sync.message).font(.system(size: 16)).fixedSize(horizontal: false, vertical: true)
                        if let last = sync.lastSuccess {
                            HStack { Text("Last server check"); Spacer(); Text(last, style: .relative).monospacedDigit() }.font(.caption).foregroundStyle(.secondary)
                        }
                        if let last = sync.lastDataUpload {
                            HStack { Text("Last data upload"); Spacer(); Text(last, style: .relative).monospacedDigit() }.font(.caption).foregroundStyle(.secondary)
                        }
                        if sync.pending { Text("A batch is saved on this iPhone for retry.").font(.caption).foregroundStyle(.secondary) }
                        if let warning = sync.backgroundWarning { Text(warning).font(.caption).foregroundStyle(.orange) }
                    }
                    if !sync.connected || showConnection {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("YOUR CONNECTION").font(.caption).tracking(2)
                            TextField("ARC website", text: $address).textContentType(.URL).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                                .padding(16).background(.white, in: RoundedRectangle(cornerRadius: 10))
                            SecureField("Sync key", text: $key).textInputAutocapitalization(.never).autocorrectionDisabled()
                                .padding(16).background(.white, in: RoundedRectangle(cornerRadius: 10))
                            Text("Use the SYNC_API_KEY from your ARC Vercel settings. It is stored in this iPhone’s Keychain.")
                                .font(.caption).foregroundStyle(.secondary)
                            Text("Connecting lets ARC read your workouts, steps, sleep and workout heart rate, then send summaries to your ARC website. It never writes to Apple Health.")
                                .font(.footnote).foregroundStyle(.secondary)
                            Button {
                                Task {
                                    await sync.connect(url: address, key: key)
                                    if sync.connected { key = ""; showConnection = false; _ = await sync.sync() }
                                }
                            } label: { Text("Connect Apple Health").foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 10) }
                                .buttonStyle(.borderedProminent).tint(ink).disabled(sync.busy)
                        }
                    } else {
                        Button { Task { _ = await sync.sync() } } label: {
                            HStack { Text(sync.busy ? "Syncing…" : "Sync now"); Spacer(); Image(systemName: "arrow.up.right") }.foregroundStyle(.white).padding(.vertical, 12)
                        }.buttonStyle(.borderedProminent).tint(ink).disabled(sync.busy)
                        Link(destination: URL(string: address)!) { HStack { Text("Open your dashboard"); Spacer(); Image(systemName: "arrow.up.right") } }.foregroundStyle(ink)
                    }
                    VStack(alignment: .leading, spacing: 14) {
                        Text("WHAT COMES ACROSS").font(.caption).tracking(2).foregroundStyle(.secondary)
                        Text("Workouts & running metrics").font(.system(size: 17, design: .serif))
                        Text("Distance, duration and heart rate when available. All readable workout history, plus steps and sleep from the past 90 days.").font(.footnote).foregroundStyle(.secondary)
                        Divider()
                        Text("Made for the background").font(.system(size: 17, design: .serif))
                        Text("Apple decides when background updates run. Open this app to catch up after being offline. Keep Oura’s Apple Health sharing enabled.").font(.footnote).foregroundStyle(.secondary)
                    }
                    if sync.connected {
                        HStack {
                            Button("Connection settings") { showConnection.toggle() }
                            Spacer()
                            Button("Disconnect", role: .destructive) { showDisconnect = true }
                        }.font(.caption).disabled(sync.busy)
                    }
                    Text("Health permissions are managed in Apple Health. Empty results can mean there is no data, or that access hasn’t been granted.")
                        .font(.caption).foregroundStyle(.secondary)
                }.padding(.horizontal, 28).padding(.bottom, 36)
            }
            .background(Color(red: 0.97, green: 0.96, blue: 0.94)).foregroundStyle(ink)
            .toolbar(.hidden, for: .navigationBar)
            .confirmationDialog("Disconnect Apple Health from ARC?", isPresented: $showDisconnect, titleVisibility: .visible) {
                Button("Disconnect", role: .destructive) { Task { await sync.disconnect() } }
            } message: { Text("Stops future uploads. Existing ARC data and protected sync checkpoints remain saved.") }
            .task { if let connection = try? SecureStorage.connection() { address = connection.baseURL.absoluteString } }
        }
        .preferredColorScheme(.light)
    }
}
