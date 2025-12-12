import * as ts from 'typescript';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import type { CKGNode, CKGEdge, FileAnalysis, ImportInfo, ExportInfo } from '../types/index.js';

/**
 * TypeScriptParser extracts AST information from TypeScript/JavaScript files.
 * Uses the TypeScript Compiler API for accurate parsing.
 */
export class TypeScriptParser {
    private static instance: TypeScriptParser;

    private constructor() { }

    static getInstance(): TypeScriptParser {
        if (!TypeScriptParser.instance) {
            TypeScriptParser.instance = new TypeScriptParser();
        }
        return TypeScriptParser.instance;
    }

    /**
     * Parse a TypeScript/JavaScript file and extract nodes and edges
     */
    async parseFile(filePath: string): Promise<FileAnalysis> {
        const content = await fs.readFile(filePath, 'utf-8');
        const checksum = crypto.createHash('sha256').update(content).digest('hex');

        const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
        const sourceFile = ts.createSourceFile(
            filePath,
            content,
            ts.ScriptTarget.Latest,
            true,
            isTypeScript ? ts.ScriptKind.TS : ts.ScriptKind.JS
        );

        const nodes: CKGNode[] = [];
        const edges: CKGEdge[] = [];
        const imports: ImportInfo[] = [];
        const exports: ExportInfo[] = [];

        // Create file node
        const fileNode: CKGNode = {
            id: this.generateNodeId(filePath, 'file', path.basename(filePath)),
            type: 'file',
            name: path.basename(filePath),
            filePath,
            startLine: 1,
            endLine: content.split('\n').length,
            language: isTypeScript ? 'typescript' : 'javascript',
        };
        nodes.push(fileNode);

        // Visit all nodes in the AST
        this.visitNode(sourceFile, filePath, fileNode.id, nodes, edges, imports, exports, sourceFile);

        return { filePath, nodes, edges, imports, exports, checksum };
    }

    private generateNodeId(filePath: string, type: string, name: string): string {
        const hash = crypto.createHash('md5').update(`${filePath}:${type}:${name}`).digest('hex').slice(0, 8);
        return `${type}_${hash}`;
    }

    private getLineNumber(node: ts.Node, sourceFile: ts.SourceFile): number {
        return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    }

    private getEndLineNumber(node: ts.Node, sourceFile: ts.SourceFile): number {
        return sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    }

    private visitNode(
        node: ts.Node,
        filePath: string,
        fileNodeId: string,
        nodes: CKGNode[],
        edges: CKGEdge[],
        imports: ImportInfo[],
        exports: ExportInfo[],
        sourceFile: ts.SourceFile
    ): void {
        const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
        const language = isTypeScript ? 'typescript' : 'javascript';

        // Handle imports
        if (ts.isImportDeclaration(node)) {
            const moduleSpecifier = node.moduleSpecifier;
            if (ts.isStringLiteral(moduleSpecifier)) {
                const importInfo: ImportInfo = {
                    source: moduleSpecifier.text,
                    specifiers: [],
                    isDefault: false,
                    isNamespace: false,
                    line: this.getLineNumber(node, sourceFile),
                };

                const importClause = node.importClause;
                if (importClause) {
                    if (importClause.name) {
                        importInfo.isDefault = true;
                        importInfo.specifiers.push(importClause.name.text);
                    }
                    if (importClause.namedBindings) {
                        if (ts.isNamespaceImport(importClause.namedBindings)) {
                            importInfo.isNamespace = true;
                            importInfo.specifiers.push(importClause.namedBindings.name.text);
                        } else if (ts.isNamedImports(importClause.namedBindings)) {
                            importClause.namedBindings.elements.forEach((element) => {
                                importInfo.specifiers.push(element.name.text);
                            });
                        }
                    }
                }
                imports.push(importInfo);

                // Create import node
                const importNode: CKGNode = {
                    id: this.generateNodeId(filePath, 'import', moduleSpecifier.text),
                    type: 'import',
                    name: moduleSpecifier.text,
                    filePath,
                    startLine: this.getLineNumber(node, sourceFile),
                    endLine: this.getEndLineNumber(node, sourceFile),
                    language,
                    metadata: { specifiers: importInfo.specifiers },
                };
                nodes.push(importNode);

                // Create edge from file to import
                edges.push({
                    id: uuidv4(),
                    type: 'imports',
                    sourceId: fileNodeId,
                    targetId: importNode.id,
                });
            }
        }

        // Handle exports
        if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
            const line = this.getLineNumber(node, sourceFile);
            if (ts.isExportAssignment(node)) {
                exports.push({ name: 'default', isDefault: true, line });
            }
        }

        // Handle classes
        if (ts.isClassDeclaration(node) && node.name) {
            const className = node.name.text;
            const classNode: CKGNode = {
                id: this.generateNodeId(filePath, 'class', className),
                type: 'class',
                name: className,
                filePath,
                startLine: this.getLineNumber(node, sourceFile),
                endLine: this.getEndLineNumber(node, sourceFile),
                language,
                signature: this.getClassSignature(node),
                docstring: this.getDocstring(node, sourceFile),
            };
            nodes.push(classNode);

            // Create contains edge
            edges.push({
                id: uuidv4(),
                type: 'contains',
                sourceId: fileNodeId,
                targetId: classNode.id,
            });

            // Check for exports
            if (this.hasExportModifier(node)) {
                exports.push({
                    name: className,
                    isDefault: this.hasDefaultModifier(node),
                    line: this.getLineNumber(node, sourceFile),
                });
            }

            // Handle extends
            if (node.heritageClauses) {
                node.heritageClauses.forEach((clause) => {
                    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                        clause.types.forEach((type) => {
                            if (ts.isIdentifier(type.expression)) {
                                edges.push({
                                    id: uuidv4(),
                                    type: 'extends',
                                    sourceId: classNode.id,
                                    targetId: this.generateNodeId(filePath, 'class', type.expression.text),
                                });
                            }
                        });
                    }
                    if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                        clause.types.forEach((type) => {
                            if (ts.isIdentifier(type.expression)) {
                                edges.push({
                                    id: uuidv4(),
                                    type: 'implements',
                                    sourceId: classNode.id,
                                    targetId: this.generateNodeId(filePath, 'interface', type.expression.text),
                                });
                            }
                        });
                    }
                });
            }

            // Parse methods within class
            node.members.forEach((member) => {
                if (ts.isMethodDeclaration(member) && member.name) {
                    const methodName = member.name.getText(sourceFile);
                    const methodNode: CKGNode = {
                        id: this.generateNodeId(filePath, 'method', `${className}.${methodName}`),
                        type: 'method',
                        name: methodName,
                        filePath,
                        startLine: this.getLineNumber(member, sourceFile),
                        endLine: this.getEndLineNumber(member, sourceFile),
                        language,
                        signature: this.getFunctionSignature(member, sourceFile),
                        docstring: this.getDocstring(member, sourceFile),
                        metadata: { className },
                    };
                    nodes.push(methodNode);

                    edges.push({
                        id: uuidv4(),
                        type: 'contains',
                        sourceId: classNode.id,
                        targetId: methodNode.id,
                    });
                }
            });
        }

        // Handle functions
        if (ts.isFunctionDeclaration(node) && node.name) {
            const funcName = node.name.text;
            const funcNode: CKGNode = {
                id: this.generateNodeId(filePath, 'function', funcName),
                type: 'function',
                name: funcName,
                filePath,
                startLine: this.getLineNumber(node, sourceFile),
                endLine: this.getEndLineNumber(node, sourceFile),
                language,
                signature: this.getFunctionSignature(node, sourceFile),
                docstring: this.getDocstring(node, sourceFile),
            };
            nodes.push(funcNode);

            edges.push({
                id: uuidv4(),
                type: 'contains',
                sourceId: fileNodeId,
                targetId: funcNode.id,
            });

            if (this.hasExportModifier(node)) {
                exports.push({
                    name: funcName,
                    isDefault: this.hasDefaultModifier(node),
                    line: this.getLineNumber(node, sourceFile),
                });
            }
        }

        // Handle interfaces
        if (ts.isInterfaceDeclaration(node) && node.name) {
            const interfaceName = node.name.text;
            const interfaceNode: CKGNode = {
                id: this.generateNodeId(filePath, 'interface', interfaceName),
                type: 'interface',
                name: interfaceName,
                filePath,
                startLine: this.getLineNumber(node, sourceFile),
                endLine: this.getEndLineNumber(node, sourceFile),
                language,
                signature: `interface ${interfaceName}`,
                docstring: this.getDocstring(node, sourceFile),
            };
            nodes.push(interfaceNode);

            edges.push({
                id: uuidv4(),
                type: 'contains',
                sourceId: fileNodeId,
                targetId: interfaceNode.id,
            });

            if (this.hasExportModifier(node)) {
                exports.push({
                    name: interfaceName,
                    isDefault: false,
                    line: this.getLineNumber(node, sourceFile),
                });
            }
        }

        // Handle type aliases
        if (ts.isTypeAliasDeclaration(node) && node.name) {
            const typeName = node.name.text;
            const typeNode: CKGNode = {
                id: this.generateNodeId(filePath, 'type', typeName),
                type: 'type',
                name: typeName,
                filePath,
                startLine: this.getLineNumber(node, sourceFile),
                endLine: this.getEndLineNumber(node, sourceFile),
                language,
                signature: `type ${typeName}`,
                docstring: this.getDocstring(node, sourceFile),
            };
            nodes.push(typeNode);

            edges.push({
                id: uuidv4(),
                type: 'contains',
                sourceId: fileNodeId,
                targetId: typeNode.id,
            });

            if (this.hasExportModifier(node)) {
                exports.push({
                    name: typeName,
                    isDefault: false,
                    line: this.getLineNumber(node, sourceFile),
                });
            }
        }

        // Recurse into children
        ts.forEachChild(node, (child) => {
            this.visitNode(child, filePath, fileNodeId, nodes, edges, imports, exports, sourceFile);
        });
    }

    private hasExportModifier(node: ts.Node): boolean {
        const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
        return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    }

    private hasDefaultModifier(node: ts.Node): boolean {
        const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
        return modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
    }

    private getClassSignature(node: ts.ClassDeclaration): string {
        let sig = 'class';
        if (node.name) {
            sig += ` ${node.name.text}`;
        }
        if (node.heritageClauses) {
            node.heritageClauses.forEach((clause) => {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                    sig += ' extends ' + clause.types.map((t) => t.getText()).join(', ');
                }
                if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                    sig += ' implements ' + clause.types.map((t) => t.getText()).join(', ');
                }
            });
        }
        return sig;
    }

    private getFunctionSignature(
        node: ts.FunctionDeclaration | ts.MethodDeclaration,
        sourceFile: ts.SourceFile
    ): string {
        const name = node.name?.getText(sourceFile) ?? 'anonymous';
        const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
        const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
        return `${name}(${params})${returnType}`;
    }

    private getDocstring(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
        const fullText = sourceFile.getFullText();
        const nodeStart = node.getFullStart();

        // Look for JSDoc comment before the node
        const leadingComments = ts.getLeadingCommentRanges(fullText, nodeStart);
        if (leadingComments) {
            for (const comment of leadingComments) {
                const commentText = fullText.slice(comment.pos, comment.end);
                if (commentText.startsWith('/**')) {
                    return commentText
                        .split('\n')
                        .map((line) => line.replace(/^\s*\/?\*+\/?/g, '').trim())
                        .filter((line) => line.length > 0)
                        .join('\n');
                }
            }
        }
        return undefined;
    }
}
