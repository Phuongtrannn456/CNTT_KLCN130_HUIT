import json
import torch
import os
import numpy as np
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from datetime import datetime
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def evaluate_model(predictions, ground_truth):
    """
    Evaluate the model predictions against ground truth scores.
    """
    mae = mean_absolute_error(ground_truth, predictions)
    rmse = np.sqrt(mean_squared_error(ground_truth, predictions))
    r2 = r2_score(ground_truth, predictions)

    print(f"--- EVALUATION RESULTS ---")
    print(f"MAE  (Mean Absolute Error): {mae:.4f}")
    print(f"RMSE (Root Mean Sq Error) : {rmse:.4f}")
    print(f"R²   (R-squared)          : {r2:.4f}")
    print(f"--------------------------")

    results = {
        'model': 'vinai/phobert-base (fine-tuned)',
        'dataset_size': len(ground_truth),
        'metrics': {
            'mae': round(mae, 4),
            'rmse': round(rmse, 4),
            'r2_score': round(r2, 4)
        },
        'timestamp': datetime.now().isoformat()
    }

    with open('evaluation_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("Saved results to evaluation_results.json")

def main():
    model_path = "./models/phobert_finetuned"
    dataset_path = "./data/eval_dataset.json"

    if not os.path.exists(model_path):
        print(f"Model chưa được train! Hãy chạy python train.py trước.")
        return

    print("Loading fine-tuned model...")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path)
    model.eval()

    print(f"Loading test data from {dataset_path}...")
    with open(dataset_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    ground_truth = []
    predictions = []

    print("Chạy dự đoán...")
    with torch.no_grad():
        for i, item in enumerate(data):
            text = f"Yêu cầu: {item['topic_requirements']} | Báo cáo: {item['report_text']}"
            inputs = tokenizer(text, max_length=256, padding='max_length', truncation=True, return_tensors='pt')
            outputs = model(**inputs)
            
            # Mô hình dự đoán scale 0-1, nhân 10 để ra điểm 0-10
            pred_score = outputs.logits.squeeze().item() * 10.0
            pred_score = max(0.0, min(10.0, pred_score))
            
            ground_truth.append(item['human_score'])
            predictions.append(pred_score)
            
            if i % 10 == 0:
                print(f"[{i}/{len(data)}] Processed. Real: {item['human_score']} - Predict: {pred_score:.1f}")

    evaluate_model(predictions, ground_truth)

if __name__ == "__main__":
    main()
