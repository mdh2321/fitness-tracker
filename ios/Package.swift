// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "ARCHealthCore", platforms: [.macOS(.v13), .iOS(.v17)], products: [.library(name: "ARCHealthCore", targets: ["ARCHealthCore"])], targets: [
    .target(name: "ARCHealthCore", path: "ARCHealth/Core"),
    .testTarget(name: "ARCHealthCoreTests", dependencies: ["ARCHealthCore"], path: "ARCHealthTests")
])
