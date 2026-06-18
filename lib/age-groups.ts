export const AGE_GROUPS = [
  { value: "little_kids", label: "Little Kid", description: "Ages 2–4" },
  { value: "kids", label: "Kids", description: "Ages 5–9" },
  { value: "little_teens", label: "Little Teens", description: "Ages 10–13" },
  { value: "teens", label: "Teens", description: "Ages 14–15" },
  { value: "young_adults", label: "Young Adults", description: "Age 15+" },
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number]["value"];

export function ageGroupLabel(value: AgeGroup | string): string {
  return AGE_GROUPS.find((g) => g.value === value)?.label ?? value;
}

export function ageGroupsLabel(groups: AgeGroup[]): string {
  return groups.map((g) => ageGroupLabel(g)).join(", ");
}
