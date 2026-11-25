/// The one selector dictionary (MA-165, MA-273, MA-274), `mp.<surface>.<component>`. It mirrors
/// `web/src/lib/test-ids.ts`, and `scripts/ios_gates.sh` fails when the two differ.
public enum TestIDs {
  public static let tabChat = "mp.tab.chat"
  public static let tabHome = "mp.tab.home"
  public static let tabActivity = "mp.tab.activity"
  public static let tabYou = "mp.tab.you"
  public static let tabAssets = "mp.tab.assets"
  public static let tabProjection = "mp.tab.projection"
  public static let tabMore = "mp.tab.more"
  public static let homeHero = "mp.home.hero"
}
