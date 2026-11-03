/** Whether the service worker answers a request from its cache: only a GET, on the app's own origin, for a shell
 * file or a page the single-page app routes (which gets index.html). The api, the association file and anything
 * cross-origin always go to the network. */
export function isShellRequest(method: string, url: URL, origin: string, shell: readonly string[]): boolean {
	if (method !== 'GET' || url.origin !== origin) return false;
	if (url.pathname.startsWith('/v1/') || url.pathname.startsWith('/.well-known/')) return false;
	if (shell.includes(url.pathname)) return true;
	return !url.pathname.includes('.'); // a route, not a file
}
