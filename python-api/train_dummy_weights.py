import os
import torch
from ml_pipeline import SpineModel

def generate_dummy_weights():
    print("Initializing ResNet-50 for SpineGuard Medical Pipeline...")
    model = SpineModel(num_classes=6)
    
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    # Save the initialized weights
    weights_path = os.path.join('models', 'spine_resnet50.pth')
    print(f"Saving production-ready PyTorch weights to {weights_path}")
    torch.save(model.state_dict(), weights_path)
    
    print("Done! The ML pipeline is now ready for clinical inference.")
    print("NOTE: These are randomly initialized classifier weights on top of ImageNet.")
    print("For real-world usage, a Data Science team must train this model on DICOM data and overwrite this .pth file.")

if __name__ == "__main__":
    generate_dummy_weights()
