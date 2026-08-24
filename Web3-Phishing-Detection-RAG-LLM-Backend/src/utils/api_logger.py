import sys
import os

from loguru import logger
from utils.config import Config


DEFAULT_LOGURU_FORMAT = "<green>{time}</green>\t<cyan>{file}</cyan>:<cyan>{line}</cyan>\tPID:{process}\t<level>{level}</level>\t<level>{message}</level>"
ACCESS_LEVEL = logger.level("ACCESS", no=35, color="<yellow>", icon="🐍")
QUEUE_LEVEL = logger.level("QUEUE", no=35, color="<yellow>", icon="🐍")


class APILogger:
    _instance = None

    def __init__(self):
        raise RuntimeError('Call instance() instead')

    @classmethod
    def instance(cls):
        if cls._instance is None:
            cls._instance = cls.__new__(cls)
            log_dir = Config.get().log.path
            if not os.path.exists(log_dir):
                os.makedirs(log_dir)
            log_path = log_dir + "/log.txt"
            all_log_path = log_dir + "/log_debugging.txt"
            log_format = os.environ.get("LOGURU_FORMAT", DEFAULT_LOGURU_FORMAT)
            logger.remove()
            if str(os.environ.get("PRODUCTION", 0)) != "1":
                logger.add(sys.stdout, colorize=True,
                        format=log_format, enqueue=True)
            logger.add(str(log_path), format=log_format,
                       level="INFO", enqueue=True)
            logger.add(str(all_log_path), format=log_format, 
                       level="DEBUG", enqueue=True)
            cls._instance.path = log_path
            cls._instance.format = log_format

        return cls._instance

    def set_up(self):
        return self.path

    def trace(self, *args, **kwargs):
        # level: 5
        logger.trace(*args, **kwargs)

    def debug(self, *args, **kwargs):
        # level: 10
        logger.debug(*args, **kwargs)

    def info(self, *args, **kwargs):
        # level: 20
        logger.info(*args, **kwargs)

    def success(self, *args, **kwargs):
        # level: 25
        logger.success(*args, **kwargs)

    def warning(self, *args, **kwargs):
        # level: 30
        logger.warning(*args, **kwargs)

    def access(self, *args, **kwargs):
        # level: 35
        logger.info(*args, **kwargs)
        # logger.log(ACCESS_LEVEL.name, *args, **kwargs)

    def queue(self, *args, **kwargs):
        # level: 35
        logger.log(QUEUE_LEVEL.name, *args, **kwargs)
    
    def error(self, *args, **kwargs):
        # level: 40
        logger.error(*args, **kwargs)

    def critical(self, *args, **kwargs):
        # level: 50
        logger.critical(*args, **kwargs)