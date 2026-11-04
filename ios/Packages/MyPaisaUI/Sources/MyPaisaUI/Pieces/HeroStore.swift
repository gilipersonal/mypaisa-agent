import Observation

/// Holds the model a Fabric host gives the view. A new string decodes only when it differs, so a parent's re-render
/// costs one comparison.
@MainActor
@Observable
public final class HeroStore {
  public private(set) var model: HeroModel?
  public private(set) var decodes = 0
  private var lastJSON = ""

  public init() {}

  public func apply(json: String) {
    guard json != lastJSON else { return }
    lastJSON = json
    guard let decoded = try? HeroCoding.decode(json) else { return }
    decodes += 1
    model = decoded
  }

  public func reset() {
    lastJSON = ""
    model = nil
  }
}
