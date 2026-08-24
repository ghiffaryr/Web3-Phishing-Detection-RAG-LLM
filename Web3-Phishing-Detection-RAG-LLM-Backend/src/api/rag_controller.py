import falcon
from utils.config import Config
from utils.decorator import Handler, Form
from service.impl.rag_service_chroma_huggingface_impl import RAGServiceChromaHuggingFaceImpl
import os
import base64


class UploadController:
    @Handler.error
    async def on_post(self, req, resp) -> None:
        form = await req.get_media()
        required_keys = [
            "file_name",
            "file_type",
            "file_size",
            "file_content"
        ]
        default_optional_keys = {}
        form = Form.validator(form, required_keys, default_optional_keys)
        
        if form['file_type'] != "application/pdf":
            msg = 'Please input a PDF file'
            raise falcon.HTTPBadRequest(title='Bad request', description=msg)
        
        # Decode base64 content
        file_content = base64.b64decode(form['file_content'])
        
        save_path = f"{os.getcwd()}/{Config.get().data.path}"
        if not os.path.exists(save_path):
            os.makedirs(save_path)
            
        file_name = form['file_name']
        file_path = os.path.join(save_path, file_name)
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        res = {
            'title': 'File Uploaded',
            'status': '200',
            'description': 'File successfully uploaded.',
            'result': {'file_name': file_name,
                      'file_path': file_path}
        }
        resp.media = res

class UpdateChromaDatabaseController:
    @Handler.error
    async def on_post(self, req, resp) -> None:
        form = await req.get_media()
        required_keys = [
            "file_path"
        ]
        default_optional_keys = {}
        form = Form.validator(form, required_keys, default_optional_keys)
        RAGServiceChromaHuggingFace = RAGServiceChromaHuggingFaceImpl.instance()
        RAGServiceChromaHuggingFace.add(file_path=form['file_path'])

        res = {
        'title': 'Chroma DB Updated',
        'status': '200',
        'description': 'File successfully vectorized to Chroma DB.'
        }
        resp.media = res

class BatchUpdateChromaDatabaseController:
    @Handler.error
    async def on_post(self, req, resp) -> None:    
        RAGServiceChromaHuggingFace = RAGServiceChromaHuggingFaceImpl.instance()
        RAGServiceChromaHuggingFace.add_batch()
        
        res = {
        'title': 'Chroma DB Updated',
        'status': '200',
        'description': f'All data in {Config.get().data.path} successfully vectorized to Chroma DB.'
        }
        resp.media = res

class GenerateContextFromChromaDatabaseController:
    @Handler.error
    async def on_post(self, req, resp) -> None:
        form = await req.get_media()
        required_keys = [
            "query_text"
        ]
        default_optional_keys = {
            "k": 5,
            "separator": "\n\n---\n\n"
        }
        form = Form.validator(form, required_keys, default_optional_keys)
        RAGServiceChromaHuggingFace = RAGServiceChromaHuggingFaceImpl.instance()
        generated_context = RAGServiceChromaHuggingFace.generate_context(query_text=form['query_text'],
                                                        k=form['k'],
                                                        separator=form['separator'])
        res = {
        'title': 'Context Generated',
        'status': '200',
        'description': f'Context generated with k={form["k"]} and separator={form["separator"]}.',
        'result': {
            "generated_context": generated_context
            }
        }
        resp.media = res

class ProcessAndGetContextController:
    @Handler.error
    async def on_post(self, req, resp) -> None:
        form = await req.get_media()
        required_keys = [
            "file_path",
            "query_text"
        ]
        default_optional_keys = {
            "k": 5,
            "separator": "\n\n---\n\n"
        }
        form = Form.validator(form, required_keys, default_optional_keys)
        
        # Get RAG service instance
        RAGServiceChromaHuggingFace = RAGServiceChromaHuggingFaceImpl.instance()
        
        # Step 1: Update database with file
        RAGServiceChromaHuggingFace.add(file_path=form['file_path'])
        
        # Step 2: Generate context
        generated_context = RAGServiceChromaHuggingFace.generate_context(
            query_text=form['query_text'],
            k=form['k'],
            separator=form['separator']
        )
        
        res = {
            'title': 'File Processed',
            'status': '200',
            'description': 'File successfully processed and context generated',
            'result': {
                "generated_context": generated_context
            }
        }
        resp.media = res