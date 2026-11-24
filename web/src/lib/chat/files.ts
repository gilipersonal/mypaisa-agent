/** A file chosen in the composer, described as the boards draw it ("PDF · 486 KB"). The pages a statement has are read
 * by the agent once the file is kept (MA-148, MA-352), not counted here. */
import type { FileRef } from './timeline.ts';

export function sizeOf(bytes: number): string {
	if (bytes < 1024) return `${String(bytes)} bytes`;
	if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function kindOf(file: Pick<File, 'name' | 'type'>): string {
	if (file.type === 'application/pdf') return 'PDF';
	if (file.type.startsWith('image/')) return 'Image';
	const ext = /\.([a-z0-9]{1,5})$/i.exec(file.name)?.[1];
	return ext ? ext.toUpperCase() : 'File';
}

export function describeFile(file: Pick<File, 'name' | 'type' | 'size'>): FileRef {
	return { name: file.name, meta: `${kindOf(file)} · ${sizeOf(file.size)}` };
}
