#!/usr/bin/env python3
import json
import os
import sys


def _safe_imports():
    try:
        import joblib  # type: ignore
        import pandas as pd  # type: ignore
        return joblib, pd
    except Exception as err:
        raise RuntimeError(f"python dependencies missing for risk predictor: {err}") from err


def _required_columns(model):
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)

    if hasattr(model, "named_steps"):
        prep = model.named_steps.get("prep")
        if prep is not None and hasattr(prep, "transformers_"):
            cols = []
            for transformer in prep.transformers_:
                if len(transformer) >= 3 and isinstance(transformer[2], list):
                    cols.extend(transformer[2])
            if cols:
                return cols

    if hasattr(model, "get_booster"):
        booster = model.get_booster()
        if hasattr(booster, "feature_names") and booster.feature_names:
            return list(booster.feature_names)

    return []


def _default_value(col):
    defaults = {
        "acquisition_channel": "Direct",
        "plan_type": "Standard",
        "avg_resolution_time": 24.0,
        "engagement_change_ratio": 1.0,
        "frequency_change_ratio": 1.0,
        "purchase_trend_3m": 0.0,
        "rfm_score": 0.5,
    }
    if col in defaults:
        return defaults[col]
    return 0.0


def main():
    raw = sys.stdin.read()
    if not raw:
        raise RuntimeError("missing predictor input payload")
    payload = json.loads(raw)

    model_path = payload.get("model_path")
    if not model_path:
        raise RuntimeError("missing model_path")
    if not os.path.exists(model_path):
        raise RuntimeError(f"model file not found: {model_path}")

    records = payload.get("records", [])
    if not isinstance(records, list):
        raise RuntimeError("records must be an array")

    joblib, pd = _safe_imports()
    model = joblib.load(model_path)
    required_cols = _required_columns(model)

    frame = pd.DataFrame(records)

    for col in required_cols:
        if col not in frame.columns:
            frame[col] = _default_value(col)

    if required_cols:
        frame = frame[required_cols]

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(frame)[:, 1]
    else:
        preds = model.predict(frame)
        probs = preds

    model_version = os.path.splitext(os.path.basename(model_path))[0]
    out = {
        "probabilities": [float(max(0.0, min(1.0, p))) for p in probs],
        "model_version": model_version,
        "required_columns": required_cols,
    }
    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(str(exc))
        sys.exit(1)
