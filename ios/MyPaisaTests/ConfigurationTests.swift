import XCTest

/// What the scheme compiled in (MA-165): run under MyPaisa Dev, so a wrong id or base URL fails here, not on TestFlight.
final class ConfigurationTests: XCTestCase {
  private let info = Bundle.main.infoDictionary ?? [:]

  func testTheSchemeChoosesTheBundleIdAndTheBaseURL() {
    XCTAssertEqual(Bundle.main.bundleIdentifier, "com.mypaisapp.agent.dev")
    XCTAssertEqual(info["MPApiBaseURL"] as? String, "https://api-dev.mypaisapp.com")
    XCTAssertEqual(info["CFBundleDisplayName"] as? String, "MyPaisa Dev")
  }

  func testTheBuildCarriesItsEpoch() throws {
    let epoch = try XCTUnwrap(info["MYPAISA_BUILD_EPOCH"] as? Int)
    XCTAssertGreaterThan(epoch, 1_790_000_000, "the build phase did not stamp the epoch")
  }

  func testAnOptimisedBuildCannotReachTheLocalNetwork() {
    let transport = info["NSAppTransportSecurity"] as? [String: Any]
    XCTAssertNil(transport?["NSAllowsLocalNetworking"])
  }
}
