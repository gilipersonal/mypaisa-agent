import Foundation
import SwiftUI
import UIKit

/// The hero's bench (`ios/PERFORMANCE.md`): what one new model costs, the part of a card's arrival the shell cannot
/// hide. Run it with the launch argument `-mpBench hero`, on the phone for a result that counts.
@MainActor
public enum HeroBench {
  public struct Result: Sendable {
    public let decodeMicroseconds: Double
    public let layoutMicroseconds: Double
  }

  public static func run(rounds: Int = 500) -> Result {
    let models = (0..<rounds).map { index in
      """
      {"title":"Household total","figure":"£\(index)","note":"A note on two lines at most.","status":"Up"}
      """
    }
    let decodeStart = ContinuousClock.now
    for json in models { _ = try? HeroCoding.decode(json) }
    let decode = ContinuousClock.now - decodeStart

    let host = UIHostingController(
      rootView: HeroCard(model: HeroModel(title: "", figure: "", note: "", status: ""))
    )
    let size = CGSize(width: 390, height: 400)
    let layoutStart = ContinuousClock.now
    for index in 0..<rounds {
      host.rootView = HeroCard(model: HeroModel(title: "Total", figure: "£\(index)", note: "A note", status: "Up"))
      _ = host.sizeThatFits(in: size)
    }
    let layout = ContinuousClock.now - layoutStart
    return Result(
      decodeMicroseconds: microseconds(decode) / Double(rounds),
      layoutMicroseconds: microseconds(layout) / Double(rounds)
    )
  }

  private static func microseconds(_ duration: Duration) -> Double {
    let parts = duration.components
    return Double(parts.seconds) * 1_000_000 + Double(parts.attoseconds) / 1_000_000_000_000
  }
}
