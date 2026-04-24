
from database.manager import Query, init_db
from pydantic import BaseModel
from database.manager import Query
from logs.logConfig import logger
import bcrypt, datetime as dt, json
import secrets, os, pandas as pd


class TokenInput(BaseModel):
    token: str

class LoginInput(BaseModel):
    username: str
    password: str

class RegisterInfo(BaseModel):
    username: str
    password: str
    regime: str | None = None
    cassa: str | None = None
    commercialista_key: str | None = None
    vat_opening_date: str | None = None
    role: str = "user"

class BaseUserInfo(BaseModel):
    username: str
    password: str | None = None
    regime: str | None = None
    cassa: str | None = None
    commercialista_key: str | None = None
    vat_opening_date: str | None = None
    role: str = "user"

class DeleteInput(BaseModel):
    id: int

class ExplainInfo(BaseModel):
    prompt: str
    model: str = "gpt-4"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatInfo(BaseModel):
    message: str
    model: str | None = None
    token: str | None = None
    history: list[ChatMessage] = []
    conversation_id: str | None = None
    new_conversation: bool = False


class ChatConfigInput(BaseModel):
    model: str
    temperature: float
    max_history: int
    system_prompt_template: str
    tone_of_voice: str


class UserProfileInput(BaseModel):
    username: str
    password: str
    regime: str
    cassa: str
    commercialista_export_key: str
    vat_opening_date: str


class UserRevenueInput(BaseModel):
    username: str
    year: int
    revenue: float


class UserSelfProfileInput(BaseModel):
    username: str
    password: str | None = None
    regime: str | None = None
    cassa: str | None = None
    commercialista_export_key: str | None = None
    vat_opening_date: str | None = None


class CommercialistaInput(BaseModel):
    name: str
    surname: str
    key: str | None = None


# Backward-compatible aliases for existing imports.
FiscalUserInput = UserProfileInput
FiscalRevenueInput = UserRevenueInput


def HTML_Placeholder() -> str:
    contentHTML: str = "<html><body>backend/index.html file not found.</body></html>"
    with open("index.html", "r") as homepage:
        contentHTML = homepage.read()
    return contentHTML

class DBManager:

    @staticmethod
    def initializeDatabase() -> None:
        init_db()

    @staticmethod
    def verifyCredentials(user: str, password: str) -> bool:
        result: dict | None = Query.getInfoFromUser(user)
        if not result:
            return False

        stored_password = result["password"]
        if isinstance(stored_password, str):
            stored_password = stored_password.encode("utf-8")

        return bcrypt.checkpw(password.encode("utf-8"), stored_password)

    @staticmethod
    def verifyAuthentication(token: str) -> tuple[bool, str]:
        result: dict | None = Query.getInfoBySessionToken(token)
        if not result:
            return (False, "This token doesn't exist")
        if dt.datetime.now().timestamp() <= result["scadenza"]:
            return (True, result["user"])
        return (False, "This token is expired")

    @staticmethod
    def makeTokenSession(user: str) -> str | None:
        try:
            tokens: list[dict] = Query.getSessionsFromUser(user)
            if len(tokens) >= 3:
                Query.deleteSessionToken(tokens[0]["token"])

            token: str = secrets.token_urlsafe(32)
            sessionTime: int = int(os.environ["SESSION_TIME"])
            expiring: float = dt.datetime.now().timestamp() + sessionTime

            result = Query.insertNewSession(user, token, expiring)
            logger.info(f"[SESSION] insertNewSession returned: {result}")

            if result:
                logger.info(f"[SESSION] Token created for user {user}: {token}")
                return token

            logger.warning(f"[SESSION] Failed to insert session for user {user}")
            return None

        except Exception as e:
            logger.error(f"[SESSION] Error creating session: {e}")
            return None

    @staticmethod
    def getInfoFromUser(user: str) -> dict:
        userInfo: dict | None = Query.get_user(user)
        if not userInfo:
            return {"error": "No user was found."}

        return {
            "username": userInfo["username"],
            "regime": userInfo["regime"],
            "cassa": userInfo["cassa"],
            "commercialista_key": userInfo["commercialista_key"],
            "vat_opening_date": userInfo["vat_opening_date"],
            "role": userInfo["role"],
        }

    @staticmethod
    def getAllUsers() -> list[dict]:
        rows = Query.get_all_users()
        return [
            {
                "username": row["username"],
                "regime": row["regime"],
                "cassa": row["cassa"],
                "commercialista_key": row["commercialista_key"],
                "vat_opening_date": row["vat_opening_date"],
                "role": row["role"],
            }
            for row in rows
        ]

    @staticmethod
    def registerUser(
        username: str,
        password: str,
        regime: str | None = None,
        cassa: str | None = None,
        commercialista_key: str | None = None,
        vat_opening_date: str | None = None,
        role: str = "user",
    ) -> bool:
        if Query.user_exists(username):
            return False

        encpsw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        return Query.insert_user(
            username=username,
            password=encpsw,
            regime=regime,
            cassa=cassa,
            commercialista_key=commercialista_key,
            vat_opening_date=vat_opening_date,
            role=role,
        )

    @staticmethod
    def deleteUser(username: str) -> bool:
        if username == "admin":
            return False
        return Query.delete_user(username)

    @staticmethod
    def updateUserInfo(
        username: str,
        password: str | None = None,
        regime: str | None = None,
        cassa: str | None = None,
        commercialista_key: str | None = None,
        vat_opening_date: str | None = None,
        role: str = "user",
    ) -> list[str]:
        issues: list[str] = []

        existing = Query.get_user(username)
        if not existing:
            return [f"User {username} does not exist"]

        if username == "admin" and role != "admin":
            issues.append("Admin role cannot be changed")

        if issues:
            return issues

        next_password = existing["password"]
        if password is not None and password != "" and password != "X":
            next_password = bcrypt.hashpw(
                password.encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

        ok = Query.update_user(
            username=username,
            password=next_password,
            regime=regime if regime is not None else existing["regime"],
            cassa=cassa if cassa is not None else existing["cassa"],
            commercialista_key=(
                commercialista_key
                if commercialista_key is not None
                else existing["commercialista_key"]
            ),
            vat_opening_date=(
                vat_opening_date
                if vat_opening_date is not None
                else existing["vat_opening_date"]
            ),
            role=role if role is not None else existing["role"],
        )

        if not ok:
            return ["Update failed"]

        return []

def getDefaultResponse(choice: int = 1, arg = None) -> dict:
    match choice:
        case 1:
            return {"report_title":"AI Explanation unavailable","summary":"The AI explanation service could not be executed due to a configuration issue.","sections":[{"id":"config-error","title":"Configuration error","content_blocks":[{"type":"highlight_box","severity":"error","title":"Missing API token","text":"The backend could not find a valid **ChatGPT API key**. This prevents the AI explanation module from running."},{"type":"bullet_list","items":["The environment variable **GPT_KEY** is not set","The AI service is currently disabled","No optimization data was processed by the LLM"]},{"type":"paragraph","text":"Please ensure that the API key is correctly configured in the backend environment before retrying."}]}]}
        case 2:
            return {"report_title":"AI Explanation failed","summary":"An unexpected error occurred while generating the AI explanation.","sections":[{"id":"runtime-error","title":"Execution error","content_blocks":[{"type":"highlight_box","severity":"warning","title":"AI processing error","text":"The AI service encountered an error while processing the explanation request. This may be due to connectivity issues, API limits, or temporary service unavailability."},{"type":"paragraph","text":"The following error message was returned by the backend:"},{"type":"highlight_box","severity":"info","title":"Technical details","text":f"**{arg}**"},{"type":"paragraph","text":"You may retry the request later or consult the backend logs for further diagnostics."}]}]}
        case _:
            return dict()