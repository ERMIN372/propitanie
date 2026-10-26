# Пропитание

Личный планировщик питания для двух человек, у каждого всё своё: онбординг с нормой, план на неделю, список покупок,
сессии готовки впрок. Общая только база рецептов (базовые + свои из recipes/custom). Чужие данные можно смотреть, менять нельзя.
Хостинг GitHub Pages, данные в приватном репо `ERMIN372/propitanie_bd` через GitHub REST API. Бэкенда нет.

## Стек
Vite 8, React 19, TypeScript 6.0 (strict; TS 7 не поддерживается typescript-eslint), react-router 8 (`HashRouter`),
Zustand, Dexie (IndexedDB), zod 4, nanoid, CSS Modules + CSS-переменные, шрифты `@fontsource-variable/*`,
Vitest + fake-indexeddb, ESLint (flat config).
Позже: framer-motion (только свайпы и "отклеивание" скотча), vite-plugin-pwa 1.x.

## Команды
```
npm run dev            # дев-сервер
npm run typecheck      # tsc --noEmit
npm run lint
npm test               # vitest run
npm run validate:data  # проверка src/data/*.json
npm run build
```
Перед коммитом этапа: `npm run typecheck && npm run lint && npm test && npm run build`.

## Архитектура
```
src/styles     tokens.css (дизайн-токены, темы Эмаль/Чугун), global.css
src/ui         примитивы: Tape, Bowl, Button, Chip, Card, DishCard, MacroBars, Screen, TabBar, Toast, EmptyState
src/features   экраны: connect (токен, выбор/создание профиля), shell (TopBar), plan, shopping, prep, recipes, profile
src/lib        чистая логика с тестами: week.ts (+ nutrition, planner, shopping, prep позже)
src/stores     Zustand: session (токен/ветка/профиль в localStorage), sync (статус), theme
src/schemas    zod-схемы всех файлов propitanie_bd + migrateVersion
src/sync       github.ts   клиент REST API, ошибки по кодам (тексты без токена)
               base64.ts   UTF-8 base64 через TextEncoder/TextDecoder
               db.ts       Dexie: docs (кэш файлов), outbox (очередь), kv
               paths.ts    путь → тип, схема, дефолт, мёрдж
               merge.ts    стратегии мёрджа при 409
               engine.ts   SyncEngine: debounce 2 с, отправка по одной, до 3 попыток при 409, pull по дереву
               runtime.ts  живой движок: старт, раз в 60 с, при возврате на вкладку и при online
               docs.ts     writeDoc/putDoc/deleteDoc/useDoc для UI, запрет записи в чужие users/{pid}
src/test       fakeGithub.ts: GitHub API в памяти для тестов
src/data       ingredients.json, recipes.json (публичные базовые данные)
```
Деплой: `.github/workflows/deploy.yml`, push в `main` → validate:data, typecheck, lint, test, build → Pages.
Vite `base: '/propitanie/'`. CSP добавляется meta-тегом только в прод-сборке (плагин в `vite.config.ts`).
Шрифты не инлайнятся в data: (`assetsInlineLimit`), иначе их блокирует `font-src 'self'`.

## Схема данных (propitanie_bd)
Каждый файл: `schemaVersion`, `updatedAt`, zod-схема, функция миграции.
```
meta.json                          { schemaVersion, createdAt }
profiles.json                      { schemaVersion, updatedAt, profiles: { id, name, colorKey, createdAt }[] }
users/{pid}/profile.json           параметры, kcalAdjust, лайки/дизлайки, исключения, история веса, mealsPerDay, kitchen
users/{pid}/plans/{YYYY-Www}.json  slots: Record<"day:meal", { recipeId|null, portions, manual, updatedAt }>
users/{pid}/prep/{YYYY-Www}.json   cookDays, doneSteps (только блюда из своего плана)
users/{pid}/shopping/{YYYY-Www}.json items: Record<id, { name, amount, unit, category, staple, usedIn, checked, manual, removed, updatedAt }>
recipes/custom/{id}.json           Recipe
ingredients/custom/{id}.json       Ingredient
```
Мёрдж при 409: планы и покупки по слотам/позициям (свежий updatedAt), prep объединением doneSteps, профиль целиком,
profiles.json объединением по id. При равном updatedAt побеждает удалённая версия.
Схема согласована с владельцем, изменения схемы согласовывать.

## Синхронизация
- UI читает только из IndexedDB (`useDoc`). Запись: `writeDoc` → локально + outbox → PUT через 2 с.
- Чтение: один `GET /git/trees/{branch}?recursive=1` с `If-None-Match`; скачиваются только файлы с новым sha.
  Сразу читаются профили, свои рецепты/ингредиенты и недели текущая ±1; остальные недели по запросу (`fetchOne`).
- Чистая локальная копия тоже мёрджится с пришедшей: защита от устаревшего ответа сразу после записи.
- Свой рецепт/ингредиент удаляется локально, только если его нет в двух деревьях подряд.
- Файл, не прошедший zod, в кэш не попадает, статус синка "Ошибка" с путём файла.
- Коммит: `{имя профиля}: {создать|обновить|удалить} {путь}`.
- Пустой репо: дерево отвечает 409 → "Создай README в propitanie_bd и попробуй снова".

## Дизайн "Эмаль и скотч"
Токены в `src/styles/tokens.css`. Фирменная деталь одна: скотч (`ui/Tape`). Объём: кант + блик (`--glint`), без серых теней.
Радиусы: экраны 28, карточки 18, кнопки 14, чипсы круглые. Зоны нажатия от 44 px.
Запрещено: капслок, моноширинный шрифт в подписях, разделители "A · B · C", стрелки в кнопках, декоративные градиенты.
Тексты на "ты", кнопка называет действие.

## Безопасность
- Токены никогда не попадают в код, коммиты, логи, URL, тексты ошибок.
- Никаких личных данных в этом репо, в тестах только фейковые.
- Без `dangerouslySetInnerHTML` (запрещено правилом ESLint), без CDN и сторонних скриптов.
- Всё из propitanie_bd проходит zod-валидацию. `.env*` в `.gitignore`.

## Готово, когда
typecheck, lint, test, build, validate:data зелёные; деплой в Actions зелёный; вёрстка проверена на 360/390/430 px в обеих темах;
тесты на base64 с кириллицей, норму, планер, список покупок, распределение готовки, мёрдж при 409.

## Статус
- [x] Этап 1: каркас, дизайн-система, навигация, деплой (экраны с заглушками)
- [x] Этап 2: слой данных, экран подключения, индикатор синка, переключатель профиля, выход, экспорт
- [ ] Этапы 3–8
