import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os
import cv2
import numpy as np
import base64

class SpineModel(nn.Module):
    def __init__(self, num_classes=6):
        super(SpineModel, self).__init__()
        self.base_model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        num_ftrs = self.base_model.fc.in_features
        self.base_model.fc = nn.Linear(num_ftrs, num_classes)
        
        # Hooks for Grad-CAM
        self.gradients = None
        self.activations = None
        
        # Register hooks on the last convolutional layer (layer4)
        target_layer = self.base_model.layer4[-1]
        target_layer.register_forward_hook(self.save_activation)
        target_layer.register_full_backward_hook(self.save_gradient)
        
    def save_activation(self, module, input, output):
        self.activations = output

    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
        
    def forward(self, x):
        # Return raw logits for Grad-CAM backward pass
        return self.base_model(x)

class SpineInferencePipeline:
    def __init__(self, weights_path=None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = SpineModel(num_classes=6)
        
        if weights_path and os.path.exists(weights_path):
            self.model.load_state_dict(torch.load(weights_path, map_location=self.device, weights_only=True))
            print(f"Successfully loaded trained weights from {weights_path}")
        else:
            print(f"Warning: No trained weights found at {weights_path}. Using default weights.")
            
        self.model.to(self.device)
        self.model.eval()
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        self.conditions = [
            "Disc Herniation",
            "Spinal Stenosis",
            "Degenerative Disc Disease",
            "Scoliosis",
            "Vertebral Fracture",
            "Spondylolisthesis"
        ]

    def generate_heatmap(self, target_class_idx, original_image):
        if self.model.gradients is None or self.model.activations is None:
            return None
            
        gradients = self.model.gradients.cpu().data.numpy()[0]
        activations = self.model.activations.cpu().data.numpy()[0]
        
        # Global average pooling on gradients
        weights = np.mean(gradients, axis=(1, 2))
        
        # Weight the channels
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]
            
        # ReLU to keep only positive influence
        cam = np.maximum(cam, 0)
        
        # Normalize
        cam = cv2.resize(cam, (original_image.width, original_image.height))
        cam = cam - np.min(cam)
        cam_max = np.max(cam)
        if cam_max != 0:
            cam = cam / cam_max
            
        # Convert to RGB heatmap
        heatmap = np.uint8(255 * cam)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        # Convert to base64
        _, buffer = cv2.imencode('.png', heatmap)
        base64_heatmap = base64.b64encode(buffer).decode('utf-8')
        
        return base64_heatmap

    def predict(self, pil_image):
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
            
        input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)
        
        # Enable gradients for Grad-CAM
        self.model.train() # Need gradients, so temporarily turn off eval strictly for backward
        for param in self.model.parameters():
            param.requires_grad = True
            
        self.model.zero_grad()
        outputs = self.model(input_tensor)
        
        # Get probabilities for JSON output
        probabilities = torch.sigmoid(outputs).squeeze().detach().cpu().numpy()
        
        # Find the class with the highest probability
        target_class = np.argmax(probabilities)
        
        # Backward pass for Grad-CAM
        one_hot = torch.zeros_like(outputs)
        one_hot[0][target_class] = 1
        outputs.backward(gradient=one_hot, retain_graph=True)
        
        # Generate heatmap based on gradients
        base64_heatmap = self.generate_heatmap(target_class, pil_image)
            
        results = {}
        for i, condition in enumerate(self.conditions):
            confidence = float(probabilities[i]) * 100
            
            if confidence > 85:
                severity = "severe"
            elif confidence > 70:
                severity = "moderate"
            elif confidence > 50:
                severity = "mild"
            else:
                severity = "normal"
                
            results[condition] = {
                "confidence": round(confidence, 1),
                "severity": severity
            }
            
        return results, base64_heatmap, self.conditions[target_class]

_pipeline = None

def get_pipeline():
    global _pipeline
    if _pipeline is None:
        weights_file = os.path.join(os.path.dirname(__file__), 'models', 'spine_resnet50.pth')
        _pipeline = SpineInferencePipeline(weights_file)
    return _pipeline

def run_ml_inference(image_path):
    pipeline = get_pipeline()
    img = Image.open(image_path)
    return pipeline.predict(img)
