-- Run this in Supabase SQL Editor (you can re-run safely).
-- It creates RPC functions used by the Flask backend:
--   - public.recommend_for_user(user_id uuid, lim int)
--   - public.list_dietary_restrictions()
--
-- NOTE: This version is optimized to avoid statement timeouts by:
-- - scoring only recipes that overlap the pantry first (fast with a GIN index)
-- - filling remaining slots with 0-match recipes so you still get results

create or replace function public.recommend_for_user(user_id uuid, lim int default 50)
returns table (
  id bigint,
  name text,
  website text,
  matched_ingredient_count int,
  total_ingredient_count int,
  match_percent numeric
)
language plpgsql
stable
as $$
declare
  pantry_ids bigint[];
  user_restr dietary_restriction[];
  wanted int := greatest(1, coalesce(lim, 50));
begin
  select
    coalesce(ingredients, '{}'::bigint[]),
    coalesce(restrictions, '{}'::dietary_restriction[])
  into pantry_ids, user_restr
  from public."userInfo"
  where "userId" = user_id
  limit 1;

  -- No user row yet => no recommendations.
  if pantry_ids is null then
    return;
  end if;

  -- 1) Score only overlapping recipes first (fast path).
  return query
  with overlap as (
    select
      r.id,
      r.name,
      r.website,
      cardinality(
        array(
          select unnest(coalesce(r.ingredient_ids, '{}'::bigint[]))
          intersect
          select unnest(pantry_ids)
        )
      ) as matched_ingredient_count,
      coalesce(array_length(r.ingredient_ids, 1), 0) as total_ingredient_count
    from public.recipes r
    where
      (pantry_ids = '{}'::bigint[] or coalesce(r.ingredient_ids, '{}'::bigint[]) && pantry_ids)
      and not (
        coalesce(r.dietary_restrictions, '{}'::dietary_restriction[]) && user_restr
      )
  ),
  ranked_overlap as (
    select
      o.*,
      case
        when o.total_ingredient_count = 0 then 0
        else round((o.matched_ingredient_count::numeric * 100.0) / o.total_ingredient_count, 2)
      end as match_percent
    from overlap o
    order by
      o.matched_ingredient_count desc,
      match_percent desc,
      o.total_ingredient_count desc
    limit wanted
  ),
  remaining as (
    select greatest(0, wanted - (select count(*) from ranked_overlap)) as n
  ),
  fillers as (
    -- If we don't have enough overlaps, fill with diet-compatible 0-match recipes.
    select
      r.id,
      r.name,
      r.website,
      0::int as matched_ingredient_count,
      coalesce(array_length(r.ingredient_ids, 1), 0) as total_ingredient_count,
      0::numeric as match_percent
    from public.recipes r, remaining rem
    where
      rem.n > 0
      and not (coalesce(r.dietary_restrictions, '{}'::dietary_restriction[]) && user_restr)
      and (
        pantry_ids = '{}'::bigint[]
        or not (coalesce(r.ingredient_ids, '{}'::bigint[]) && pantry_ids)
      )
    order by r.id asc
    limit (select n from remaining)
  )
  select * from ranked_overlap
  union all
  select * from fillers;
end;
$$;


create or replace function public.list_dietary_restrictions()
returns setof text
language sql
stable
as $$
  select unnest(enum_range(null::dietary_restriction))::text;
$$;


-- Performance indexes (safe to run; will no-op if they already exist).
-- These drastically speed up overlap checks and sorting.
create index if not exists recipes_ingredient_ids_gin
  on public.recipes
  using gin (ingredient_ids);

create index if not exists recipes_dietary_restrictions_gin
  on public.recipes
  using gin (dietary_restrictions);

