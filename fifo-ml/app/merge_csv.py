# fifo-ml/app/merge_csv.py
import os
import re
import pandas as pd
from typing import Optional, Tuple, List

# —— Robust paths (point to fifo-ml/app/data) ——
BASE_DIR = os.path.dirname(os.path.abspath(__file__))          # .../fifo-ml/app
DATA_DIR = os.path.join(BASE_DIR, "data")                      # .../fifo-ml/app/data
OUTPUT_FILE = os.path.join(DATA_DIR, "construction_materials.csv")



MATERIAL_MAP = {
    "bricks.csv": "Bricks",   # Table 6a
    "cement.csv": "Cement",   # Table 7a
    "blocks.csv": "Blocks",   # Table 8a
    "steel.csv":  "Steel",    # Table 9a/9b
}

DATE_HINTS = ["date", "month", "period", "time"]
VALUE_HINTS = ["deliver", "qty", "quantity", "value", "sales", "production", "output", "tonne", "thousand"]

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.dropna(how="all").dropna(axis=1, how="all")
    df.columns = [str(c).strip() for c in df.columns]
    # drop footer/source rows (heuristic)
    mask_foot = df.apply(
        lambda r: r.astype(str).str.lower()
        .str.contains("source|note|office for|seasonally adjusted").any(), axis=1
    )
    return df.loc[~mask_foot].copy()

def coerce_numeric(series: pd.Series) -> pd.Series:
    s = series.astype(str).str.replace(r"[,\s]", "", regex=True)
    s = s.str.replace(r"\[.*?\]", "", regex=True)  # remove [c], [r], etc
    return pd.to_numeric(s, errors="coerce")

def score_as_datetime(series: pd.Series) -> int:
    s = series.astype(str).str.strip()
    dt = pd.to_datetime(s, errors="coerce", infer_datetime_format=True)
    return dt.notna().sum()

def score_by_keywords(name: str, keywords: List[str]) -> int:
    n = name.lower()
    return sum(1 for k in keywords if k in n)

def guess_date_and_value_cols(df: pd.DataFrame) -> Tuple[str, str]:
    best_date_col, best_date_score = None, -1
    for col in df.columns:
        parse_score = score_as_datetime(df[col])
        kw_bonus = score_by_keywords(col, DATE_HINTS) * 1000
        total = parse_score + kw_bonus
        if total > best_date_score:
            best_date_score, best_date_col = total, col
    if best_date_col is None or best_date_score <= 0:
        best_date_col = df.columns[0]

    best_val_col, best_val_score = None, -1.0
    for col in df.columns:
        if col == best_date_col:
            continue
        numeric = coerce_numeric(df[col])
        nz = numeric.notna().sum()
        kw_bonus = score_by_keywords(col, VALUE_HINTS) * 1000
        total = nz + kw_bonus
        if total > best_val_score:
            best_val_score, best_val_col = total, col
    if best_val_col is None:
        best_val_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]
    return best_date_col, best_val_col

def normalize_month_start(dt: pd.Series) -> pd.Series:
    dt = pd.to_datetime(dt, errors="coerce", infer_datetime_format=True)
    return dt.dt.to_period("M").dt.to_timestamp()

def process_one(file_path: str, material_label: str) -> pd.DataFrame:
    df = pd.read_csv(file_path, dtype=str)  # read as strings
    df = clean_dataframe(df)
    if df.empty:
        raise ValueError(f"{os.path.basename(file_path)} has no usable rows")
    date_col, val_col = guess_date_and_value_cols(df)
    out = pd.DataFrame({
        "date": normalize_month_start(df[date_col]),
        "qty_out": coerce_numeric(df[val_col]),
        "sku_id": material_label
    }).dropna(subset=["date"])
    out = out[out["qty_out"].notna()]
    # If your CSV values are “in thousands”, uncomment:
    # out["qty_out"] = out["qty_out"] * 1000
    return out

def main():
    frames = []
    for fname, label in MATERIAL_MAP.items():
        path = os.path.join(DATA_DIR, fname)
        if not os.path.exists(path):
            print(f"⚠️  Missing: {path}")
            continue
        try:
            part = process_one(path, label)
            print(f"✔ {fname}: picked date/value columns and {len(part)} rows")
            frames.append(part)
        except Exception as e:
            print(f"❌ Failed on {fname}: {e}")

    if not frames:
        raise SystemExit("No data merged. Check file names and CSV formats.")

    final_df = pd.concat(frames, ignore_index=True).sort_values(["sku_id", "date"])
    final_df.to_csv(OUTPUT_FILE, index=False)
    print(f"\n✅ Merged dataset saved to {OUTPUT_FILE}")
    print(final_df.groupby("sku_id")["qty_out"].describe())

if __name__ == "__main__":
    main()
