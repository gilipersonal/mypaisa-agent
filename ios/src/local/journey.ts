import { runJourney, type OpenStream } from '#lib/local/journey.ts';

/** React Native's fetch has no streaming body, so a door on the phone reads the stream through XMLHttpRequest, whose
 * `responseText` grows as bytes arrive. MA-30's real client takes its transport from what the spike (MA-195) finds. */
const openOverXhr: OpenStream = (url, headers, onChunk, signal) =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let read = 0;
    request.open('GET', url);
    Object.entries(headers).forEach(([name, value]) => {
      request.setRequestHeader(name, value);
    });
    request.onprogress = () => {
      onChunk(request.responseText.slice(read));
      read = request.responseText.length;
    };
    request.onerror = () => {
      reject(new Error('the stream failed'));
    };
    request.onload = () => {
      resolve();
    };
    signal.addEventListener('abort', () => {
      request.abort();
      resolve();
    });
    request.send();
  });

export async function runIosJourney(baseUrl: string, member: string): Promise<string> {
  const result = await runJourney(baseUrl, member, `ios-${String(Date.now())}`, openOverXhr);
  return result.reply;
}
