import falcon.asgi
import uvicorn
from api import ROUTES
from __init__ import __version__
from utils.config import Config
import os
from loguru import logger
from utils.api_logger import APILogger
from service.impl.rag_service_chroma_huggingface_impl import RAGServiceChromaHuggingFaceImpl

DEFAULT_PREFIX = "/api/v0"
try:
    PREFIX = Config.get()['server']['servlet']['context_path']
except Exception as e:
    logger.debug(f"Context path is not defined!")
    logger.info(f"Using default prefix...")
    PREFIX = DEFAULT_PREFIX

HOST = os.environ.get('HOST', '0.0.0.0')
PORT = os.environ.get('PORT', '8000')

StartApplication = falcon.asgi.App(cors_enable=True)

# Initialize model
RAGServiceChromaHuggingFaceImpl.instance()

APILogger.instance().set_up()

for route, service in ROUTES.items():
    StartApplication.add_route(PREFIX + route, service)

if __name__ == '__main__':
    StartApplication.run(host=HOST, port=PORT, reload=True)