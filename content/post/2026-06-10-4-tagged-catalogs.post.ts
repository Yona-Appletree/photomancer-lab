import { md, post, ts } from "../../src/ts-post";

post({
  title: "Friendly Tagged Catalogs in TypeScript",
  date: "2026-06-10",
  description:
    "A small pattern for deriving tags, values, and exhaustive handlers from one finite TypeScript catalog.",
  tested: true,
  tags: ["architecture", "typescript"],
});

md`
There is often a need in TypeScript programs to have a source-defined set of rich values that are
identified by some tag/id/key. I call this pattern a "tagged catalog."

Recently I was looking over the code of a small game that a friend is writing to learn TypeScript.
One piece of it was exactly this kind of catalog.

I'll show the original code in a moment, but lets start with a clean example, showing how I'd _like_
this to work:
`;

export const EnemyIntent = TaggedCatalog<EnemyIntentDef>()({
  SMALL_ATTACK: {
    intentKind: "attack-only",
    name: "Bash",
    damage: { dice: 1, sides: 4, bonusDamage: 1 },
  },
  SMALL_SHIELD_BASH: {
    intentKind: "guard-attack",
    name: "Shield Bash",
    damage: { dice: 1, sides: 4, bonusDamage: 1 },
    effects: [{ effect: "enemy-shield-gain", amount: 2 }],
  },
  SMALL_DEFEND: {
    intentKind: "guard-only",
    name: "Guard",
    effects: [{ effect: "enemy-locked-shield-gain", amount: 3 }],
  },
});

export type EnemyIntentTag = TaggedCatalogTag<typeof EnemyIntent>;
export type EnemyIntent = TaggedCatalogValue<typeof EnemyIntent>;

interface EnemyIntentDef {
  intentKind: "attack-only" | "guard-only" | "guard-attack";
  name: string;
  damage?: {
    dice: number;
    sides: number;
    bonusDamage: number;
  };
  effects?: Array<
    | { effect: "enemy-shield-gain"; amount: number }
    | { effect: "enemy-locked-shield-gain"; amount: number }
  >;
}

md`
The type passed to \`TaggedCatalog\` checks the shared shape of each value, and the helper preserves
the more specific type for each key.

The helper also injects the \`tag\` from the catalog key, so \`EnemyIntent.SMALL_ATTACK.tag\` is
\`"SMALL_ATTACK"\` without writing that string twice.

The common derived views come from the same catalog:
`;

export const enemyIntentTags: readonly EnemyIntentTag[] = EnemyIntent.tags;
export const enemyIntentValues: readonly EnemyIntent[] = EnemyIntent.values;
export const smallAttack = EnemyIntent.byTag.SMALL_ATTACK;
export const smallAttackTag: EnemyIntentTag = smallAttack.tag;

md`
Compare that to the straightforward hand-written catalog:
`;

ts`
export type EnemyIntentTag = "SMALL_ATTACK" | "SMALL_SHIELD_BASH" | "SMALL_DEFEND";

export const EnemyIntentTags: readonly EnemyIntentTag[] = [
  "SMALL_ATTACK",
  "SMALL_SHIELD_BASH",
  "SMALL_DEFEND",
];

export const EnemyIntents: Readonly<Record<EnemyIntentTag, EnemyIntentDef>> = {
  SMALL_ATTACK: {
    tag: "SMALL_ATTACK",
    name: "Bash",
    damage: { dice: 1, sides: 4, bonusDamage: 1 },
  },
  SMALL_SHIELD_BASH: {
    tag: "SMALL_SHIELD_BASH",
    name: "Shield Bash",
    damage: { dice: 1, sides: 4, bonusDamage: 1 },
    effects: [{ effect: "enemy-shield-gain", amount: 2 }],
  },
  SMALL_DEFEND: {
    tag: "SMALL_DEFEND",
    name: "Guard",
    effects: [{ effect: "enemy-locked-shield-gain", amount: 3 }],
  },
};
`;

md`
This works. It is also the sort of thing that gets more expensive as the catalog grows.

Adding one intent means editing the tag union, the tag array, the catalog key, and the internal
\`tag\` field. That gives us a few chances to make mistakes:

1. The same tag appears in several places.
2. The catalog key and the internal \`tag\` can drift.
3. \`Record<EnemyIntentTag, EnemyIntentDef>\` is only exhaustive relative to the separate
   \`EnemyIntentTag\` union, which is itself another thing to keep updated.
4. There is no built-in list of values unless we remember to make and maintain one.

The catalog key is already the tag, so the helper can put that tag onto the value.
`;

md`
## Matching

When working with a tagged catalog, we often want tag-specific behavior. The helper can attach a
small exhaustive matcher to the catalog:
`;

export function enemyIntentLabel(intent: EnemyIntent): string {
  return EnemyIntent.match({
    SMALL_ATTACK: (attack) =>
      `${attack.name}: ${attack.damage.dice}d${attack.damage.sides}+${attack.damage.bonusDamage}`,
    SMALL_SHIELD_BASH: (attack) => `${attack.name}: attack and ${attack.effects.length} effect`,
    SMALL_DEFEND: (defend) => `${defend.name}: ${defend.effects[0]?.amount ?? 0} shield`,
  })(intent);
}

md`
If a new enemy intent is added, the matcher fails to type-check until it handles the new key. If a
handler tries to read \`damage\` from \`SMALL_DEFEND\`, TypeScript knows that value does not have
damage.

Sometimes I want a partial match instead. For that, the same API can expose \`matchOrNull\`:
`;

export function enemyIntentDamageText(intent: EnemyIntent): string {
  return (
    EnemyIntent.matchOrNull({
      SMALL_ATTACK: (attack) =>
        `${attack.damage.dice}d${attack.damage.sides}+${attack.damage.bonusDamage}`,
      SMALL_SHIELD_BASH: (attack) =>
        `${attack.damage.dice}d${attack.damage.sides}+${attack.damage.bonusDamage}`,
    })(intent) ?? "no damage"
  );
}

md`
Without a catalog-level matcher, we might write this with a switch:
`;

ts`
function enemyIntentLabel(intent: EnemyIntent): string {
  switch (intent.tag) {
    case "SMALL_ATTACK":
      return intent.name;
    case "SMALL_SHIELD_BASH":
      return intent.name;
    case "SMALL_DEFEND":
      return intent.name;
  }
}
`;

md`
That works, but there are drawbacks:

1. It is verbose.
2. Exhaustiveness is possible, but it relies on compiler behavior that can be bypassed.
3. The intent is less clear: this is not arbitrary control flow, it is a table of behavior keyed by
   the same tags as the data.

The matcher is not a full pattern-matching library. It is just enough structure to make the behavior
table line up with the catalog.
`;

test("tagged catalogs expose tags, values, lookup, and matching", () => {
  expect(EnemyIntent.tags).toEqual(["SMALL_ATTACK", "SMALL_SHIELD_BASH", "SMALL_DEFEND"]);
  expect(EnemyIntent.SMALL_ATTACK.tag).toBe("SMALL_ATTACK");
  expect(enemyIntentLabel(EnemyIntent.SMALL_DEFEND)).toBe("Guard: 3 shield");
  expect(enemyIntentDamageText(EnemyIntent.SMALL_ATTACK)).toBe("1d4+1");
  expect(enemyIntentDamageText(EnemyIntent.SMALL_DEFEND)).toBe("no damage");
});

md`
The checked source also includes a few expected type failures. These are the mistakes the pattern is
meant to prevent: manually writing a drifting tag, forgetting a matcher branch, and adding a matcher
branch for a key that does not exist.
`;

TaggedCatalog()({
  // @ts-expect-error The helper owns the tag property, so it cannot drift from the catalog key.
  BROKEN_ATTACK: {
    tag: "SOMETHING_ELSE",
    name: "Broken Attack",
  },
});

// @ts-expect-error A matcher has to handle every known key.
EnemyIntent.match({
  SMALL_ATTACK: (attack) => attack.name,
  SMALL_SHIELD_BASH: (attack) => attack.name,
});

EnemyIntent.match({
  SMALL_ATTACK: (attack) => attack.name,
  SMALL_SHIELD_BASH: (attack) => attack.name,
  SMALL_DEFEND: (defend) => defend.name,
  // @ts-expect-error A matcher cannot handle keys that are not in the catalog.
  MADE_UP_INTENT: () => "nope",
});

md`
I would use this for catalogs that are mostly data and have stable symbolic tags. I would not use it
for arbitrary tagged values, database records, user-generated tags, or untrusted boundary data. In
those cases I would pair the idea with a schema parser, or use a different shape entirely.

For game content and other source-controlled catalogs, the shape is usually enough:
`;

ts`
const thing = Catalog.SOME_KEY;
type ThingTag = TaggedCatalogTag<typeof Catalog>;
type Thing = TaggedCatalogValue<typeof Catalog>;
`;

md`
Write the catalog once. Let TypeScript do the clerical work.

## The helper

Here is the full helper. There is not much runtime code here; most of the weight is in the types
that preserve the relationship between each key and each value.
`;

/**
 * Builds a typed catalog, using each catalog key as the value's tag.
 */
export function TaggedCatalog<const TShape extends object = object>() {
  return function TaggedCatalog<const TDefs extends Record<string, TShape>>(
    defs: UntaggedDefs<DefsForShape<TShape, TDefs>>,
  ) {
    type Key = StringKeyOf<TDefs>;
    type Table = TaggedTable<TDefs>;
    type Value = Table[Key];

    const entries = Object.entries(defs).map(([key, value]) => [
      key,
      Object.freeze({ ...value, tag: key }),
    ]);
    const byTag = Object.fromEntries(entries) as Table;
    const tags = Object.freeze(Object.keys(defs)) as readonly Key[];
    const values = Object.freeze(Object.values(byTag)) as readonly Value[];

    function get<TKey extends Key>(key: TKey): Table[TKey] {
      return byTag[key];
    }

    function match<const THandlers extends { readonly [K in Key]: (value: Table[K]) => unknown }>(
      handlers: THandlers & { readonly [K in Exclude<keyof THandlers, Key>]: never },
    ) {
      return <TValue extends Value>(
        value: TValue,
      ): ReturnType<THandlers[Extract<TValue["tag"], Key>]> => {
        const key = value.tag as Key;
        const handler = (handlers as Record<Key, (matched: Value) => unknown>)[key];
        return handler(value) as ReturnType<THandlers[Extract<TValue["tag"], Key>]>;
      };
    }

    function matchOrNull<
      const THandlers extends Partial<{ readonly [K in Key]: (value: Table[K]) => unknown }>,
    >(handlers: THandlers & { readonly [K in Exclude<keyof THandlers, Key>]: never }) {
      type Result = HandlerResult<THandlers>;

      return (value: Value): Result | null => {
        const key = value.tag as Key;
        const handler = (handlers as Partial<Record<Key, (matched: Value) => Result>>)[key];
        return handler ? handler(value) : null;
      };
    }

    return Object.freeze(
      Object.assign(byTag, {
        tags,
        values,
        byTag,
        get,
        match,
        matchOrNull,
      }),
    ) as Table & TaggedCatalogApi<TDefs, Table>;
  };
}

type TaggedCatalogApi<TDefs extends Record<string, object>, TTable extends TaggedTable<TDefs>> = {
  readonly tags: readonly StringKeyOf<TDefs>[];
  readonly values: readonly TTable[StringKeyOf<TDefs>][];
  readonly byTag: TTable;
  get<TKey extends StringKeyOf<TDefs>>(key: TKey): TTable[TKey];
  match<
    const THandlers extends { readonly [K in StringKeyOf<TDefs>]: (value: TTable[K]) => unknown },
  >(
    handlers: THandlers & {
      readonly [K in Exclude<keyof THandlers, StringKeyOf<TDefs>>]: never;
    },
  ): <TValue extends TTable[StringKeyOf<TDefs>]>(
    value: TValue,
  ) => ReturnType<THandlers[Extract<TValue["tag"], StringKeyOf<TDefs>>]>;
  matchOrNull<
    const THandlers extends Partial<{
      readonly [K in StringKeyOf<TDefs>]: (value: TTable[K]) => unknown;
    }>,
  >(
    handlers: THandlers & {
      readonly [K in Exclude<keyof THandlers, StringKeyOf<TDefs>>]: never;
    },
  ): (value: TTable[StringKeyOf<TDefs>]) => HandlerResult<THandlers> | null;
};

export type TaggedCatalogTag<TCatalog> = TCatalog extends {
  readonly tags: readonly (infer TTag)[];
}
  ? TTag
  : never;

export type TaggedCatalogValue<TCatalog> = TCatalog extends {
  readonly values: readonly (infer TValue)[];
}
  ? TValue
  : never;

type StringKeyOf<T> = Extract<keyof T, string>;

type TaggedTable<TDefs extends Record<string, object>> = {
  readonly [K in StringKeyOf<TDefs>]: Readonly<TDefs[K] & { readonly tag: K }>;
};

type UntaggedDefs<TDefs extends Record<string, object>> = {
  readonly [K in keyof TDefs]: "tag" extends keyof TDefs[K] ? never : TDefs[K];
};

type DefsForShape<TShape extends object, TDefs extends Record<string, TShape>> = {
  readonly [K in keyof TDefs]: TDefs[K];
};

type HandlerResult<THandlers> = THandlers[keyof THandlers] extends (
  ...args: never[]
) => infer TResult
  ? TResult
  : never;
