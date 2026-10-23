import { z } from 'zod';
import { colorKey, exclusionKey, isoTime, mealType, weekId } from './common';

const versioned = { schemaVersion: z.literal(1), updatedAt: isoTime };

export const metaSchema = z.object({ schemaVersion: z.literal(1), createdAt: isoTime });
export type MetaDoc = z.infer<typeof metaSchema>;

export const profileRef = z.object({ id: z.string().min(1), name: z.string().min(1).max(40), colorKey, createdAt: isoTime });
export type ProfileRef = z.infer<typeof profileRef>;

export const profilesSchema = z.object({ ...versioned, profiles: z.array(profileRef) });
export type ProfilesDoc = z.infer<typeof profilesSchema>;

export const profileSchema = z.object({
  ...versioned,
  id: z.string().min(1),
  onboardingDone: z.boolean(),
  sex: z.enum(['male', 'female']).nullable(),
  age: z.number().int().min(10).max(110).nullable(),
  heightCm: z.number().min(100).max(250).nullable(),
  weightHistory: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kg: z.number().min(25).max(350) })),
  activity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  goal: z.enum(['lose', 'maintain', 'gain']),
  kcalAdjust: z.number().int().min(-1500).max(1500),
  likes: z.array(z.string()),
  dislikes: z.array(z.string()),
  exclusions: z.object({ preset: z.array(exclusionKey), custom: z.array(z.string().max(40)) }),
  mealsPerDay: z.union([z.literal(3), z.literal(4)]),
  kitchen: z.object({ burners: z.number().int().min(1).max(8), ovens: z.number().int().min(0).max(3) }),
});
export type ProfileDoc = z.infer<typeof profileSchema>;

/** Ключ слота: "день:приём", день ISO 1..7 (Пн = 1). */
export const slotKey = z.string().regex(/^[1-7]:(breakfast|lunch|dinner|snack)$/);
export const planSlot = z.object({
  recipeId: z.string().nullable(),
  portions: z.number().min(0.5).max(2.5),
  manual: z.boolean(),
  updatedAt: isoTime,
});
export type PlanSlot = z.infer<typeof planSlot>;

export const planSchema = z.object({
  ...versioned,
  week: weekId,
  seed: z.number().int(),
  mealsPerDay: z.union([z.literal(3), z.literal(4)]),
  slots: z.record(slotKey, planSlot),
});
export type PlanDoc = z.infer<typeof planSchema>;

export const prepSchema = z.object({
  ...versioned,
  week: weekId,
  cookDays: z.array(z.number().int().min(1).max(7)),
  forProfiles: z.array(z.string()),
  doneSteps: z.record(z.string(), isoTime),
});
export type PrepDoc = z.infer<typeof prepSchema>;

export const unit = z.enum(['g', 'ml', 'pcs']);

export const shoppingItem = z.object({
  name: z.string().min(1).max(80),
  ingredientId: z.string().nullable(),
  amount: z.number().min(0),
  unit,
  category: z.string(),
  staple: z.boolean(),
  usedIn: z.array(z.object({ recipeId: z.string(), title: z.string(), amount: z.number() })),
  checked: z.boolean(),
  manual: z.boolean(),
  removed: z.boolean(),
  updatedAt: isoTime,
});
export type ShoppingItem = z.infer<typeof shoppingItem>;

export const shoppingSchema = z.object({
  ...versioned,
  week: weekId,
  sourceProfiles: z.array(z.string()),
  items: z.record(z.string(), shoppingItem),
});
export type ShoppingDoc = z.infer<typeof shoppingSchema>;

export const ingredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  category: z.string().min(1),
  kcal: z.number().min(0).max(900),
  protein: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
  carbs: z.number().min(0).max(100),
  per: z.enum(['g100', 'ml100']),
  gramsPerPiece: z.number().positive().optional(),
  staple: z.boolean().optional(),
  excl: z.array(exclusionKey).optional(),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

export const recipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60),
  emoji: z.string().min(1).max(16),
  mealTypes: z.array(mealType).min(1),
  tags: z.array(z.string()),
  servings: z.number().int().min(1).max(20),
  ingredients: z
    .array(z.object({ ingredientId: z.string().min(1), amount: z.number().positive(), unit }))
    .min(1),
  steps: z
    .array(
      z.object({
        text: z.string().min(1),
        kind: z.enum(['active', 'passive']),
        minutes: z.number().min(0).max(600),
        equipment: z.enum(['none', 'stove', 'oven']),
        ingredientRefs: z.array(z.string()).optional(),
      }),
    )
    .min(1),
  fridgeDays: z.number().int().min(0).max(14),
  freezable: z.boolean(),
});
export type Recipe = z.infer<typeof recipeSchema>;

const authored = { ...versioned, createdBy: z.string().min(1) };
export const customRecipeSchema = recipeSchema.extend(authored);
export type CustomRecipeDoc = z.infer<typeof customRecipeSchema>;
export const customIngredientSchema = ingredientSchema.extend(authored);
export type CustomIngredientDoc = z.infer<typeof customIngredientSchema>;
