-- Add Little Kid age group (ages 2–4)

ALTER TYPE public.age_group ADD VALUE IF NOT EXISTS 'little_kids';
