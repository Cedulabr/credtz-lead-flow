-- Fix enum validation error by adding missing values to user_level enum
DROP TYPE IF EXISTS user_level CASCADE;

-- Create enum with correct values
CREATE TYPE public.user_level AS ENUM ('junior', 'pleno', 'senior');

-- Add level column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS level user_level;