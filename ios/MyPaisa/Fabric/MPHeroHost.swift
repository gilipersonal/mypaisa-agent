import MyPaisaUI
import SwiftUI
import UIKit

/// The hosting half of a Fabric piece: a `UIHostingController` the Objective-C++ view embeds. Copy this, its `.mm` and
/// the codegen spec for each new piece. The hosted view sizes itself and reports it, since a Fabric view cannot.
@MainActor
@objc(MPHeroHost)
public final class MPHeroHost: NSObject {
  private let store = HeroStore()
  private let host: UIHostingController<HeroHostView>
  @objc public var onHeight: ((Double) -> Void)?

  @objc public var view: UIView { host.view }
  @objc public var viewController: UIViewController { host }

  @objc public override init() {
    host = UIHostingController(rootView: HeroHostView(store: store))
    super.init()
    host.view.backgroundColor = .clear
    host.safeAreaRegions = []
    host.sizingOptions = []
    host.rootView = HeroHostView(store: store) { [weak self] height in
      LaunchClock.firstPieceDrawn()
      self?.onHeight?(height)
    }
  }

  @objc public func apply(modelJSON: String) {
    store.apply(json: modelJSON)
  }

  @objc public func reset() {
    store.reset()
  }
}

/// The tokens Objective-C++ needs, since a bar is UIKit and its colours still come from the Warm ledger.
@MainActor
@objc(MPTheme)
public final class MPTheme: NSObject {
  @objc public static var accent: UIColor { UIColor(MPColor.accent) }
}
