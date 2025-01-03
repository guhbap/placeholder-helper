# Formatted String Helper for VS Code

![Extension Logo](https://i.postimg.cc/63pBqTdf/logo.png)

## Описание

Работа с форматированными строками в golang может быть трудной задачей, особенно при использовании плейсхолдеров вроде `%v`, `%d`, `%10d`, и других. Это расширение для Visual Studio Code позволяет подсвечивать переменные, соответствующие плейсхолдерам, упрощая анализ и отладку кода.

## Ключевые возможности

- Подсвечивает переменные, соответствующие выбранному плейсхолдеру.
- Автоматическая активация при открытии файла с форматированными строками.
- Простота в использовании, без сложных настроек.

## Установка

### Через Visual Studio Code Marketplace

1. Откройте Visual Studio Code.
2. Перейдите в меню **Extensions** (или нажмите `Ctrl+Shift+X`).
3. Найдите расширение **"Placeholder Helper"**.
4. Нажмите **Install**.

## Как использовать

1. Откройте файл с кодом, содержащим форматированные строки.
2. Установите курсор на плейсхолдер (например, `%v` в Go).
3. Расширение автоматически подсветит соответствующую переменную.

Пример работы:

![Demo](https://github.com/guhbap/placeholder-helper/blob/master/img/demo.gif?raw=true)

## Пример кода

```go
package main

import (
	"fmt"
	"log"
)

func main() {
	name := "John"
	age := 30
	err := fmt.Errorf("unknown error")

	log.Printf("User: %s, Age: %d, Error: %v", name, age, err)

    fmt.Printf(
        "Hello, %s! You are %d years old.\n",
        name,
        age,
    )

}
```
