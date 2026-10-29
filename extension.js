const vscode = require('vscode');
const path = require('path');

function isJson(text) {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

function formatJson(text) {
    let output = '';
    let depth = 0;
    let inString = false;
    let escaped = false;
    const indent = () => '  '.repeat(depth);

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inString) {
            output += char;
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === '"') inString = false;
        } else if (char === '"') {
            inString = true;
            output += char;
        } else if (char === '{' || char === '[') {
            output += char;
            depth++;
            let next = i + 1;
            while (next < text.length && /\s/.test(text[next])) next++;
            if (text[next] !== '}' && text[next] !== ']') output += '\n' + indent();
        } else if (char === '}' || char === ']') {
            depth--;
            if (!/[{\[]$/.test(output)) output += '\n' + indent();
            output += char;
        } else if (char === ',') {
            output += ',\n' + indent();
        } else if (char === ':') {
            output += ': ';
        } else if (!/\s/.test(char)) {
            output += char;
        }
    }
    return output + '\n';
}

function lensesFor(document) {
    const lenses = [];
    let response = false;
    let data = [];
    let eventLine = -1;

    function add(line, text) {
        if (isJson(text)) {
            const range = new vscode.Range(line, 0, line, 0);
            lenses.push(new vscode.CodeLens(range, {
                title: 'Open formatted JSON',
                command: 'rlogViewer.openJson',
                arguments: [document.uri, line, text]
            }));
        }
    }

    function finishEvent() {
        if (data.length) add(eventLine, data.join('\n'));
        data = [];
        eventLine = -1;
    }

    for (let line = 0; line < document.lineCount; line++) {
        const text = document.lineAt(line).text;
        if (text === '=== REQUEST BODY ===' || text === '=== LOG METADATA ===') {
            finishEvent();
            response = false;
            if (line + 1 < document.lineCount) add(line + 1, document.lineAt(line + 1).text);
        } else if (text === '=== RESPONSE BODY ===') {
            finishEvent();
            response = true;
            if (line + 1 < document.lineCount) add(line + 1, document.lineAt(line + 1).text);
        } else if (response) {
            if (text === '' || text === '=== PROXY ERROR ===') {
                finishEvent();
                if (text === '=== PROXY ERROR ===') response = false;
            } else {
                if (eventLine < 0) eventLine = line;
                if (text === 'data' || text.startsWith('data:')) {
                    let value = text === 'data' ? '' : text.slice(5);
                    if (value.startsWith(' ')) value = value.slice(1);
                    data.push(value);
                }
            }
        }
    }
    finishEvent();
    return lenses;
}

function activate(context) {
    const contents = new Map();
    let nextId = 0;

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('rlog-json', {
            provideTextDocumentContent(uri) {
                return contents.get(uri.toString());
            }
        }),
        vscode.languages.registerCodeLensProvider({ language: 'rlog', scheme: 'file' }, {
            provideCodeLenses: lensesFor
        }),
        vscode.languages.registerFoldingRangeProvider({ language: 'rlog', scheme: 'file' }, {
            provideFoldingRanges(document) {
                const ranges = [];
                let start = -1;
                for (let line = 0; line < document.lineCount; line++) {
                    if (/^=== [A-Z][A-Z ]* ===$/.test(document.lineAt(line).text)) {
                        if (start >= 0 && line > start + 1) {
                            ranges.push(new vscode.FoldingRange(start, line - 1));
                        }
                        start = line;
                    }
                }
                if (start >= 0 && document.lineCount > start + 1) {
                    ranges.push(new vscode.FoldingRange(start, document.lineCount - 1));
                }
                return ranges;
            }
        }),
        vscode.commands.registerCommand('rlogViewer.openJson', async (source, line, text) => {
            const name = path.basename(source.fsPath, '.rlog');
            const uri = vscode.Uri.from({ scheme: 'rlog-json', path: `/${name}-${line + 1}-${++nextId}.json` });
            contents.set(uri.toString(), formatJson(text));
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document, { preview: false });
            } catch (error) {
                contents.delete(uri.toString());
                throw error;
            }
        }),
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.uri.scheme === 'rlog-json') contents.delete(document.uri.toString());
        })
    );
}

module.exports = { activate };
