import type { TSESTree } from "@typescript-eslint/types";
import type { AST, SourceCode } from "eslint";
import type estree from "estree";

export type ImportModuleDeclaration = estree.ImportDeclaration &
	Partial<Pick<TSESTree.ImportDeclaration, "importKind">>;

// prettier-ignore
export type ExportModuleDeclaration = estree.ExportAllDeclaration & Partial<Pick<estree.ExportNamedDeclaration, "specifiers"> & Pick<TSESTree.ExportAllDeclaration, "exportKind">>;

export type ModuleDeclaration = ImportModuleDeclaration | ExportModuleDeclaration;

export type ImportSpecifier = estree.ImportSpecifier & Partial<Pick<TSESTree.ImportSpecifier, "importKind">>;
export type ExportSpecifier = estree.ExportSpecifier & Partial<Pick<TSESTree.ExportSpecifier, "exportKind">>;

export function importModules(source: SourceCode): ImportModuleDeclaration[] {
	return source.ast.body.filter((node): node is ImportModuleDeclaration => node.type === "ImportDeclaration");
}

export function exportModules(source: SourceCode): ExportModuleDeclaration[] {
	return source.ast.body.filter(
		(node): node is ExportModuleDeclaration =>
			(node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") && Boolean(node.source),
	);
}

export function isTypeImportOrExport(node: ModuleDeclaration | ImportSpecifier | ExportSpecifier): boolean {
	return ("importKind" in node && node.importKind === "type") || ("exportKind" in node && node.exportKind === "type");
}

export function extrema<T extends estree.Node>(source: readonly T[]): [T, T] {
	const [ a, b, ] = [ source.at(0), source.at(-1), ];

	if (!a || !b) {
		throw new Error(`extrema: invalid input`);
	}

	return [ a, b, ];
}

export function linesBetween(a: estree.Node | undefined, b: estree.Node | undefined): number {
	if (!a?.loc || !b?.loc) {
		throw new Error(`error: AST was generated without node location information`);
	}

	return b.loc.start.line - a.loc.end.line - 1;
}

export function isComment(value: AST.Token | estree.Comment | estree.Node): value is estree.Comment {
	return value.type === "Block" || value.type === "Line";
}

export function assertLoc(value: { loc?: AST.SourceLocation | null | undefined; } | undefined): AST.SourceLocation {
	if (value?.loc) {
		return value.loc;
	}

	throw new Error(`error: AST was generated without node location information`);
}

export function assertRange(value: { range?: AST.Range | null | undefined; } | undefined): AST.Range {
	if (value?.range) {
		return value.range;
	}

	throw new Error();
}
