import Foundation
import UIKit

/// What the shell is told at launch. The base URL is compiled per scheme (`Config/*.xcconfig`). The `MYPAISA_*`
/// hooks exist for Maestro (MA-273) in a Debug build only: `scripts/ios_gates.sh` fails if their names reach a
/// Release binary.
enum AppConfig {
  static var initialProperties: [AnyHashable: Any] {
    var properties: [AnyHashable: Any] = ["apiUrl": apiBaseURL, "buildEpoch": buildEpoch]
    #if DEBUG
      if let member = ProcessInfo.processInfo.environment["MYPAISA_AUTH_STUB"], !member.isEmpty {
        properties["authStub"] = member
      }
    #endif
    #if MP_PROBES
      if let probe = UserDefaults.standard.string(forKey: "mpProbe") {
        properties["probe"] = probe
      }
    #endif
    return properties
  }

  static var buildEpoch: Int {
    Bundle.main.object(forInfoDictionaryKey: "MYPAISA_BUILD_EPOCH") as? Int ?? 0
  }

  static var apiBaseURL: String {
    #if DEBUG
      if let override = ProcessInfo.processInfo.environment["MYPAISA_API_URL"], !override.isEmpty {
        return override
      }
    #endif
    return Bundle.main.object(forInfoDictionaryKey: "MPApiBaseURL") as? String ?? ""
  }

  @MainActor
  static func applyDebugHooks(to window: UIWindow) {
    #if DEBUG
      let environment = ProcessInfo.processInfo.environment
      if environment["MYPAISA_STATIC_MOTION"] == "1" {
        UIView.setAnimationsEnabled(false)
      }
      if let width = environment["MYPAISA_VIEWPORT_WIDTH"].flatMap(Double.init) {
        window.frame.size.width = width
      }
    #endif
  }
}
