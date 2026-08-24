from abc import ABC, abstractmethod
from typing import Optional

class ModelService(ABC):
    @abstractmethod
    def instance(self) -> None:
        pass

    @abstractmethod
    def generate(self,
                prompt: str,
                context: Optional[int] = "") -> dict:
        pass