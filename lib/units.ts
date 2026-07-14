export const UNIT_KINDS = [
  {
    value: "vocabulary",
    label: "Vocabulary",
    orderIndex: 1,
  },
  {
    value: "reading",
    label: "Reading",
    orderIndex: 2,
  },
  {
    value: "listening",
    label: "Listening",
    orderIndex: 3,
  },
] as const;

export type UnitKind = (typeof UNIT_KINDS)[number]["value"];

export function unitKindLabel(value: UnitKind | string): string {
  return UNIT_KINDS.find((u) => u.value === value)?.label ?? value;
}
