import MyPaisaUI
import React
import ReactAppDependencyProvider
import React_RCTAppDelegate
import SwiftUI
import UIKit

class SceneDelegate: RCTDefaultReactNativeFactoryDelegate, UIWindowSceneDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    dependencyProvider = RCTAppDependencyProvider()
    reactNativeFactory = RCTReactNativeFactory(delegate: self)
    let window = UIWindow(windowScene: windowScene)
    window.backgroundColor = UIColor(MPColor.bg)
    self.window = window
    AppConfig.applyDebugHooks(to: window)

    #if DEBUG
      reactNativeFactory?.devMenuConfiguration = RCTDevMenuConfiguration(
        devMenuEnabled: true,
        shakeGestureEnabled: true,
        keyboardShortcutsEnabled: true
      )
    #endif

    reactNativeFactory?.startReactNative(
      withModuleName: "MyPaisa",
      in: window,
      initialProperties: AppConfig.initialProperties,
      connectionOptions: connectionOptions
    )

    if UserDefaults.standard.string(forKey: "mpBench") == "hero" {
      let result = HeroBench.run()
      NSLog("MPBENCH hero decode_us=%.1f layout_us=%.1f", result.decodeMicroseconds, result.layoutMicroseconds)
    }
  }

  override func customize(_ rootView: UIView) {
    rootView.backgroundColor = UIColor(MPColor.bg)
  }

  func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
    RCTLinkingManager.scene(scene, openURLContexts: contexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.scene(scene, continue: userActivity)
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
