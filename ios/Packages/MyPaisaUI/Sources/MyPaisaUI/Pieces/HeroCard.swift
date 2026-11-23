import MyPaisaCore
import SwiftUI

/// The first SwiftUI piece (MA-165) and the pattern for the rest: a plain view over one model, sized by its content, and
/// never scrolling; the page around it belongs to the shell. The navy hero card is content, so it is never glass.
public struct HeroCard: View {
  private let model: HeroModel
  private let onHeight: @MainActor (Double) -> Void

  public init(model: HeroModel, onHeight: @escaping @MainActor (Double) -> Void = { _ in }) {
    self.model = model
    self.onHeight = onHeight
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(model.title)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(MPColor.heroInk2)
      Text(model.figure)
        .font(.system(.largeTitle, design: .rounded, weight: .heavy))
        .monospacedDigit()
        .foregroundStyle(MPColor.heroInk)
        .contentTransition(.numericText())
      Text(model.note)
        .font(.subheadline)
        .foregroundStyle(MPColor.heroInk2)
      Text(model.status)
        .font(.footnote)
        .foregroundStyle(MPColor.heroInk2)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(20)
    .background(MPColor.hero, in: .rect(cornerRadius: 22, style: .continuous))
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier(TestIDs.homeHero)
    .fixedSize(horizontal: false, vertical: true)
    .onGeometryChange(for: Double.self) {
      Double($0.size.height)
    } action: {
      onHeight($0)
    }
  }
}
