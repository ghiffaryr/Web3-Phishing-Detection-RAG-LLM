import falcon
from utils.decorator import Handler, Form
from utils.gpu_check import check_gpu

class StatusController:
    @Handler.error
    async def on_get(self, req, resp) -> None:
        res = {
            'title': 'Status Check',
            'status': '200',
            'description': 'Service is running.'
        }
        resp.media = res

class GPUCheckController:
    @Handler.error
    async def on_get(self, req, resp) -> None:
        gpu_info = check_gpu()
        res = {
            'title': 'GPU Check',
            'status': '200',
            'description': 'GPU check successful.',
            'result': gpu_info
        }
        resp.media = res