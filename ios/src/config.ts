/** What the native side hands the shell at launch (`SceneDelegate.swift`). The base URL is compiled per scheme; only a
 * Debug build can change it, through `MYPAISA_API_URL`. */
export interface AppProps {
  apiUrl?: string;
  buildEpoch?: number;
  /** A Debug build on the local stack signs in as this member (MA-198). Compiled out of every other build. */
  authStub?: string;
  /** A MyPaisa Dev build under test: `src/probe.ts`. */
  probe?: string;
}

export const NOT_SET = '';

export function apiBaseUrl(props: AppProps): string {
  return props.apiUrl ?? NOT_SET;
}
