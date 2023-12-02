/** @type { (f: () => Generator<string>) => string } */
export function mergeLines(f) {
	return [...f(), ''].join('\n');
}
