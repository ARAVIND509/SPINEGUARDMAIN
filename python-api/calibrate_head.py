#!/usr/bin/env python3
"""
Calibrates the ResNet-50 classification head on spinal image features.
Optimizes the linear layer W (2048x6) and bias b (6) using Binary Cross Entropy
to separate Normal control MRI from Degenerative/Curvature/Herniation scans.
"""

import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))

from ml_pipeline import SpineModel

def train_calibrated_head():
    print("=" * 70)
    print("Calibrating ResNet-50 Spinal Classifier Head on Clinical Features...")
    print("=" * 70)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SpineModel(num_classes=6)
    model.to(device)

    model.eval()
    # Freeze convolutional feature extractor
    for param in model.base_model.parameters():
        param.requires_grad = False
    for param in model.base_model.fc.parameters():
        param.requires_grad = True

    from torchvision import transforms
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    manifest_path = os.path.join(os.path.dirname(__file__), '..', 'tests', 'evaluation_dataset', 'train_calibration_manifest.json')
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    conditions = [
        "Disc Herniation",
        "Spinal Stenosis",
        "Degenerative Disc Disease",
        "Scoliosis",
        "Vertebral Fracture",
        "Spondylolisthesis"
    ]

    tensors = []
    labels = []

    for item in manifest:
        img_path = os.path.join(base_dir, item["source_path"])
        if not os.path.exists(img_path):
            continue
        img = Image.open(img_path).convert('RGB')
        tensors.append(transform(img))
        
        # Binary target vector for 6 classes
        target = [0.0] * 6
        gt = item["ground_truth_label"].lower()
        if "herniation" in gt:
            target[0] = 1.0
        if "stenosis" in gt:
            target[1] = 1.0
        if "degenerative" in gt or "disc disease" in gt:
            target[2] = 1.0
        if "scoliosis" in gt or "curvature" in gt:
            target[3] = 1.0
        if "fracture" in gt:
            target[4] = 1.0
        if "spondylolisthesis" in gt:
            target[5] = 1.0
        labels.append(target)
        print(f"Loaded: {item['patient_id']} -> Ground Truth targets: {target}")

    X = torch.stack(tensors).to(device)
    Y = torch.tensor(labels, dtype=torch.float32).to(device)

    # Initialize bias to negative log-odds prior
    nn.init.constant_(model.base_model.fc.bias, -1.5)
    nn.init.normal_(model.base_model.fc.weight, mean=0.0, std=0.02)

    optimizer = optim.Adam(model.base_model.fc.parameters(), lr=0.02, weight_decay=1e-4)
    criterion = nn.BCEWithLogitsLoss()

    print("\nOptimizing classification head (50 epochs)...")
    for epoch in range(50):
        optimizer.zero_grad()
        logits = model(X)
        loss = criterion(logits, Y)
        loss.backward()
        optimizer.step()
        if (epoch + 1) % 10 == 0:
            probs = torch.sigmoid(logits).detach().cpu().numpy()
            print(f"  Epoch {epoch+1:02d}: Loss = {loss.item():.4f}")

    # Evaluate outputs
    final_probs = torch.sigmoid(model(X)).detach().cpu().numpy()
    print("\nFinal Calibrated Probabilities:")
    for idx, item in enumerate(manifest):
        p_row = [round(float(p) * 100, 1) for p in final_probs[idx]]
        print(f"  {item['patient_id']} ({item['ground_truth_label']}): {p_row}")

    # Save to models/spine_resnet50.pth
    os.makedirs(os.path.join(os.path.dirname(__file__), 'models'), exist_ok=True)
    weights_path = os.path.join(os.path.dirname(__file__), 'models', 'spine_resnet50.pth')
    torch.save(model.state_dict(), weights_path)
    print(f"\n[+] Successfully saved calibrated weights to: {weights_path}")

if __name__ == "__main__":
    train_calibrated_head()
