import numpy as np
import random
import torch


def set_seed(number) -> None:
    """Fix random seeds"""
    random.seed(number)
    np.random.seed(number)
    torch.manual_seed(number)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(number)