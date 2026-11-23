import SnapshotTesting
import SwiftUI
import XCTest

@testable import MyPaisaUI

/// The pattern for every piece: light and dark, at Large and AX5 text, the iPhone and the iPad each at its own width
/// (TECH_STACK §5).
@MainActor
final class HeroCardTests: XCTestCase {
  private let model = HeroModel(
    title: "Household total",
    figure: "£1,234,568",
    note: "The household's wealth arrives here with phase 2.",
    status: "The api is up, version 0.1.0."
  )

  private func hosted(_ style: UIUserInterfaceStyle, _ text: UIContentSizeCategory, width: CGFloat) -> UIViewController
  {
    let host = UIHostingController(rootView: HeroCard(model: model).padding(16).background(MPColor.bg))
    host.overrideUserInterfaceStyle = style
    host.traitOverrides.preferredContentSizeCategory = text
    let height = host.sizeThatFits(in: CGSize(width: width, height: 2000)).height
    host.view.frame = CGRect(x: 0, y: 0, width: width, height: height)
    host.preferredContentSize = host.view.frame.size
    return host
  }

  func testEveryThemeAndTextSizeAtBothWidths() {
    let isPad = UIDevice.current.userInterfaceIdiom == .pad
    let (widthName, width) = isPad ? ("ipad", 834.0) : ("iphone", 402.0)
    for (styleName, style) in [("light", UIUserInterfaceStyle.light), ("dark", .dark)] {
      for (textName, text) in [("large", UIContentSizeCategory.large), ("ax5", .accessibilityExtraExtraExtraLarge)] {
        let host = hosted(style, text, width: width)
        assertSnapshot(
          of: host,
          as: .image(precision: 0.99, perceptualPrecision: 0.98, size: host.preferredContentSize),
          named: "\(widthName)-\(styleName)-\(textName)"
        )
      }
    }
  }

  func testStoreDecodesOnlyWhenTheStringChanges() {
    let store = HeroStore()
    let json = #"{"title":"A","figure":"£1","note":"B","status":"C"}"#
    store.apply(json: json)
    store.apply(json: json)
    XCTAssertEqual(store.decodes, 1)
    XCTAssertEqual(store.model?.figure, "£1")
    store.apply(json: "not json")
    XCTAssertEqual(store.model?.figure, "£1", "a model that cannot be read leaves the last good one on screen")
  }
}
