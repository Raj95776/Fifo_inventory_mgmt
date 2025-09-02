# fifo-ml/app/features.py
import pandas as pd
import numpy as np

def prepare_series(df_txn: pd.DataFrame) -> pd.DataFrame:
    df = df_txn.copy()
    df["sku_id"] = (
        df["sku_id"].astype(str).str.strip()
        .replace({"nan": "UNKNOWN", "None": "UNKNOWN", "": "UNKNOWN"})
    )
    df["date"] = pd.to_datetime(df["date"])
    ...


    # one row per (sku_id, date)
    df = df.groupby(["sku_id", "date"], as_index=False)["qty_out"].sum()

    # Fill missing dates per SKU with 0 qty_out
    def fill_dates(g: pd.DataFrame) -> pd.DataFrame:
        idx = pd.date_range(g["date"].min(), g["date"].max(), freq="D")
        g2 = g.set_index("date").reindex(idx).fillna(0.0)
        g2.index.name = "date"
        return g2.rename_axis(["date"]).reset_index()

    df = df.groupby("sku_id", group_keys=False).apply(fill_dates)

    # Time features
    df["dow"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month

    # SHORT lags so tiny datasets still work
    for L in [1, 3, 7]:
        df[f"lag_{L}"] = df.groupby("sku_id")["qty_out"].shift(L)

    # SHORT rolling windows (no peeking)
    for w in [3, 7]:
        df[f"roll_mean_{w}"] = df.groupby("sku_id")["qty_out"].shift(1).rolling(w).mean()
    # one std column to keep it simple
    df["roll_std_7"] = df.groupby("sku_id")["qty_out"].shift(1).rolling(7).std()

    df["holiday_flag"] = 0

    # Keep early rows by filling missing features with 0
    df = df.fillna(0.0)
    return df

def make_last_row(features_df: pd.DataFrame) -> pd.DataFrame:
    """Return the last feature row per SKU (used as forecasting seed)."""
    idx = features_df.groupby("sku_id")["date"].transform("max") == features_df["date"]
    return features_df.loc[idx].copy()

def roll_forward_one_day(seed: pd.DataFrame, y_hat: np.ndarray) -> pd.DataFrame:
    """
    Update lag/rolling columns with predicted qty for each SKU and +1 day.
    seed: one row per SKU with all features.
    y_hat: np.ndarray shape (n_sku,)
    """
    out = seed.copy()
    out["date"] = out["date"] + pd.Timedelta(days=1)
    out["dow"] = out["date"].dt.dayofweek
    out["month"] = out["date"].dt.month

    # Shift lags: 7 <- 3, 3 <- 1, 1 <- y_hat
    out["lag_7"] = out["lag_3"]
    out["lag_3"] = out["lag_1"]
    out["lag_1"] = y_hat

    # Update rolling means (simple online update)
    for w in [3, 7]:
        prev = out[f"roll_mean_{w}"].fillna(0.0)
        out[f"roll_mean_{w}"] = prev + (y_hat - prev) / w

    # Keep previous std as approximation
    out["roll_std_7"] = out["roll_std_7"].fillna(0.0)

    out["holiday_flag"] = 0
    return out
