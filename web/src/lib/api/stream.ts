/** Reads the stream of ARCHITECTURE §19.5, shared by both doors (MA-198). Each door brings its own transport, since
 * React Native's fetch has no streaming body; both feed text chunks to this one parser. */
export interface StreamFrame {
	id: number | undefined;
	event: string;
	data: unknown;
}

function frameFrom(block: string): StreamFrame | undefined {
	let event = 'message';
	let id: number | undefined;
	const data: string[] = [];
	for (const line of block.split('\n')) {
		if (line.startsWith('event: ')) event = line.slice(7);
		else if (line.startsWith('id: ')) id = Number(line.slice(4));
		else if (line.startsWith('data: ')) data.push(line.slice(6));
	}
	if (data.length === 0) return undefined; // a heartbeat, a retry: nothing for a door to read
	return { id, event, data: JSON.parse(data.join('\n')) as unknown };
}

/** Returns a function to feed chunks to. A frame may arrive split across chunks, or several in one chunk. */
export function createSseParser(onFrame: (frame: StreamFrame) => void): (chunk: string) => void {
	let buffer = '';
	return (chunk) => {
		buffer += chunk.replaceAll('\r\n', '\n');
		let end = buffer.indexOf('\n\n');
		while (end !== -1) {
			const frame = frameFrom(buffer.slice(0, end));
			buffer = buffer.slice(end + 2);
			if (frame) onFrame(frame);
			end = buffer.indexOf('\n\n');
		}
	};
}
