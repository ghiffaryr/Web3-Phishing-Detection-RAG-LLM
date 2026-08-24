from abc import ABC, abstractmethod


class RAGService(ABC):
   @abstractmethod
   def instance(self) -> None:
      pass

   @abstractmethod
   def initialize_model(self) -> None:
      pass

   @abstractmethod
   def add(self) -> None:
      pass

   @abstractmethod
   def add_batch(self) -> None:
      pass