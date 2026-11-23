import Darwin
import Foundation

/// The launch budget's clock (`ios/PERFORMANCE.md`): process start to the first piece on screen, logged once.
@MainActor
enum LaunchClock {
  private static var reported = false

  static func firstPieceDrawn() {
    guard !reported else { return }
    reported = true
    guard let start = processStart() else { return }
    let milliseconds = Date().timeIntervalSince(start) * 1000
    NSLog("MPBENCH launch first_piece_ms=%.0f", milliseconds)
  }

  private static func processStart() -> Date? {
    var info = kinfo_proc()
    var size = MemoryLayout<kinfo_proc>.stride
    var name: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
    guard sysctl(&name, 4, &info, &size, nil, 0) == 0 else { return nil }
    let time = info.kp_proc.p_un.__p_starttime
    return Date(timeIntervalSince1970: Double(time.tv_sec) + Double(time.tv_usec) / 1_000_000)
  }
}
