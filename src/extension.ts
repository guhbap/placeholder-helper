import * as vscode from "vscode";
const outputChannel = vscode.window.createOutputChannel("Placeholder Helper");

const decoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 165, 0, 0.3)', // Цвет подсветки (оранжевый с прозрачностью)
});
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        "extension.analyzePlaceholders",
        () => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                vscode.window.showErrorMessage("No active editor found.");
                return;
            }

            const document = editor.document;
            const position = editor.selection.active;
            const lineText = document.lineAt(position.line).text;

            // Регулярное выражение для поиска шаблона
            const regex =
                /%(\[\d+\])?([\+#\-0\x20]{,2}((\d+|\*)?(\.?(\d+|\*|(\[\d+\])\*?)?(\[\d+\])?)?))?[vT%tbcdoqxXUbeEfFgGspw]/g;
            // Найти начало и конец выражения вокруг курсора
            let match: RegExpExecArray | null;
            let n_match: RegExpExecArray | null = null;
            let min_space = 1000000000000000; // минимально расстояние от курсора до любой границы
            let matches: RegExpExecArray[] = [];
            while ((match = regex.exec(lineText)) !== null) {
                matches.push(match);
                let space = match.index! - position.character;
                if (space < min_space) {
                    min_space = space;
                    n_match = match;
                }
                space = position.character - match.index! - match[0].length;
                if (space > min_space) {
                    min_space = space;
                    n_match = match;
                }
            }

            if (n_match) {

                const index = matches.indexOf(n_match) + 1;
                const params_string = lineText.substring(n_match.index! - n_match[0].length, lineText.length);
                let params = [];
                let in_string = true;
                let sc_count = 1;
                let param = "";
                for (let i = 0; i < params_string.length; i++) {
                    const char = params_string[i];
                    param += char;
                    if (char === '"' || char === "`") {
                        in_string = !in_string;

                    }
                    if (char === "(" && !in_string) {
                        sc_count += 1;

                    }
                    if (char === "," || char === ")" && !in_string && sc_count === 1) {
                        params.push(new Placeholder(i + n_match.index! - param.length, param.trim()));
                        param = "";
                    }
                    if (char === ")" && !in_string) {
                        sc_count -= 1;
                    }
                }

                let p = params[index];
                const range = new vscode.Range(
                    new vscode.Position(position.line, p.index!),
                    new vscode.Position(position.line, p.index! + p.param.length - 1)
                );
                editor.setDecorations(decoration, [range]);

            }
        }
    );

    context.subscriptions.push(disposable);
}

class Placeholder {
    constructor(public index: number, public param: string) { }
}
