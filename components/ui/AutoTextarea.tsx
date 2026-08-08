"use client";

import {
  useEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function AutoTextarea({ value, className, onInput, style, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      className={className}
      style={{ overflow: "hidden", resize: "none", ...style }}
      onInput={(e) => {
        resize();
        onInput?.(e);
      }}
    />
  );
}
