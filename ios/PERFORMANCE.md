# The iOS app's performance

Arun, 26 Oct 2026 (MA-186): "Performance is key … silky smooth like Monzo". Smoothness here is a number with a bench,
run before a change and after it.

## The budgets

Measured on the phone, never the simulator (`ARCHITECTURE.md` §8.5):

| Budget | Target |
| --- | --- |
| Scrolling the chat and the dashboard, and as cards arrive | 0 dropped frames at 120 Hz |
| A chart scrub | 120 Hz |
| Launch, process start to the first piece on screen | 400 ms on the phone, optimised build (to confirm with the first phone run) |
| What one new model costs a piece | under one 120 Hz frame (8.3 ms) for decode and layout together |

## The benches

Each is a launch argument on an optimised build (`Dev` or `Release`).

| Bench | Run it | Reads |
| --- | --- | --- |
| Launch | any launch | `MPBENCH launch first_piece_ms` in the device log, written when the first piece reports its height |
| Hero | launch argument `-mpBench hero` | `MPBENCH hero decode_us layout_us`, each per model, over 500 models |

## Results

| Date | Device | Build | Bench | Result |
| --- | --- | --- | --- | --- |
| 4 Nov 2026 | iPhone 17 Pro simulator, iOS 26.5, Apple Silicon Mac | `Dev`, commit of MA-165 | Hero | decode 1.7 µs, layout 37.1 µs |
| 4 Nov 2026 | iPhone 17 Pro simulator, iOS 26.5, Apple Silicon Mac | `Dev`, commit of MA-165 | Launch, 5 warm launches | 201 to 203 ms; 244 ms under the hero bench |

**These are simulator numbers, a baseline for comparing changes, and they are not the budgets' result.** The first
phone run comes with a device build, which needs the Apple Developer Program (MA-162). The two frame-rate budgets have
no bench yet: they arrive with the first scrolling screen and the first chart.
