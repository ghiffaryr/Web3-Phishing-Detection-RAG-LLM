from api.rag_controller import (
    UploadController,
    UpdateChromaDatabaseController,
    BatchUpdateChromaDatabaseController,
    GenerateContextFromChromaDatabaseController,
    ProcessAndGetContextController
)
from api.model_controller import ModelGenerateController

# Define all API routes
ROUTES = {
    '/model/generate': ModelGenerateController(),
    '/file/upload': UploadController(),
    '/rag/update': UpdateChromaDatabaseController(),
    '/rag/update_batch': BatchUpdateChromaDatabaseController(),
    '/rag/context': GenerateContextFromChromaDatabaseController(),
    '/rag/process-and-get-context': ProcessAndGetContextController(),
}