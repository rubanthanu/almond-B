import os
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import pandas as pd
import numpy as np

# Resolve path to model file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.abspath(os.path.join(BASE_DIR, "model_package.pkl"))

# Define input features model supporting aliases and camelCase/PascalCase
class AlmondFeatures(BaseModel):
    length: Optional[float] = Field(None, alias="Length (major axis)")
    width: Optional[float] = Field(None, alias="Width (minor axis)")
    thickness: Optional[float] = Field(None, alias="Thickness (depth)")
    area: Optional[float] = Field(None, alias="Area")
    perimeter: Optional[float] = Field(None, alias="Perimeter")
    roundness: Optional[float] = Field(None, alias="Roundness")
    solidity: Optional[float] = Field(None, alias="Solidity")
    compactness: Optional[float] = Field(None, alias="Compactness")
    aspect_ratio: Optional[float] = Field(None, alias="Aspect Ratio")
    eccentricity: Optional[float] = Field(None, alias="Eccentricity")
    extent: Optional[float] = Field(None, alias="Extent")
    convex_hull_area: Optional[float] = Field(None, alias="Convex hull(convex area)")

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True

app = FastAPI(
    title="Almond Type Classification API",
    description="Backend API using FastAPI to predict almond type from 12 physical features.",
    version="1.0.0"
)

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global dictionary to hold scikit-learn model components
model_components = {}

@app.on_event("startup")
def load_model():
    global model_components
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: Model file not found at expected path: {MODEL_PATH}")
        raise RuntimeError(f"Model file not found at {MODEL_PATH}")
    try:
        model_components = joblib.load(MODEL_PATH)
        print(f"SUCCESS: Loaded model components from {MODEL_PATH}")
    except Exception as e:
        print(f"ERROR: Failed to load model from {MODEL_PATH}. Exception: {e}")
        raise RuntimeError(f"Failed to load model from {MODEL_PATH}: {str(e)}")

@app.post("/predict")
def predict(features: AlmondFeatures):
    if not model_components:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Please try again in a moment."
        )

    try:
        # Construct feature array mapping None to NaN for the SimpleImputer
        test_features = [
            features.length if features.length is not None else np.nan,
            features.width if features.width is not None else np.nan,
            features.thickness if features.thickness is not None else np.nan,
            features.area if features.area is not None else np.nan,
            features.perimeter if features.perimeter is not None else np.nan,
            features.roundness if features.roundness is not None else np.nan,
            features.solidity if features.solidity is not None else np.nan,
            features.compactness if features.compactness is not None else np.nan,
            features.aspect_ratio if features.aspect_ratio is not None else np.nan,
            features.eccentricity if features.eccentricity is not None else np.nan,
            features.extent if features.extent is not None else np.nan,
            features.convex_hull_area if features.convex_hull_area is not None else np.nan
        ]

        # Convert to pandas DataFrame with the exact column names the imputer expects
        df_input = pd.DataFrame([test_features], columns=[
            'Length (major axis)', 'Width (minor axis)', 'Thickness (depth)', 
            'Area', 'Perimeter', 'Roundness', 'Solidity', 'Compactness', 
            'Aspect Ratio', 'Eccentricity', 'Extent', 'Convex hull(convex area)'
        ])

        # Extract pre-loaded pipeline steps
        imputer = model_components['imputer']
        scaler = model_components['scaler']
        selector = model_components['selector']
        model = model_components['model']
        label_encoder = model_components['label_encoder']

        # Execute the prediction pipeline
        imputed = imputer.transform(df_input)
        scaled = scaler.transform(imputed)
        selected = selector.transform(scaled)
        pred_encoded = model.predict(selected)
        pred_class = label_encoder.inverse_transform(pred_encoded)

        return {"prediction": pred_class[0]}

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Inference pipeline execution error: {str(e)}"
        )

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": bool(model_components),
        "model_path": MODEL_PATH
    }
