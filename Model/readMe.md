# 🧪 MLChem Tools – Machine Learning Model Integration Guide

This repository contains the Machine Learning (ML) assets used to classify computational chemistry literature into one of three primary methodologies: **DFT**, **MD**, or **COSMO-RS** based on academic text input.

This documentation is intended for the web application development team (Frontend, Backend, and UI) to facilitate integration of the trained model into the prediction system and user interface.

---

## 📦 1. Model Artifacts (Deployment Assets)

All components required for inference are bundled into a single serialized binary file to ensure deployment consistency and simplify system integration.

**File Name:** `production_chemistry_classifier.pkl`

**Bundle Contents (Dictionary Keys):**

* **`"pipeline"`**: A `sklearn.pipeline.Pipeline` object containing both the trained **TF-IDF Vectorizer** and the final machine learning classifier selected during model evaluation.
* **`"label_encoder"`**: A `LabelEncoder` object used to convert the model's numerical predictions (`0`, `1`, `2`) back into their corresponding class labels (`DFT`, `MD`, `COSMO-RS`).
* **`"model_name"`**: A string indicating the name of the selected model architecture for documentation and logging purposes.

---

## 🚀 2. Loading and Using the Model in the Backend (Python)

Ensure that the backend environment has the required dependencies installed, including `scikit-learn` and `joblib`.

The frontend/backend team does **not** need to perform TF-IDF feature extraction manually, as the preprocessing pipeline is already embedded within the serialized model object.

### Example Inference Workflow

```python
import joblib

# 1. Load the serialized model artifacts
artifacts = joblib.load("production_chemistry_classifier.pkl")
model_pipeline = artifacts["pipeline"]
label_encoder = artifacts["label_encoder"]

# 2. Prepare raw text input received from the user interface
# The model expects four text components concatenated using " . " as a separator.
property_input = "Gibbs free energy"
sub_property_input = "Solubility"
application_domain = "Gas separation"
system_type = "Ionic liquids"

# Construct the input text using the same format employed during model training
constructed_text = (
    f"{property_input} . {sub_property_input} . "
    f"{application_domain} . {system_type}"
)

# 3. Perform inference
# The model accepts a list (or array) containing raw text strings.
predicted_numeric = model_pipeline.predict([constructed_text])

# 4. Convert the numerical prediction back to the original class label
predicted_class = label_encoder.inverse_transform(predicted_numeric)[0]

print(f"Predicted Methodology: {predicted_class}")

# Example output:
# "COSMO-RS"
# "DFT"
# "MD"
```
