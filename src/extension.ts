import * as vscode from "vscode";
const outputChannel = vscode.window.createOutputChannel("Placeholder Helper");
// Получить цвет подсветки из настроек
function getHighlightColor(): string {
    const config = vscode.workspace.getConfiguration("placeholderHelper");
    return config.get<string>("highlightColor", "rgba(255, 255, 255, 0.2)");
}
// Создать стиль подсветки
function createDecoration(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
        backgroundColor: getHighlightColor(),
    });
}
export function activate(context: vscode.ExtensionContext) {


    let decoration = createDecoration();

    const regex = /%(\[\d+\])?([\+#\-0\x20]{0,2}((\d+|\*)?(\.?(\d+|\*|(\[\d+\])\*?)?(\[\d+\])?)?))?[vT%tbcdoqxXUbeEfFgGspw]/g;

    // Функция для обработки подсветки
    function updateDecorations(editor: vscode.TextEditor | undefined) {
        if (!editor) {
            return;
        }

        const position = editor.selection.active;
        const lineText = editor.document.getText(new vscode.Range(position.line, 0, position.line + 10, 0));

        // Найти все шаблоны на текущей строке
        const matches: RegExpExecArray[] = [];
        let match;
        while ((match = regex.exec(lineText)) !== null) {
            matches.push(match);
        }

        if (matches.length === 0) {
            editor.setDecorations(decoration, []); // Очистить подсветку
            return;
        }

        let minDistance = Infinity;
        // Определить ближайший шаблон к курсору
        let closestMatch: RegExpExecArray | null = null;
        for (const match of matches) {
            const distance = Math.abs(match.index! + match[0].length / 2 - position.character);
            if (distance < minDistance) {
                minDistance = distance;
                closestMatch = match;
            }
        }
        if (minDistance < 3) {
            if (closestMatch) {

                const index = matches.indexOf(closestMatch) + 1;
                const params_string = lineText.substring(closestMatch.index! - closestMatch[0].length, lineText.length);
                let params = [];
                let in_string = true;
                let sc_count = 1;
                let param = "";
                let posCh = closestMatch.index! - 1;
                let posLn = position.line;
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
                        params.push(new Placeholder(
                            new vscode.Position(posLn, Math.abs(posCh - param.trim().length)), param.trim()));
                        param = "";
                    }
                    if (char === ")" && !in_string) {
                        sc_count -= 1;
                    }
                    posCh += 1;
                    if (char === "\n") {
                        posLn += 1;
                        posCh = 1;
                    }
                }

                let p = params[index];
                outputChannel.appendLine(p.param);
                outputChannel.appendLine((p.range.start.line + 1) + ":" + (p.range.start.character + 10) + " - " + (p.range.end.line + 1) + ":" + (p.range.end.character + 10));
                editor.setDecorations(decoration, [p.range]);

            }

        } else {
            editor.setDecorations(decoration, []); // Очистить подсветку
        }
    }

    // Подписаться на изменение положения курсора
    const cursorChangeDisposable = vscode.window.onDidChangeTextEditorSelection((event) => {
        updateDecorations(event.textEditor);
    });

    // Обработать активный редактор при активации
    if (vscode.window.activeTextEditor) {
        updateDecorations(vscode.window.activeTextEditor);
    }

    // Подписаться на смену активного редактора
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
        updateDecorations(editor);
    });

    context.subscriptions.push(cursorChangeDisposable, editorChangeDisposable);
}

class Placeholder {
    public range: vscode.Range;
    constructor(public pos: vscode.Position, public param: string) {
        this.range = new vscode.Range(pos,
            new vscode.Position(pos.line, pos.character + param.length - 1)
        );
    }
}
export function deactivate() { }
