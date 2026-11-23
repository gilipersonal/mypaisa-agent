/// What the hero draws: every string formatted by the shell (`ios/src/models/hero.ts`), so a piece never formats a
/// figure and the two doors read the same.
public struct HeroModel: Codable, Equatable, Sendable {
  public var title: String
  public var figure: String
  public var note: String
  public var status: String

  public init(title: String, figure: String, note: String, status: String) {
    self.title = title
    self.figure = figure
    self.note = note
    self.status = status
  }
}
