-- Auth.js tables for Google OAuth stored in Aiven Postgres.
-- Uses UUID user IDs so auth users can be reused by public."userInfo"."userId".

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name varchar(255),
  email varchar(255) unique,
  "emailVerified" timestamptz,
  image text
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  type varchar(255) not null,
  provider varchar(255) not null,
  "providerAccountId" varchar(255) not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  id_token text,
  scope text,
  session_state text,
  token_type text,
  unique(provider, "providerAccountId")
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  expires timestamptz not null,
  "sessionToken" varchar(255) not null unique
);

create table if not exists public.verification_token (
  identifier text not null,
  expires timestamptz not null,
  token text not null,
  primary key (identifier, token)
);
