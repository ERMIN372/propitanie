import { useState } from 'react';
import { Screen } from '../../ui/Screen';
import { Chip } from '../../ui/Chip';
import { DishCard } from '../../ui/DishCard';
import { EmptyState } from '../../ui/EmptyState';
import { IconSearch } from '../../ui/icons';
import { useToast } from '../../ui/Toast';
import s from './RecipesScreen.module.css';

const MEALS = [
  { key: 'all', label: 'Все' },
  { key: 'breakfast', label: 'Завтраки' },
  { key: 'lunch', label: 'Обеды' },
  { key: 'dinner', label: 'Ужины' },
  { key: 'snack', label: 'Перекусы' },
] as const;

// Превью дизайна карточки. Настоящая база рецептов появится на этапе 4.
const PREVIEW = [
  { id: 'preview-plov', title: 'Плов с курицей', emoji: '🍛', kcal: 540, protein: 34, fat: 16, carbs: 62, meal: 'lunch', meta: 'Хранится 3 дня' },
  { id: 'preview-syrniki', title: 'Сырники', emoji: '🥞', kcal: 410, protein: 26, fat: 14, carbs: 44, meal: 'breakfast', meta: 'Можно заморозить' },
  { id: 'preview-bowl', title: 'Гречка с индейкой', emoji: '🥘', kcal: 480, protein: 38, fat: 12, carbs: 52, meal: 'dinner', meta: 'Хранится 3 дня' },
];

export function RecipesScreen() {
  const [q, setQ] = useState('');
  const [meal, setMeal] = useState<(typeof MEALS)[number]['key']>('all');
  const toast = useToast();
  const list = PREVIEW.filter(
    (r) => (meal === 'all' || r.meal === meal) && r.title.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <Screen title="Рецепты">
      <label className={s.search}>
        <IconSearch />
        <span className="visually-hidden">Поиск рецепта</span>
        <input type="search" placeholder="Найди блюдо" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className={s.chips} role="group" aria-label="Приём пищи">
        {MEALS.map((m) => (
          <Chip key={m.key} selected={meal === m.key} onClick={() => setMeal(m.key)}>
            {m.label}
          </Chip>
        ))}
      </div>
      <p className={s.note}>Пока тут три карточки для примера. Базу из 60 рецептов добавлю на этапе 4.</p>
      {list.length === 0 ? (
        <EmptyState emoji="🔍" title="Ничего не нашлось" text="Попробуй другое слово или сбрось фильтр." />
      ) : (
        list.map((r) => <DishCard key={r.id} {...r} onClick={() => toast('Карточка рецепта появится на этапе 4')} />)
      )}
    </Screen>
  );
}
