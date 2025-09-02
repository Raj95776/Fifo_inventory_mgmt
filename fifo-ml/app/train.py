# fifo-ml/app/train.py
import pandas as pd
from joblib import dump
from sklearn.ensemble import RandomForestRegressor
from features import prepare_series, make_last_row
import os

DATA_PATH = "../data/construction_materials.csv"
MODEL_PATH = "../models/global_model.joblib"
META_PATH = "../models/meta.joblib"

def encode_sku(df: pd.DataFrame):
    # force sku_id to clean strings
    sid = (
        df["sku_id"]
        .astype(str)            # make everything a string
        .str.strip()            # trim spaces
        .replace({"nan": "UNKNOWN", "None": "UNKNOWN", "": "UNKNOWN"})
    )
    out = df.copy()
    out["sku_id"] = sid

    # build a stable mapping on strings only
    unique_sids = sorted(out["sku_id"].unique().tolist())
    sku_map = {sid: i for i, sid in enumerate(unique_sids)}
    out["sku_enc"] = out["sku_id"].map(sku_map)
    return out, sku_map


def build_Xy(df: pd.DataFrame):
    # match the SHORT features from features.py
    feats = [
        "sku_enc", "dow", "month", "holiday_flag",
        "lag_1", "lag_3", "lag_7",
        "roll_mean_3", "roll_mean_7", "roll_std_7",
    ]
    X = df[feats].copy()
    y = df["qty_out"].values
    return X, y, feats

def main():
    raw = pd.read_csv(DATA_PATH)
    raw.columns = [c.strip() for c in raw.columns]
    needed = {"date", "sku_id", "qty_out"}
    missing = needed - set(raw.columns)
    if missing:
        raise RuntimeError(f"Missing columns in CSV: {missing}")

    features = prepare_series(raw)
    features, sku_map = encode_sku(features)
    X, y, feats = build_Xy(features)

    n_samples = len(X)

    # For very small data, skip CV entirely
    if n_samples < 5:
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        best_model, best_mae = model, 0.0
    else:
        # Gentle CV for small datasets
        from sklearn.model_selection import TimeSeriesSplit
        from sklearn.metrics import mean_absolute_error

        splits = max(2, min(3, n_samples // 10))  # 2–3 splits
        tscv = TimeSeriesSplit(n_splits=splits)

        best_model, best_mae = None, float("inf")
        for tr, te in tscv.split(X):
            m = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
            m.fit(X.iloc[tr], y[tr])
            pred = m.predict(X.iloc[te])
            mae = mean_absolute_error(y[te], pred)
            if mae < best_mae:
                best_mae, best_model = mae, m

    print(f"Best CV MAE: {best_mae:.3f}")
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    dump(best_model, MODEL_PATH)

    last_feat = make_last_row(features)
    meta = {
        "sku_map": sku_map,
        "last_features": last_feat,
        "feature_cols": feats,
    }
    dump(meta, META_PATH)
    print("Saved:", MODEL_PATH, META_PATH)

if __name__ == "__main__":
    main()
