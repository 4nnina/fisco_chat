import logging
from logging import Logger

logFile: str = "logs/app.log"

# available logging types: DEBUG INFO WARNING ERROR CRITICAL

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(name)s: %(message)s',
    handlers=[
        logging.FileHandler(logFile, mode="a"),
        logging.StreamHandler()
    ]
)

logger: Logger = logging.getLogger("backend")
