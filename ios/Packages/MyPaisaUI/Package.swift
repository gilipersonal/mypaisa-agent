// swift-tools-version: 6.2
import PackageDescription

// The SwiftUI pieces and the design system (MA-165): every pixel a member looks at, with no React Native in it, so a
// piece builds and tests on its own.
let package = Package(
  name: "MyPaisaUI",
  platforms: [.iOS(.v26)],
  products: [.library(name: "MyPaisaUI", targets: ["MyPaisaUI"])],
  dependencies: [
    .package(path: "../../MyPaisaCore"),
    .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", exact: "1.19.7"),
  ],
  targets: [
    .target(
      name: "MyPaisaUI",
      dependencies: ["MyPaisaCore"],
      resources: [.process("Resources")]
    ),
    .testTarget(
      name: "MyPaisaUISnapshots",
      dependencies: [
        "MyPaisaUI",
        .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
      ],
      exclude: ["__Snapshots__"]
    ),
  ]
)
