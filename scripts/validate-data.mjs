// Валидатор базовых данных. Полные проверки появятся на этапе 4 вместе с рецептами.
import { readFileSync, existsSync } from 'node:fs';

const files = ['src/data/ingredients.json', 'src/data/recipes.json'];
let ok = true;
for (const f of files) {
  if (!existsSync(f)) continue;
  try {
    const data = JSON.parse(readFileSync(f, 'utf8'));
    const ids = data.map((x) => x.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) { ok = false; console.error(`${f}: дубли id: ${dup.join(', ')}`); }
  } catch (e) {
    ok = false;
    console.error(`${f}: не читается как JSON: ${e.message}`);
  }
}
console.log(ok ? 'validate:data: ок' : 'validate:data: есть ошибки');
process.exit(ok ? 0 : 1);
