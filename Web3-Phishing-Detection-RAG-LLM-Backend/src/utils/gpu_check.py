import torch

def check_gpu():
    cuda_available = torch.cuda.is_available()
    device_count = torch.cuda.device_count()
    devices = []

    if cuda_available:
        for i in range(device_count):
            device_info = {
                'device_id': i,
                'device_name': torch.cuda.get_device_name(i)
            }
            devices.append(device_info)
    
    return {
        'cuda_available': cuda_available,
        'device_count': device_count,
        'devices': devices
    }