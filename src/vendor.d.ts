// The extension host is Node, which has WebAssembly at runtime but no DOM typings here.
declare namespace WebAssembly {
	interface Module {}
}
declare const WebAssembly: {
	compile(bytes: Uint8Array): Promise<WebAssembly.Module>;
};
