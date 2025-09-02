# fifo-ml/app/service.py
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd

from registry import REG
from features import roll_forward_one_day

app = FastAPI(title="FIFO-ML Service")

# CORS (dev-friendly; tighten in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _load():
    try:
        REG.load()
    except Exception as e:
        # Don’t crash the process, but mark as not loaded.
        REG.loaded = False
        print("❌ Failed to load model/meta:", e)

class ForecastResponse(BaseModel):
    sku_id: str
    start_date: str
    horizon: int
    forecast: List[float]

class ReorderResponse(BaseModel):
    sku_id: str
    lead_time_days: int
    daily_mean: float
    daily_std: float
    safety_stock: int
    reorder_point: int
    suggested_order: Optional[int] = None  # if on_hand provided

@app.get("/health")
def health():
    return {
        "ok": REG.loaded,
        "model_path": str(REG.MODEL_PATH),
        "meta_path": str(REG.META_PATH),
        "skus_known": len(REG.meta.get("sku_map", {})) if REG.loaded else 0,
    }

@app.get("/ml/skus")
def list_skus():
    if not REG.loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    # Prefer keys from sku_map; fallback to last_features
    sku_map = REG.meta.get("sku_map", {})
    if sku_map:
        return sorted(list(sku_map.keys()))
    lf = REG.meta.get("last_features", pd.DataFrame())
    if isinstance(lf, pd.DataFrame) and "sku_id" in lf.columns:
        return sorted(lf["sku_id"].unique().tolist())
    return []

def _subset_seed(sku_id: str) -> pd.DataFrame:
    lf = REG.meta["last_features"]
    row = lf[lf["sku_id"] == sku_id]
    if row.empty:
        # Try case-insensitive match as a convenience
        lower = sku_id.lower()
        cand = lf[lf["sku_id"].str.lower() == lower]
        if cand.empty:
            raise ValueError(f"Unknown SKU: {sku_id}")
        row = cand
    return row.copy()

def _prep_X(df: pd.DataFrame) -> pd.DataFrame:
    # Build feature matrix in the same order that the model expects
    feat_cols = REG.meta["feature_cols"]
    if "sku_map" not in REG.meta:
        REG.meta["sku_map"] = {}
    sku_map = REG.meta["sku_map"]

    X = pd.DataFrame()
    # Add all numeric/time features first
    for c in feat_cols:
        if c == "sku_enc":
            continue
        # If a column is missing (edge case in roll-forward), fill with 0
        X[c] = df[c] if c in df.columns else 0.0

    # sku_enc derived from sku_id using sku_map
    if "sku_id" in df.columns:
        X["sku_enc"] = df["sku_id"].map(sku_map)
    else:
        # If no sku_id column, assume the single row already represents a specific SKU
        # and can’t compute sku_enc — raise explicit error
        raise ValueError("Missing sku_id to compute sku_enc")

    # Reorder columns to exact order the model was trained on
    ordered = [c for c in feat_cols if c in X.columns]
    # Safety: add any leftover columns deterministically
    leftover = [c for c in X.columns if c not in ordered]
    X = X[ordered + leftover]
    return X

@app.get("/ml/forecast", response_model=ForecastResponse)
def forecast(
    sku_id: str = Query(..., description="Exact SKU as trained (e.g., Cement, Bricks, Steel, Blocks)"),
    horizon: int = Query(7, ge=1, le=30),
):
    try:
        REG.require_loaded()
        seed = _subset_seed(sku_id)
        cur = seed.copy()
        preds: List[float] = []

        for _ in range(horizon):
            X = _prep_X(cur)
            y_hat = REG.model.predict(X)
            preds.append(float(y_hat[0]))
            cur = roll_forward_one_day(cur, y_hat)

        start_dt = seed["date"].iloc[0] + pd.Timedelta(days=1)
        return {
            "sku_id": sku_id,
            "start_date": str(start_dt),
            "horizon": horizon,
            "forecast": [round(p, 2) for p in preds],
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast error: {e}")

@app.get("/ml/reorder", response_model=ReorderResponse)
def reorder(
    sku_id: str = Query(...),
    lead_time_days: int = Query(7, ge=1, le=90),
    z: float = Query(1.65, ge=0.0, le=5.0),
    on_hand: Optional[int] = Query(None, description="Optional current stock to compute suggested order"),
):
    """
    Simple ROP: demand during lead time + z * std * sqrt(lead_time_days)
    Demand estimate from short-term forecast.
    """
    try:
        # Use 14-day forecast to estimate mean & std
        fc_resp = forecast(sku_id=sku_id, horizon=14)
        fc = fc_resp["forecast"]
        daily_mean = float(np.mean(fc))
        daily_std = float(np.std(fc, ddof=1)) if len(fc) > 1 else 0.0

        lt = max(lead_time_days, 1)
        demand_lt = daily_mean * lt
        safety = z * daily_std * np.sqrt(lt)
        rop = int(round(demand_lt + safety))

        out = {
            "sku_id": sku_id,
            "lead_time_days": lt,
            "daily_mean": round(daily_mean, 2),
            "daily_std": round(daily_std, 2),
            "safety_stock": int(round(safety)),
            "reorder_point": rop,
        }
        if on_hand is not None:
            out["suggested_order"] = max(0, rop - int(on_hand))
        return out
    except HTTPException:
        # pass through 404 from forecast for unknown SKU
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reorder error: {e}")
