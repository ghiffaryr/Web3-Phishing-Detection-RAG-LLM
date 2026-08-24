from pathlib import Path
import yaml
from munch import munchify
import os


class Config:
    def get():
        file = open(Path.cwd() / 'resources/config.yml', 'r')
        config = yaml.safe_load(file)
        config.update(dict(os.environ))
        return munchify(config)