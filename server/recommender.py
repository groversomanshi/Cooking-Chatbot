import os
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence
from uuid import UUID

import psycopg2
from psycopg2.extras import RealDictCursor

from dotenv import load_dotenv

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
load_dotenv(os.path.join(ROOT, ".env"))
load_dotenv(os.path.join(HERE, ".env"), override=True)

RECOMMENDER_SQL = """
SELECT
  r.id,
  r.name,
  r.website,
  m.matched_ingredient_count,
  m.total_ingredient_count,
  CASE
    WHEN m.total_ingredient_count = 0 THEN 0
    ELSE ROUND((m.matched_ingredient_count::numeric * 100.0) / m.total_ingredient_count, 2)
  END AS match_percent
FROM public.recipes AS r
CROSS JOIN LATERAL (
  SELECT
    cardinality(
      ARRAY(
        SELECT UNNEST(COALESCE(r.ingredient_ids, '{}'::bigint[]))
        INTERSECT
        SELECT UNNEST(%s::bigint[])
      )
    ) AS matched_ingredient_count,
    COALESCE(array_length(r.ingredient_ids, 1), 0) AS total_ingredient_count
) AS m
WHERE
  NOT (
    COALESCE(r.dietary_restrictions, '{}'::dietary_restriction[])
    && %s::dietary_restriction[]
  )
ORDER BY
  match_percent DESC,
  m.matched_ingredient_count DESC,
  m.total_ingredient_count DESC;
"""

RECOMMENDER_SQL_WITH_LIMIT = """
SELECT
  r.id,
  r.name,
  r.website,
  m.matched_ingredient_count,
  m.total_ingredient_count,
  CASE
    WHEN m.total_ingredient_count = 0 THEN 0
    ELSE ROUND((m.matched_ingredient_count::numeric * 100.0) / m.total_ingredient_count, 2)
  END AS match_percent
FROM public.recipes AS r
CROSS JOIN LATERAL (
  SELECT
    cardinality(
      ARRAY(
        SELECT UNNEST(COALESCE(r.ingredient_ids, '{}'::bigint[]))
        INTERSECT
        SELECT UNNEST(%s::bigint[])
      )
    ) AS matched_ingredient_count,
    COALESCE(array_length(r.ingredient_ids, 1), 0) AS total_ingredient_count
) AS m
WHERE
  NOT (
    COALESCE(r.dietary_restrictions, '{}'::dietary_restriction[])
    && %s::dietary_restriction[]
  )
ORDER BY
  m.matched_ingredient_count DESC,
  match_percent DESC,
  m.total_ingredient_count DESC
LIMIT %s;
"""

USER_INFO_SQL = """
SELECT ingredients, restrictions
FROM public."userInfo"
WHERE "userId" = %s::uuid
LIMIT 1;
"""


@dataclass
class RecipeRecommendation:
    id: int
    name: str
    website: Optional[str]
    match_percent: float
    matched_ingredient_count: int
    total_ingredient_count: int


def _to_list(values: Optional[Iterable]) -> List:
    """Convert iterables to plain lists for safe SQL array binding."""
    if not values:
        return []
    return list(values)


def recommend_recipes(
    conn,
    user_restrictions: Optional[Iterable[str]],
    user_ingredient_ids: Sequence[int],
    limit: Optional[int] = None,
) -> List[RecipeRecommendation]:
    """
    Return recipe recommendations matching the user ingredient set.

    - Excludes recipes that conflict with user restrictions.
    - Includes all diet-compatible recipes.
    - Sorts by ingredient match count descending, then recipe size descending.
    """
    ingredient_ids = _to_list(user_ingredient_ids)
    restrictions = _to_list(user_restrictions)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if limit is None:
            cur.execute(RECOMMENDER_SQL, (ingredient_ids, restrictions))
        else:
            safe_limit = max(1, int(limit))
            cur.execute(
                RECOMMENDER_SQL_WITH_LIMIT,
                (ingredient_ids, restrictions, safe_limit),
            )
        rows = cur.fetchall()

    return [
        RecipeRecommendation(
            id=row["id"],
            name=row["name"],
            website=row.get("website"),
            match_percent=float(row.get("match_percent", 0) or 0),
            matched_ingredient_count=int(row.get("matched_ingredient_count", 0) or 0),
            total_ingredient_count=int(row.get("total_ingredient_count", 0) or 0),
        )
        for row in rows
    ]


def get_recommendations(
    user_restrictions: Optional[Iterable[str]],
    user_ingredient_ids: Sequence[int],
    limit: Optional[int] = None,
    db_url: Optional[str] = None,
) -> List[RecipeRecommendation]:
    """
    Convenience wrapper that opens a DB connection for one-off calls.
    """
    connection_url = db_url or os.getenv("DATABASE_URL")
    if not connection_url:
        raise ValueError("DATABASE_URL is not set and no db_url was provided.")

    with psycopg2.connect(
        connection_url,
        connect_timeout=5,
        options="-c statement_timeout=15000",
    ) as conn:
        return recommend_recipes(
            conn=conn,
            user_restrictions=user_restrictions,
            user_ingredient_ids=user_ingredient_ids,
            limit=limit,
        )


def get_recommendations_for_user(
    user_id: UUID | str,
    limit: Optional[int] = None,
    db_url: Optional[str] = None,
) -> List[RecipeRecommendation]:
    """
    Fetch user ingredients/restrictions from userInfo, then return recipes.
    """
    connection_url = db_url or os.getenv("DATABASE_URL")
    if not connection_url:
        raise ValueError("DATABASE_URL is not set and no db_url was provided.")

    with psycopg2.connect(
        connection_url,
        connect_timeout=5,
        options="-c statement_timeout=15000",
    ) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(USER_INFO_SQL, (str(user_id),))
            user_row = cur.fetchone()

        if not user_row:
            return []

        return recommend_recipes(
            conn=conn,
            user_restrictions=user_row.get("restrictions") or [],
            user_ingredient_ids=user_row.get("ingredients") or [],
            limit=limit,
        )


def get_dietary_restriction_options(db_url: Optional[str] = None) -> List[str]:
    """Return all values of the public.dietary_restriction enum."""
    connection_url = db_url or os.getenv("DATABASE_URL")
    if not connection_url:
        raise ValueError("DATABASE_URL is not set and no db_url was provided.")

    with psycopg2.connect(
        connection_url,
        connect_timeout=5,
        options="-c statement_timeout=15000",
    ) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT unnest(enum_range(NULL::dietary_restriction))::text;")
            return [row[0] for row in cur.fetchall()]
