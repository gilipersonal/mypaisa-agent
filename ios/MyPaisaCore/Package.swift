// swift-tools-version: 6.2
import PackageDescription

// What the app's Swift shares and draws nothing: the selector dictionary (MA-274), and later the plain Swift models.
let package = Package(
  name: "MyPaisaCore",
  platforms: [.iOS(.v26)],
  products: [.library(name: "MyPaisaCore", targets: ["MyPaisaCore"])],
  targets: [.target(name: "MyPaisaCore", path: "Testing")]
)
