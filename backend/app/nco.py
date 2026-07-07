"""NCO CSV helpers: load, build the text we embed, and build the stored payload."""
from __future__ import annotations

import uuid

import pandas as pd

REQUIRED_COLUMNS = ["nco_code_2015", "title", "description"]

# Columns appended (when present) to the embedded document for richer recall.
HIERARCHY_FIELDS = ["family_name", "group_name", "sub_division_name", "division_name"]

# Full set we try to keep in the payload for display/filtering.
PAYLOAD_FIELDS = [
    "nco_code_2015", "title", "description",
    "division_code", "division_name",
    "sub_division_code", "sub_division_name",
    "group_code", "group_name",
    "family_code", "family_name",
]


def load_nco_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str).fillna("")
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")
    df = df[df["nco_code_2015"].str.strip() != ""].reset_index(drop=True)
    return df


def build_document_text(row: dict) -> str:
    """Composite text we embed: title + description + hierarchy names."""
    parts = [row.get("title", ""), row.get("description", "")]
    parts += [row.get(f, "") for f in HIERARCHY_FIELDS]
    return " | ".join(p.strip() for p in parts if p and p.strip())


def build_payload(row: dict) -> dict:
    payload = {f: row.get(f, "") for f in PAYLOAD_FIELDS if f in row}
    payload["hierarchy_path"] = " > ".join(
        v for v in [
            row.get("division_name", ""),
            row.get("sub_division_name", ""),
            row.get("group_name", ""),
            row.get("family_name", ""),
        ] if v and v.strip()
    )
    return payload


def stable_id(nco_code: str) -> str:
    """Deterministic UUID from the NCO code -> idempotent re-ingestion."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"nco-2015:{nco_code.strip()}"))