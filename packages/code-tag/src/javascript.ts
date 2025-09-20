export declare namespace JavaScriptSerializable {
	export type Primitive = string | number | boolean | bigint | null | undefined;
	export type Object = { readonly [key in string]: JavaScriptSerializable };
	export type Array = readonly JavaScriptSerializable[];
}

export type JavaScriptSerializable = JavaScriptSerializable.Primitive | JavaScriptSerializable.Object | JavaScriptSerializable.Array;
