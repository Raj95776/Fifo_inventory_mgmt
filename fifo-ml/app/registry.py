# fifo-ml/app/registry.py
from pathlib import Path
from typing import Optional, Dict, Any
import pandas as pd
from joblib import load

class _Registry:
    def __init__(self):
        self.model = None
        self.meta: Dict[str, Any] = {}
        self.loaded = False
        # Resolve model paths relative to this file so it works no matter the CWD
        base = Path(__file__).parent
        self.MODEL_PATH = (base.parent / "models" / "global_model.joblib").resolve()
        self.META_PATH  = (base.parent / "models" / "meta.joblib").resolve()

    def load(self):
        # Load model & meta; normalize types
        self.model = load(self.MODEL_PATH)
        meta_raw = load(self.META_PATH)

        # Normalize last_features to DataFrame with proper dtypes
        lf = meta_raw.get("last_features")
        if isinstance(lf, pd.DataFrame):
            last_features = lf.copy()
        else:
            last_features = pd.DataFrame(lf)

        # Ensure date is datetime
        if "date" in last_features.columns:
            last_features["date"] = pd.to_datetime(last_features["date"])

        # Sanity defaults
        feature_cols = list(meta_raw.get("feature_cols", []))
        sku_map = dict(meta_raw.get("sku_map", {}))

        # Keep everything
        self.meta = {
            **meta_raw,
            "last_features": last_features,
            "feature_cols": feature_cols,
            "sku_map": sku_map,
        }
        self.loaded = True

    def require_loaded(self):
        if not self.loaded or self.model is None:
            raise RuntimeError("Model registry not loaded yet.")

REG = _Registry()
