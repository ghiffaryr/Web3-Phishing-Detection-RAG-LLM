from typing import Optional, List
import os
from loguru import logger
from utils.config import Config
from service.rag_service import RAGService
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.schema.document import Document
from langchain_community.vectorstores import Chroma


class RAGServiceChromaHuggingFaceImpl(RAGService):

    _instance = None

    def __init__(self):
        raise RuntimeError('Call instance() instead')
    
    @classmethod
    def instance(cls, 
                 collection_name: Optional[str]= "langchain"):
        if cls._instance != None:
            if collection_name != cls._instance.collection_name:
                del cls._instance.db
                cls._instance = None
        if cls._instance is None:
            cls._instance = cls.__new__(cls)
            cls._instance.db = None
            cls._instance._init_instance(collection_name=collection_name)
        return cls._instance

    def _init_instance(self, 
                        collection_name: Optional[str]= "langchain",
                        ) -> None:
        self.chunk_size = Config.get().chroma.splitter.chunk_size
        self.chunk_overlap = Config.get().chroma.splitter.chunk_overlap
        self.separators = Config.get().chroma.splitter.separators
        self.is_separator_regex = Config.get().chroma.splitter.is_separator_regex
        self.collection_name = collection_name
        self.data_path = self.initialize_folder(Config.get().data.path)
        self.chroma_path = self.initialize_folder(Config.get().chroma.path)
        self.initialize_model(model_name=Config.get().embeddings.model.name,
                            model_kwargs=dict(Config.get().embeddings.model.kwargs))
        self.initialize_db(chroma_path=self.chroma_path, 
                           embedding_function=self.model,
                           collection_name=collection_name)
      
    def initialize_model(self, 
                         model_name: str, 
                         model_kwargs: str) -> any:
        self.model = HuggingFaceEmbeddings(model_name=model_name,
                                       model_kwargs=model_kwargs)
    
    def initialize_folder(self, 
                          name: str, 
                          parent_path: Optional[str] = os.getcwd()) -> str:
        target_dir = parent_path + f"/{name}"
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
        return target_dir
    
    def initialize_db(self, 
                      chroma_path: str, 
                      embedding_function: str,
                      collection_name: str = "langchain") -> any:
        self.db = Chroma(
            persist_directory=chroma_path, embedding_function=embedding_function, collection_name=collection_name
        )
    
    def load_document(self, 
                      file_path: str) -> List[Document]:
        document_loader = PyPDFLoader(file_path)
        return document_loader.load()
    
    def load_document_batch(self, 
                            folder_path: str) -> List[Document]:
        document_loader = PyPDFDirectoryLoader(folder_path)
        return document_loader.load()
    
    def split_documents(self, 
                        documents: List[Document]):
        text_splitter = RecursiveCharacterTextSplitter(
            separators=self.separators,
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            is_separator_regex=self.is_separator_regex,
        )
        return text_splitter.split_documents(documents)
    
    def calculate_chunk_ids(self, 
                            chunks: List) -> any:
        # This will create IDs like "data/monopoly.pdf:6:2"
        # Page Source : Page Number : Chunk Index

        last_page_id = None
        current_chunk_index = 0

        for chunk in chunks:
            source = chunk.metadata.get("source")
            page = chunk.metadata.get("page")
            current_page_id = f"{source}:{page}"

            # If the page ID is the same as the last one, increment the index.
            if current_page_id == last_page_id:
                current_chunk_index += 1
            else:
                current_chunk_index = 0

            # Calculate the chunk ID.
            chunk_id = f"{current_page_id}:{current_chunk_index}"
            last_page_id = current_page_id

            # Add it to the page meta-data.
            chunk.metadata["id"] = chunk_id

        return chunks
    
    def update_database(self, 
                      chunks: List[Document]):
        # Calculate Page IDs.
        chunks_with_ids = self.calculate_chunk_ids(chunks)

        # Add or Update the documents.
        existing_items = self.db.get(include=[])  # IDs are always included by default
        existing_ids = set(existing_items["ids"])
        logger.info(f"Number of existing documents in DB: {len(existing_ids)}")

        # Only add documents that don't exist in the DB.
        new_chunks = []
        for chunk in chunks_with_ids:
            if chunk.metadata["id"] not in existing_ids:
                new_chunks.append(chunk)

        if len(new_chunks):
            logger.info(f"Adding new documents: {len(new_chunks)}")
            new_chunk_ids = [chunk.metadata["id"] for chunk in new_chunks]
            self.db.add_documents(new_chunks, ids=new_chunk_ids)
        else:
            logger.info("No new documents to add")
    
    def add(self, 
            file_path: str):
        documents = self.load_document(file_path=file_path)
        chunks = self.split_documents(documents)
        self.update_database(chunks)
    
    def add_batch(self):
        documents = self.load_document_batch(folder_path=self.data_path)
        chunks = self.split_documents(documents)
        self.update_database(chunks)

    def generate_context(self, 
                         query_text: str, 
                         k: int = 5,
                         separator: str = "\n\n---\n\n") -> str:
        results = self.db.similarity_search_with_score(query_text, k=5)
        return separator.join([doc.page_content for doc, _score in results])