import json
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments
from torch.utils.data import Dataset
import os

class ReportDataset(Dataset):
    def __init__(self, data_path, tokenizer, max_length=256):
        with open(data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        text = f"Yêu cầu: {item['topic_requirements']} | Báo cáo: {item['report_text']}"
        encoding = self.tokenizer(
            text,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            # Normalize score from 0-10 to 0-1
            'labels': torch.tensor(item['human_score'] / 10.0, dtype=torch.float)
        }

from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = predictions.squeeze()
    
    # Scale back to 0-10
    preds_scaled = predictions * 10
    labels_scaled = labels * 10
    
    mae = mean_absolute_error(labels_scaled, preds_scaled)
    rmse = np.sqrt(mean_squared_error(labels_scaled, preds_scaled))
    
    return {
        "mae": mae,
        "rmse": rmse
    }

def main():
    print("Loading PhoBERT model and tokenizer...")
    model_name = "vinai/phobert-base"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=1)

    dataset_path = os.path.join(os.path.dirname(__file__), "data", "eval_dataset.json")
    print(f"Loading dataset from {dataset_path}...")
    dataset = ReportDataset(dataset_path, tokenizer, max_length=256)

    # Chia train/test split (80/20)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, eval_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])

    training_args = TrainingArguments(
        output_dir='./results',
        num_train_epochs=1,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=3e-5,
        save_strategy='epoch',
        evaluation_strategy='epoch',
        logging_dir='./logs',
        logging_steps=5,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        compute_metrics=compute_metrics,
    )

    print("Starting training...")
    trainer.train()

    print("Saving fine-tuned model...")
    model.save_pretrained("./models/phobert_finetuned")
    tokenizer.save_pretrained("./models/phobert_finetuned")
    print("Training complete! Model saved to ./models/phobert_finetuned")

if __name__ == "__main__":
    main()
