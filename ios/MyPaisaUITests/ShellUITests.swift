import XCTest

/// The shell end to end, on the bundled JavaScript (MA-165): the system's tab bar answers, and the first SwiftUI piece
/// draws a figure formatted by the code the web app runs, under Hermes.
final class ShellUITests: XCTestCase {
  @MainActor
  func testTheTabsAndTheFirstPiece() {
    let app = XCUIApplication()
    app.launch()

    let hero = app.descendants(matching: .any)["mp.home.hero"]
    XCTAssertTrue(hero.waitForExistence(timeout: 30), "the hero never drew")
    XCTAssertTrue(app.staticTexts["Chat"].waitForExistence(timeout: 5), "the app opens to the chat")
    XCTAssertTrue(app.staticTexts["£0"].exists, "the shared formatter did not reach the piece")

    app.tabBars.buttons["mp.tab.home"].tap()
    XCTAssertTrue(app.staticTexts["Household total"].waitForExistence(timeout: 5), "the tab did not answer")
  }

  /// A promise about behaviour is checked by doing it (lesson 47): the money code the web app runs, on Hermes itself.
  @MainActor
  func testTheSharedFormattingReadsTheSameUnderHermes() {
    let app = XCUIApplication()
    app.launchArguments = ["-mpProbe", "formatting"]
    app.launch()
    let expected =
      "£1,234,567.50 ₹12,34,567.50 ₹12,34,56,789 £9,007,199,254,740,993.25 +£1,200.00 £1.01 £0.00 ₹34.5 L -£48.2k ₹••••"
    XCTAssertTrue(
      app.staticTexts[expected].waitForExistence(timeout: 30),
      "the shared code read differently under Hermes"
    )
  }

  @MainActor
  func testTheScreenPassesTheAccessibilityAudit() throws {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.descendants(matching: .any)["mp.home.hero"].waitForExistence(timeout: 30))
    try app.performAccessibilityAudit()
  }
}
