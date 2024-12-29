import * as vscode from "vscode";

info("Extension 'placeholder-helper' is now active!");
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
function info(text: string) {
    console.log("------------" + text);
}

export function activate(context: vscode.ExtensionContext) {
    let decoration = createDecoration();

    const regex = /(?<!%)%(\[\d+\])?([\+#\-0\x20]{0,2}((\d+|\*)?(\.?(\d+|\*|(\[\d+\])\*?)?(\[\d+\])?)?))?[vTtbcdoqxXUbeEfFgGspw]/g;

    // Функция для обработки подсветки
    function updateDecorations(editor: vscode.TextEditor | undefined) {
        if (!editor) {
            return;
        }


        const position = editor.selection.active;
        const document = editor.document;

        // {{{

        const stringRanges = findStringLiterals(document, position);
        if (stringRanges === null || stringRanges.length === 0) {
            editor.setDecorations(decoration, []);
            return;
        }

        // }}}
        //строка, в которой возможно есть плейсхолдеры
        let edited = false;
        for (const range of stringRanges) {
            let lineText = document.getText(range);
            console.log(lineText);
            // const lineText = editor.document.getText(stringRanges);
            // outputChannel.appendLine(lineText);
            // outputChannel.appendLine("");

            // Найти все шаблоны на текущей строке
            const matches: RegExpExecArray[] = [];
            let match;
            while ((match = regex.exec(lineText)) !== null) {
                matches.push(match);
                info(match[0].toString());
                let matchRange = new vscode.Range(
                    document.positionAt(document.offsetAt(range.start) + match.index!),
                    document.positionAt(document.offsetAt(range.start) + match.index! + match[0].length)
                );
                info("matchRange of " + match[0] + ": " + matchRange.start.line + ":" + matchRange.start.character + " - " + matchRange.end.line + ":" + matchRange.end.character);
                if (document.offsetAt(position) >= document.offsetAt(matchRange.start) && document.offsetAt(position) <= document.offsetAt(matchRange.end)) {
                    // break;
                    info("closestMatch: " + match[0].toString());

                    const index = matches.indexOf(match) + 1;
                    info("closestMatch index: " + index);
                    const docLen = document.getText().length;
                    // const params_string = lineText.substring(closestMatch.index!, lineText.length);
                    // outputChannel.appendLine("params_string: " + params_string);
                    // const params_string = document.getText(new vscode.Range(range.end, document.lineAt(document.lineCount - 1).range.end));
                    // outputChannel.appendLine("params_string: " + params_string);
                    let params = [];
                    let in_string = false;
                    let lastDelimiter = "";
                    let sc_count = 1;
                    let param = "";

                    let currentPos = range.end;
                    let delta = 1;

                    // logCharactersAndHex(document, range);

                    for (let i = 1; true; i += 0) { // бесконечный цикл, выходик когда получаем ошибку либо закрытие скобки
                        const currentOffset = document.offsetAt(currentPos);

                        // Проверяем, что мы не вышли за пределы текста документа
                        if (currentOffset >= docLen) {
                            info("Reached end of document");
                            break;
                        }

                        // Получаем символ в текущей позиции
                        let char = document.getText(
                            new vscode.Range(
                                currentPos,
                                document.positionAt(currentOffset + delta)
                            )
                        );

                        const nextPos = document.positionAt(currentOffset + delta);

                        // Если следующая позиция совпадает с текущей позицией - берем так же и следующий символ
                        if (nextPos.isEqual(currentPos)) {
                            delta += 1;
                            info("nextPos is equal to currentPos");
                            continue;
                        } else {
                            currentPos = nextPos;
                            delta = 1;
                        }
                        if (char.length === 0) {
                            info("char.length === 0");
                            continue;
                        }

                        info("char: " + char);
                        param += char;
                        char = char.trim();
                        if (char === '"' || char === "`") {
                            if (in_string) {
                                if (char === lastDelimiter) {
                                    in_string = false;
                                }
                            } else{
                                lastDelimiter = char;
                                in_string = !in_string;
                            }
                        }
                        if (char === "(" && !in_string) {
                            sc_count += 1;
                        }
                        if ((char === "," || char === ")") && !in_string && sc_count === 1) {
                            param = param.substring(0, param.length - 1);
                            params.push(new Placeholder(
                                document.positionAt(document.offsetAt(currentPos) - param.length - 1),
                                param, document
                            ));
                            info("param: " + param);
                            param = "";
                        }
                        if (char === ")" && !in_string) {
                            sc_count -= 1;
                        }
                        if (sc_count === 0) {
                            info("sc_count === 0");
                            break;
                        }
                    }

                    info("params.length: " + params.length);
                    for (let i = 1; i < params.length; i++) {
                        info(params[i].param);
                        info(rangeToString(params[i].range));
                    }
                    info("----------------------");

                    let p = params[index];
                    info(p.param);
                    info((p.range.start.line + 1) + ":" + (p.range.start.character + 1) + " - " + (p.range.end.line + 1) + ":" + (p.range.end.character + 1));
                    edited = true;
                    editor.setDecorations(decoration,
                        [
                            p.range,
                            matchRange
                        ]);

                }
            }
            // } else {
            //     editor.setDecorations(decoration, []); // Очистить подсветку
            // }
        }
        if (!edited) {
            info("no edit");
            editor.setDecorations(decoration, []);
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
    constructor(public pos: vscode.Position, public param: string, public document: vscode.TextDocument) {

        // считаем количество пробельных символов(\t, \n, \r, " ") в params
        let posChLeft = 0;
        for (let i = 0; i < this.param.length; i++) {
            if (this.param[i] === " " || this.param[i] === "\t" || this.param[i] === "\n" || this.param[i] === "\r") {
                posChLeft += 1;
            } else {
                break;
            }
        }
        let posChRight = 0;
        for (let i = this.param.length - 1; i >= 0; i--) {
            if (this.param[i] === " " || this.param[i] === "\t" || this.param[i] === "\n" || this.param[i] === "\r") {
                posChRight += 1;
            } else {
                break;
            }
        }

        this.range = new vscode.Range(
            document.positionAt(document.offsetAt(pos) + posChLeft),
            document.positionAt(document.offsetAt(pos) + param.length - posChRight),
        );
    }
}
export function deactivate() { }

function positionToString(position: vscode.Position) {
    return position.line + ":" + position.character;
}
function rangeToString(range: vscode.Range) {
    return positionToString(range.start) + " - " + positionToString(range.end);
}

function findStringLiterals(document: vscode.TextDocument, position: vscode.Position): vscode.Range[] {
    const text = document.getText(); // Получаем весь текст документа
    const startDelimiters = ['"', '`']; // Поддерживаемые кавычки
    const ranges: vscode.Range[] = [];
    let insideString = false;
    let start = -1;
    let delimiter = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // Если уже внутри строки
        if (insideString) {
            if (char === delimiter) {
                // Проверяем, что это не экранированная кавычка
                if (i > 0 && text[i - 1] === '\\') {
                    continue;
                }
                // Заканчиваем диапазон строки
                ranges.push(new vscode.Range(document.positionAt(start), document.positionAt(i + 1)));
                insideString = false;
                delimiter = '';
            }
        } else {
            // Если не внутри строки, ищем начало строки
            if (startDelimiters.includes(char)) {
                // Проверяем, что это не экранированная кавычка
                if (i > 0 && text[i - 1] === '\\') {
                    continue;
                }
                insideString = true;
                delimiter = char;
                start = i;
            }
        }
    }

    // Возвращаем только диапазоны, которые включают заданную позицию
    return ranges.filter(range => range.contains(position));
}