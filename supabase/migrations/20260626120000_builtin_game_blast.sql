-- Add Blast built-in game type

ALTER TYPE public.builtin_game ADD VALUE IF NOT EXISTS 'blast';
