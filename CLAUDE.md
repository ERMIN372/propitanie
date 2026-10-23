# Пропитание

Личный планировщик питания на двоих: онбординг с нормой, план на неделю, список покупок, сессии готовки впрок.
Хостинг GitHub Pages, данные в приватном репо `ERMIN372/propitanie_bd` через GitHub REST API. Бэкенда нет.

## Стек
Vite 8, React 19, TypeScript 6.0 (strict; TS 7 не поддерживается typescript-eslint), react-router 8 (`HashRouter`),
Zustand, CSS Modules + CSS-переменные, шрифты `@fontsource-variable/*`, Vitest, ESLint (flat config).
Позже: Dexie, zod, framer-motion (только свайпы и "отклеивание" скотча), vite-plugin-pwa 1.x.

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
src/features   экраны: plan, shopping, prep, recipes, profile (+ connect, onboarding позже)
src/lib        чистая логика с тестами: week.ts (+ nutrition, planner, shopping, prep позже)
src/stores     Zustand
src/sync       (этап 2) github.ts, base64.ts, db.ts, outbox.ts, merge.ts, poller.ts
src/schemas    (этап 2) zod-схемы и миграции
src/data       ingredients.json, recipes.json (публичные базовые данные)
```
Деплой: `.github/workflows/deploy.yml`, push в `main` → validate:data, typecheck, lint, test, build → Pages.
Vite `base: '/propitanie/'`. CSP добавляется meta-тегом только в прод-сборке (плагин в `vite.config.ts`).

## Схема данных (propitanie_bd)
Каждый файл: `schemaVersion`, `updatedAt`, zod-схема, функция миграции.
```
meta.json                          { schemaVersion, createdAt }
profiles.json                      { schemaVersion, updatedAt, profiles: { id, name, colorKey, createdAt }[] }
users/{pid}/profile.json           параметры, kcalAdjust, лайки/дизлайки, исключения, история веса, mealsPerDay, kitchen
users/{pid}/plans/{YYYY-Www}.json  slots: Record<"day:meal", { recipeId|null, portions, manual, updatedAt }>
users/{pid}/prep/{YYYY-Www}.json   cookDays, forProfiles, doneSteps
shared/shopping/{YYYY-Www}.json    items: Record<id, { name, amount, unit, category, staple, usedIn, checked, manual, removed, updatedAt }>
recipes/custom/{id}.json           Recipe
ingredients/custom/{id}.json       Ingredient
```
Мёрдж при 409: планы и покупки по слотам/позициям (свежий updatedAt), prep объединением doneSteps, профиль целиком.
Схема пока согласована на уровне плана, изменения схемы согласовывать с владельцем.

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
- [ ] Этап 2: слой данных
- [ ] Этапы 3–8
