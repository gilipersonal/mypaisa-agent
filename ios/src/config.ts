import { LogBox } from 'react-native';

/** What the native side hands the shell at launch (`SceneDelegate.swift`). The base URL is compiled per scheme; only a
 * Debug build can change it, through `MYPAISA_API_URL`. */
export interface AppProps {
  apiUrl?: string;
  buildEpoch?: number;
  /** A Debug build on the local stack signs in as this member (MA-198). Compiled out of every other build. */
  authStub?: string;
  /** A MyPaisa Dev build under test: `src/probe.ts`. */
  probe?: string;
  /** A Debug build launched by Maestro (`MYPAISA_STATIC_MOTION=1`, MA-273). Compiled out of every other build. */
  testMode?: boolean;
}

export const NOT_SET = '';

/** Debug only: a launch under test shows no LogBox. Its toast lies over the tab bar and takes the taps meant for it
 * (MA-273). The whole body sits inside `if (__DEV__)`, so Metro drops it from every bundled Release build. */
export function quietLogBoxUnderTest(props: AppProps): void {
  if (__DEV__) {
    if (props.testMode === true) {
      LogBox.ignoreAllLogs(true);
    }
  }
}

export function apiBaseUrl(props: AppProps): string {
  return props.apiUrl ?? NOT_SET;
}
