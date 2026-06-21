import React, { useState } from 'react';

const API_BASE_URL = 'https://adequate-compassion-production-88d5.up.railway.app';

const PRESETS = {
  MAMRA: {
    length: 321.81,
    width: 171.56,
    thickness: 100.8,
    area: 27854.95,
    perimeter: 806.45,
    roundness: 0.40,
    solidity: 0.94,
    compactness: 2.10,
    aspect_ratio: 1.92,
    eccentricity: 0.85,
    extent: 0.71,
    convex_hull_area: 29593.05
  },
  SANORA: {
    length: 240.53,
    width: 144.57,
    thickness: 115.37,
    area: 26640.50,
    perimeter: 648.26,
    roundness: 0.5863,
    solidity: 0.9877,
    compactness: 1.2553,
    aspect_ratio: 1.6638,
    eccentricity: 0.7992,
    extent: 0.7660,
    convex_hull_area: 26973.50
  },
  REGULAR: {
    length: 304.60,
    width: 166.93,
    thickness: 112.33,
    area: 39379.50,
    perimeter: 815.51,
    roundness: 0.5404,
    solidity: 0.9865,
    compactness: 1.3439,
    aspect_ratio: 1.8248,
    eccentricity: 0.8365,
    extent: 0.7690,
    convex_hull_area: 39916.50
  }
};

const CLASS_DESCRIPTIONS = {
  MAMRA: {
    title: 'Mamra Almond',
    desc: 'Premium almond type characterized by its elongated, narrow, and slightly curved structure. Historically highly prized, Mamra almonds contain higher oil levels and are distinctively crunchier. Our model associates them with higher Aspect Ratio (1.92), lower Roundness (0.40), and higher Compactness (2.10).',
    colorClass: 'mamra'
  },
  SANORA: {
    title: 'Sanora Almond',
    desc: 'Californian-origin almond, highly regarded for its lighter color, smooth surface, and uniform flat shape. It has slightly thicker characteristics. The dataset indicates they generally exhibit larger Width (180.12) and Thickness (115.37) along with moderate roundness.',
    colorClass: 'sanora'
  },
  REGULAR: {
    title: 'Regular Almond',
    desc: 'Standard classification representing traditional market almond varieties. They feature a balanced shape with average area (~24k), solid surface structures (Solidity of 0.97), and moderate aspect ratios.',
    colorClass: 'regular'
  }
};

// Max values across Dataset_9 to scale visual comparison bars
const MAX_VALUES = {
  length: 515.35,
  width: 258.57,
  thickness: 181.85,
  area: 89282.0,
  perimeter: 1864.95,
  roundness: 0.697,
  solidity: 0.993,
  compactness: 9.66,
  aspect_ratio: 2.73,
  eccentricity: 0.931,
  extent: 0.846,
  convex_hull_area: 90642.5
};

const FIELD_LABELS = {
  length: { name: 'Length (Major Axis)', tooltip: 'The distance along the maximum length of the almond (pixels/units).' },
  width: { name: 'Width (Minor Axis)', tooltip: 'The distance across the maximum width of the almond (pixels/units).' },
  thickness: { name: 'Thickness (Depth)', tooltip: 'The depth or thickness of the almond seed.' },
  area: { name: 'Area', tooltip: 'Total number of pixels/surface area within the almond boundary.' },
  perimeter: { name: 'Perimeter', tooltip: 'The length of the boundary enclosing the almond.' },
  roundness: { name: 'Roundness', tooltip: 'Measure of how close the shape is to a perfect circle (0 to 1).' },
  solidity: { name: 'Solidity', tooltip: 'Ratio of the almond area to its convex hull area.' },
  compactness: { name: 'Compactness', tooltip: 'Degree of structural packing (perimeter squared divided by area).' },
  aspect_ratio: { name: 'Aspect Ratio', tooltip: 'Ratio of length (major axis) to width (minor axis).' },
  eccentricity: { name: 'Eccentricity', tooltip: 'Measure of the shape deviation from circularity.' },
  extent: { name: 'Extent', tooltip: 'Ratio of the area of the almond to its bounding box area.' },
  convex_hull_area: { name: 'Convex Hull Area', tooltip: 'The area of the smallest convex polygon enclosing the almond.' }
};

export default function App() {
  const [formData, setFormData] = useState({
    length: '',
    width: '',
    thickness: '',
    area: '',
    perimeter: '',
    roundness: '',
    solidity: '',
    compactness: '',
    aspect_ratio: '',
    eccentricity: '',
    extent: '',
    convex_hull_area: ''
  });

  const [activePreset, setActivePreset] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setActivePreset(null);

    // Dynamic Validation: Must be a positive number
    if (val === '') {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
      return;
    }

    const numVal = parseFloat(val);
    if (isNaN(numVal) || numVal <= 0) {
      setValidationErrors(prev => ({ ...prev, [field]: 'Must be a positive number' }));
    } else {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const loadPreset = (name) => {
    const presetData = PRESETS[name];
    if (presetData) {
      const stringData = {};
      Object.keys(presetData).forEach(k => {
        stringData[k] = presetData[k].toString();
      });
      setFormData(stringData);
      setActivePreset(name);
      setValidationErrors({});
      setError(null);
    }
  };

  const resetForm = () => {
    setFormData({
      length: '',
      width: '',
      thickness: '',
      area: '',
      perimeter: '',
      roundness: '',
      solidity: '',
      compactness: '',
      aspect_ratio: '',
      eccentricity: '',
      extent: '',
      convex_hull_area: ''
    });
    setActivePreset(null);
    setValidationErrors({});
    setPrediction(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPrediction(null);
    setError(null);

    // Validate all fields before sending
    const errors = {};
    Object.keys(formData).forEach(key => {
      const val = formData[key];
      if (val === '') {
        // We can allow some empty values since the imputer can handle it
        return;
      }
      const numVal = parseFloat(val);
      if (isNaN(numVal) || numVal <= 0) {
        errors[key] = 'Must be a positive number';
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please resolve all validation errors in red before submitting.');
      return;
    }

    // Prepare JSON payload matching FastAPI models
    // Convert inputs to numeric values or null for empty fields
    const payload = {};
    Object.keys(formData).forEach(key => {
      const aliasName = FIELD_LABELS[key].name; // Or let FastAPI map standard keys
      const val = formData[key];
      payload[key] = val !== '' ? parseFloat(val) : null;
    });

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Prediction failed. The server returned an error.');
      }

      const result = await response.json();
      setPrediction(result.prediction);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to connect to the backend. Please ensure the FastAPI server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Almond Type Classifier</h1>
        <p className="app-subtitle">
          Input physical measurements extracted from image processing to classify the almond variety into Mamra, Sanora, or Regular using our Random Forest classifier.
        </p>
      </header>

      <main className="dashboard-grid">
        {/* Left Side: Parameters Form */}
        <section className="glass-card">
          <h2>
            <span>⚙️</span> Almond Measurements
          </h2>

          <div className="presets-container">
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Presets:</span>
            <button
              type="button"
              className={`preset-btn ${activePreset === 'MAMRA' ? 'active' : ''}`}
              onClick={() => loadPreset('MAMRA')}
            >
              Mamra Average
            </button>
            <button
              type="button"
              className={`preset-btn ${activePreset === 'SANORA' ? 'active' : ''}`}
              onClick={() => loadPreset('SANORA')}
            >
              Sanora Average
            </button>
            <button
              type="button"
              className={`preset-btn ${activePreset === 'REGULAR' ? 'active' : ''}`}
              onClick={() => loadPreset('REGULAR')}
            >
              Regular Average
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Group 1: Size & Area */}
              <div style={{ gridColumn: 'span 2', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                Size & Area Dimensions
              </div>

              {['length', 'width', 'thickness', 'area', 'perimeter', 'convex_hull_area'].map((key) => (
                <div className="form-group" key={key}>
                  <label className="form-label" htmlFor={key}>
                    {FIELD_LABELS[key].name}
                    <span className="tooltip-icon" title={FIELD_LABELS[key].tooltip}>?</span>
                  </label>
                  <div className="form-input-wrapper">
                    <input
                      id={key}
                      type="text"
                      className="form-input"
                      style={validationErrors[key] ? { borderColor: '#ef4444', boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)' } : {}}
                      placeholder="Empty (Imputed)"
                      value={formData[key]}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                    />
                  </div>
                </div>
              ))}

              {/* Group 2: Shape & Surface */}
              <div style={{ gridColumn: 'span 2', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                Shape & Surface Characteristics
              </div>

              {['roundness', 'solidity', 'compactness', 'aspect_ratio', 'eccentricity', 'extent'].map((key) => (
                <div className="form-group" key={key}>
                  <label className="form-label" htmlFor={key}>
                    {FIELD_LABELS[key].name}
                    <span className="tooltip-icon" title={FIELD_LABELS[key].tooltip}>?</span>
                  </label>
                  <div className="form-input-wrapper">
                    <input
                      id={key}
                      type="text"
                      className="form-input"
                      style={validationErrors[key] ? { borderColor: '#ef4444', boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)' } : {}}
                      placeholder="Empty (Imputed)"
                      value={formData[key]}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                    />
                  </div>
                </div>
              ))}

              {/* Reset/Submit */}
              <div className="actions-container">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Clear Form
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="spinner"></div> Classifying...
                    </>
                  ) : (
                    'Predict Almond Type'
                  )}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="toast-error">
              <span className="toast-error-icon">!</span>
              <div>{error}</div>
            </div>
          )}
        </section>

        {/* Right Side: Prediction Results Dashboard */}
        <section className="glass-card">
          <h2>
            <span>📊</span> Classification Dashboard
          </h2>

          <div className="results-container">
            {!prediction && !isLoading && (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">🌱</div>
                <h3>Awaiting Measurements</h3>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  Select one of the quick presets on the left, or input custom values, then click <strong>Predict Almond Type</strong> to see details.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="result-placeholder" style={{ borderStyle: 'solid' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', marginBottom: '1.5rem' }}></div>
                <h3>Running Inference</h3>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  Processing dimensions and executing the Multi-Class Random Forest classifier...
                </p>
              </div>
            )}

            {prediction && !isLoading && (
              <>
                {/* Badge Card */}
                <div className={`prediction-box ${CLASS_DESCRIPTIONS[prediction].colorClass}`}>
                  <span className="prediction-label">Prediction Result</span>
                  <div className={`prediction-text ${CLASS_DESCRIPTIONS[prediction].colorClass}`}>
                    {prediction}
                  </div>
                  <p className="prediction-desc">
                    {CLASS_DESCRIPTIONS[prediction].desc}
                  </p>
                </div>

                {/* Feature Comparison */}
                <div className="comparison-section">
                  <div className="comparison-header">
                    Comparison to {CLASS_DESCRIPTIONS[prediction].title} Averages
                  </div>
                  <div className="chart-bar-container">
                    {[
                      { key: 'area', label: 'Area' },
                      { key: 'length', label: 'Length' },
                      { key: 'width', label: 'Width' },
                      { key: 'solidity', label: 'Solidity' },
                      { key: 'aspect_ratio', label: 'Aspect Ratio' }
                    ].map((item) => {
                      const userVal = parseFloat(formData[item.key]);
                      const targetVal = PRESETS[prediction][item.key];
                      const maxVal = MAX_VALUES[item.key];

                      const userPercent = isNaN(userVal) ? 0 : Math.min(100, (userVal / maxVal) * 100);
                      const targetPercent = Math.min(100, (targetVal / maxVal) * 100);

                      return (
                        <div className="chart-bar-item" key={item.key}>
                          <div className="chart-bar-label">
                            <span>{item.label}</span>
                            <span>
                              User: {isNaN(userVal) ? 'NaN' : userVal.toFixed(2)} | Avg: {targetVal.toFixed(2)}
                            </span>
                          </div>

                          {/* User Bar */}
                          <div className="chart-bar-bg">
                            <div
                              className="chart-bar-fill user"
                              style={{ width: `${userPercent}%` }}
                            ></div>
                          </div>

                          {/* Average Bar */}
                          <div className="chart-bar-bg" style={{ height: '4px', marginTop: '-4px', opacity: 0.75 }}>
                            <div
                              className="chart-bar-fill target"
                              style={{ width: `${targetPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        &copy; {new Date().getFullYear()} Almond Classification System | Production ML Dashboard
      </footer>
    </div>
  );
}
