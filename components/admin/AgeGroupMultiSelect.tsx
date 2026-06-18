"use client";

import { AGE_GROUPS, type AgeGroup } from "@/lib/age-groups";

const CHIP_COLORS: Record<AgeGroup, string> = {
  little_kids: "little_kids",
  kids: "kids",
  little_teens: "little_teens",
  teens: "teens",
  young_adults: "young_adults",
};

type Props = {
  idPrefix: string;
  selected: AgeGroup[];
  disabled?: boolean;
  onChange: (groups: AgeGroup[]) => void;
  showHint?: boolean;
};

export function AgeGroupMultiSelect({
  idPrefix,
  selected,
  disabled,
  onChange,
  showHint = true,
}: Props) {
  function toggle(group: AgeGroup) {
    if (disabled) return;

    const isSelected = selected.includes(group);
    if (isSelected && selected.length <= 1) return;

    const next = isSelected
      ? selected.filter((g) => g !== group)
      : [...selected, group];

    onChange(next);
  }

  return (
    <div>
      <div className="age-group-picker" role="group" aria-label="Age groups">
        {AGE_GROUPS.map((group) => {
          const checked = selected.includes(group.value);
          const isOnlySelected = checked && selected.length === 1;

          return (
            <button
              key={group.value}
              id={`${idPrefix}-${group.value}`}
              type="button"
              className="age-group-chip"
              data-color={CHIP_COLORS[group.value]}
              aria-pressed={checked}
              disabled={disabled || isOnlySelected}
              onClick={() => toggle(group.value)}
            >
              <span className="age-group-chip-check" aria-hidden="true">
                {checked ? "✓" : ""}
              </span>
              <span>
                <span className="age-group-chip-label">{group.label}</span>
                <span className="age-group-chip-desc">{group.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {showHint && (
        <p className="age-group-picker-hint">
          Tap to toggle. At least one group must stay selected.
        </p>
      )}
    </div>
  );
}
