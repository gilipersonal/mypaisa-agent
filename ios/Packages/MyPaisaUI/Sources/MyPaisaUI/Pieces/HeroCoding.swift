import Foundation

public enum HeroCoding {
  public static func decode(_ json: String) throws -> HeroModel {
    try JSONDecoder().decode(HeroModel.self, from: Data(json.utf8))
  }
}
