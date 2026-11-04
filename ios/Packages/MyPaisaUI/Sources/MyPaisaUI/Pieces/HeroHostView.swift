import SwiftUI

/// The store's model as the card; nothing until the first model arrives.
public struct HeroHostView: View {
  private let store: HeroStore
  private let onHeight: @MainActor (Double) -> Void

  public init(store: HeroStore, onHeight: @escaping @MainActor (Double) -> Void = { _ in }) {
    self.store = store
    self.onHeight = onHeight
  }

  public var body: some View {
    if let model = store.model {
      HeroCard(model: model, onHeight: onHeight)
    }
  }
}
