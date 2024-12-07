import * as vscode from "vscode";

// Получить цвет подсветки из настроек
function getHighlightColor(): string {
    const config = vscode.workspace.getConfiguration("placeholderHelper");
    return config.get<string>("highlightColor", "rgba(255, 255, 255, 0.15)");
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
        const lineText = editor.document.lineAt(position.line).text;

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
                        params.push(new Placeholder(i + closestMatch.index! - param.length, param.trim()));
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
    constructor(public index: number, public param: string) { }
}
export function deactivate() { }
