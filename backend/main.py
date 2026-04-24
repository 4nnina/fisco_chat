from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from database.manager import Query
from model import DBManager, getDefaultResponse, TokenInput, LoginInput, BaseUserInfo, RegisterInfo, ChatInfo, ChatConfigInput, UserProfileInput, UserRevenueInput, UserSelfProfileInput, CommercialistaInput, HTML_Placeholder
from logs.logConfig import logger
import os, uvicorn, dotenv, json, asyncio, signal
import datetime as dt
from glob import glob
from pathlib import Path
import bcrypt
from openai import OpenAI


app: FastAPI = FastAPI(
    title="Fiscozen Chat Python Backend",
    description="API documentation for Fiscozen Chat project (<a href='https://github.com/Fortu032/FAST_thesis' target='_blank'>This repo</a>)",
    version="1.3.2"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

BASE_DIR = Path(__file__).resolve().parent
CHAT_CONFIG_PATH = BASE_DIR / "chat_config.json"
TONE_SOURCE_PATH = BASE_DIR / "../../Risorse_test/tone_of_voice.txt"
PROMPTS_DIR = BASE_DIR / "prompts"
CHAT_CONFIG_SNAPSHOT_PATH = PROMPTS_DIR / "chat-config-current.json"
USER_CHAT_ROOT_DIR = BASE_DIR / "database" / "chats"
ALLOWED_REGIMI = {"forfettario", "semplificato"}
ALLOWED_CASSE = {"INARCASSA", "ENPAP", "ENPAPI", "GS INPS"}


def ensureHashedPassword(rawPassword: str) -> str:
    value = rawPassword.strip()
    if not value:
        return ""
    # If it's already a bcrypt hash, keep it unchanged.
    if value.startswith("$2a$") or value.startswith("$2b$") or value.startswith("$2y$"):
        return value
    return bcrypt.hashpw(value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def normalizeCommercialistaKey(value: str) -> str:
    normalized = value.strip().lower()
    normalized = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "-" for ch in normalized)
    while "--" in normalized:
        normalized = normalized.replace("--", "-")
    return normalized.strip("-")


def getDefaultTone() -> str:
    defaultTone: str = (
        "Usa frasi chiare e concise. Evita gergo tecnico non spiegato. "
        "Mantieni un tono empatico, diretto e professionale."
    )
    try:
        if TONE_SOURCE_PATH.exists():
            return TONE_SOURCE_PATH.read_text(encoding="utf-8")
    except Exception as e:
        logger.warning(f"[CHAT CONFIG] Unable to read tone_of_voice.txt: {e}")
    return defaultTone


def saveToneSource(tone: str) -> None:
    TONE_SOURCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    TONE_SOURCE_PATH.write_text(tone, encoding="utf-8")


def getDefaultChatConfig() -> dict:
    return {
        "model": os.getenv("GPT_MODEL", "gpt-4o-mini"),
        "temperature": 0.5,
        "max_history": 12,
        "system_prompt_template": (
            "Sei l'assistente virtuale di Fiscozen. Rispondi in italiano in modo utile, preciso e orientato all'azione. "
            "Segui il tono definito qui sotto.\\n\\n"
            "Tono:\\n{tone}"
        ),
        "tone_of_voice": getDefaultTone(),
    }


def loadChatConfig() -> dict:
    defaultConfig = getDefaultChatConfig()
    if not CHAT_CONFIG_PATH.exists():
        saveChatConfig(defaultConfig)
        return defaultConfig

    try:
        content = json.loads(CHAT_CONFIG_PATH.read_text(encoding="utf-8"))
        if not isinstance(content, dict):
            raise ValueError("chat config must be an object")
        return {
            "model": str(content.get("model", defaultConfig["model"])).strip() or defaultConfig["model"],
            "temperature": float(content.get("temperature", defaultConfig["temperature"])),
            "max_history": int(content.get("max_history", defaultConfig["max_history"])),
            "system_prompt_template": str(content.get("system_prompt_template", defaultConfig["system_prompt_template"])),
            # Keep the text area in sync with the canonical tone file.
            "tone_of_voice": getDefaultTone(),
        }
    except Exception as e:
        logger.error(f"[CHAT CONFIG] Invalid chat_config.json, fallback to defaults: {e}")
        saveChatConfig(defaultConfig)
        return defaultConfig


def saveChatConfig(config: dict) -> None:
    CHAT_CONFIG_PATH.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def savePromptAndConfigSnapshot(config: dict) -> None:
    PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
    promptText = str(config.get("system_prompt_template", ""))
    tone = str(config.get("tone_of_voice", ""))
    resolvedPrompt = promptText.replace("{tone}", tone) if "{tone}" in promptText else f"{promptText}\n\nTono:\n{tone}"

    payload = {
        "updated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "config": config,
        "resolved_prompt": resolvedPrompt,
    }

    CHAT_CONFIG_SNAPSHOT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def loadRuntimeChatConfig() -> dict:
    defaults = getDefaultChatConfig()
    if not CHAT_CONFIG_SNAPSHOT_PATH.exists():
        return loadChatConfig()

    try:
        content = json.loads(CHAT_CONFIG_SNAPSHOT_PATH.read_text(encoding="utf-8"))
        config = content.get("config", {}) if isinstance(content, dict) else {}
        return {
            "model": str(config.get("model", defaults["model"])).strip() or defaults["model"],
            "temperature": float(config.get("temperature", defaults["temperature"])),
            "max_history": int(config.get("max_history", defaults["max_history"])),
            "system_prompt_template": str(config.get("system_prompt_template", defaults["system_prompt_template"])),
            "tone_of_voice": str(config.get("tone_of_voice", defaults["tone_of_voice"])),
        }
    except Exception as e:
        logger.warning(f"[CHAT CONFIG] Unable to load chat-config-current.json, fallback to chat_config.json: {e}")
        return loadChatConfig()


def loadKnowledgeMarkdown() -> str:
    files = [
        PROMPTS_DIR / "tax_knowledge_1.txt.llm.md",
        PROMPTS_DIR / "tax_knowledge_2.txt.llm.md",
    ]

    chunks: list[str] = []
    for path in files:
        if path.exists():
            text = path.read_text(encoding="utf-8")
            chunks.append(f"## Fonte: {path.name}\n{text}")

    return "\n\n".join(chunks)


def buildUserDbContext(username: str) -> str:
    user = Query.get_user(username)
    revenues = Query.get_revenue_by_user(username)
    sessions = Query.getSessionsFromUser(username)

    commercialista = None
    if user and user.get("commercialista_key"):
        commercialista = Query.get_commercialista(user["commercialista_key"])

    payload = {
        "utente_loggato": username,
        "tabella_users": {
            "username": user.get("username") if user else None,
            "regime": user.get("regime") if user else None,
            "cassa": user.get("cassa") if user else None,
            "commercialista_key": user.get("commercialista_key") if user else None,
            "vat_opening_date": user.get("vat_opening_date") if user else None,
            "role": user.get("role") if user else None,
        },
        "tabella_commercialisti": {
            "key": commercialista.get("key") if commercialista else None,
            "name": commercialista.get("name") if commercialista else None,
            "surname": commercialista.get("surname") if commercialista else None,
        },
        "tabella_fatturato": [
            {
                "username": row.get("username"),
                "year": row.get("year"),
                "sales": row.get("sales"),
            }
            for row in revenues
        ],
        "tabella_sessions": [
            {
                "token": row.get("token"),
                "scadenza": row.get("scadenza"),
            }
            for row in sessions
        ],
    }

    return json.dumps(payload, ensure_ascii=False, indent=2)


def _safeUserFolderName(username: str) -> str:
    normalized = username.strip()
    if not normalized:
        return "unknown"
    return "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "_" for ch in normalized)


def saveUserChatJson(
    username: str,
    model: str,
    prompt: str,
    response: str,
    history: list[dict],
    conversationId: str | None = None,
    newConversation: bool = False,
) -> str:
    now = dt.datetime.now().isoformat(timespec="seconds")
    fallbackConversationId = f"conv-{int(dt.datetime.now().timestamp() * 1000)}"

    try:
        safeFolder = _safeUserFolderName(username)
        userDir = USER_CHAT_ROOT_DIR / safeFolder
        userDir.mkdir(parents=True, exist_ok=True)
        chatPath = userDir / "chat.json"

        payload: dict
        if chatPath.exists():
            try:
                payload = json.loads(chatPath.read_text(encoding="utf-8"))
                if not isinstance(payload, dict):
                    payload = {}
            except Exception:
                payload = {}
        else:
            payload = {}

        chatsRaw = payload.get("chats")
        chats = chatsRaw if isinstance(chatsRaw, list) else []
        chats = [item for item in chats if isinstance(item, dict)]

        activeConversationId = (conversationId or "").strip()
        if newConversation:
            activeConversationId = ""

        if not activeConversationId:
            if chats:
                last = chats[-1]
                lastConversationId = str(last.get("conversation_id") or "").strip()
                activeConversationId = lastConversationId
            if not activeConversationId:
                activeConversationId = fallbackConversationId

        chats.append(
            {
                "conversation_id": activeConversationId,
                "timestamp": now,
                "model": model,
                "prompt": prompt,
                "response": response,
                "history": history,
            }
        )

        finalPayload = {
            "username": username,
            "created_at": payload.get("created_at", now),
            "updated_at": now,
            "chats": chats,
        }
        chatPath.write_text(json.dumps(finalPayload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return activeConversationId
    except Exception as e:
        logger.error(f"[CHAT STORAGE] Unable to persist chat for {username}: {e}")
        return (conversationId or fallbackConversationId).strip() or fallbackConversationId


def loadUserChatJson(username: str) -> dict:
    safeFolder = _safeUserFolderName(username)
    chatPath = USER_CHAT_ROOT_DIR / safeFolder / "chat.json"
    if not chatPath.exists():
        return {
            "username": username,
            "created_at": None,
            "updated_at": None,
            "chats": [],
        }

    try:
        payload = json.loads(chatPath.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            chats = payload.get("chats", [])
            if not isinstance(chats, list):
                chats = []
            return {
                "username": payload.get("username", username),
                "created_at": payload.get("created_at"),
                "updated_at": payload.get("updated_at"),
                "chats": chats,
            }
    except Exception as e:
        logger.warning(f"[CHAT STORAGE] Unable to read chat history for {username}: {e}")

    return {
        "username": username,
        "created_at": None,
        "updated_at": None,
        "chats": [],
    }



# Asks ChatGPT to process data in order to get a parsable report
def getModelResponse(prompt: str, model: str = None) -> str:

    apiKey: str | None = os.getenv("GPT_KEY")
    if not apiKey:
        return getDefaultResponse(1)
    
    # Use provided model or fall back to environment variable or default
    selectedModel = model or os.getenv("GPT_MODEL", "gpt-4")
    
    try:
        client = OpenAI(api_key=apiKey)
        response = client.chat.completions.create(
            model=selectedModel,
            messages = [
                {"role": "user", "content": prompt}
            ],
        )
        return json.loads(response.choices[0].message.content)
    
    except Exception as e:
        return getDefaultResponse(2, e)


def getChatbotResponse(message: str, history: list[dict] | None = None, model: str | None = None, username: str | None = None) -> str:

    chatConfig = loadRuntimeChatConfig()
    apiKey: str | None = os.getenv("GPT_KEY")
    if not apiKey:
        return (
            "Modalita demo: ho ricevuto il tuo messaggio.\\n\\n"
            f"Messaggio: {message}\\n\\n"
            "Per avere risposte reali imposta la variabile GPT_KEY nel backend."
        )

    selectedModel = model or chatConfig["model"]
    maxHistory = max(0, int(chatConfig["max_history"]))
    temperature = max(0.0, min(2.0, float(chatConfig["temperature"])))
    tone = chatConfig["tone_of_voice"]
    systemTemplate = chatConfig["system_prompt_template"]
    if "{tone}" in systemTemplate:
        systemPrompt = systemTemplate.replace("{tone}", tone)
    else:
        systemPrompt = f"{systemTemplate}\\n\\nTono:\\n{tone}"

    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": systemPrompt,
        }
    ]

    if username:
        userContext = buildUserDbContext(username)
        messages.append(
            {
                "role": "system",
                "content": (
                    "Contesto database filtrato per l'utente loggato. "
                    "Usa questo contesto per risposte personalizzate e coerenti:\n\n"
                    f"{userContext}"
                ),
            }
        )

    knowledge = loadKnowledgeMarkdown()
    if knowledge:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Conoscenza di dominio disponibile nei file markdown della cartella prompts. "
                    "Usa queste fonti quando rilevanti:\n\n"
                    f"{knowledge}"
                ),
            }
        )

    if history:
        for item in history[-maxHistory:]:
            role = item.get("role", "")
            content = item.get("content", "")
            if role in ["user", "assistant"] and isinstance(content, str) and content.strip():
                messages.append({"role": role, "content": content.strip()})

    messages.append({"role": "user", "content": message})

    try:
        client = OpenAI(api_key=apiKey)
        response = client.chat.completions.create(
            model=selectedModel,
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"[CHATBOT] Error while generating response: {e}")
        return f"Errore durante la generazione della risposta: {e}"



@app.get("/info", summary="Fetch user preferences from user name", tags=["Get user preferences"])
async def fetchInfo(user: str):
    result: dict = DBManager.getInfoFromUser(user)
    logger.info(f"[INFO] Fetching user ({user}) preferences.")
    return JSONResponse(
        status_code=200,
        content=result
    )


@app.get("/users", summary="Fetch all users base info, except admin", tags=["Get all users info"])
async def fetchUsers():
    result: list[dict] = DBManager.getAllUsers()
    logger.info("[USERS] Fetching all user basic info.")
    return JSONResponse(
        status_code=200,
        content=result
    )


@app.get("/getJsonFiles", summary="Collection of all FAST algorithm JSON result", tags=["Get JSON Files"])
async def getJsonFiles():
    output_dir: str = "FAST/university_schedules_stats/"
    files: list = sorted(glob(os.path.join(output_dir, 'fairness_data_*.json')))
    result: list = []
    for file in files:
        content: dict | None = None
        try:
            with open(file, 'r') as jf:
                content = json.load(jf)
        except Exception as e:
            content = None
        result.append({
            'filename': os.path.basename(file),
            'content': content,
            'timestamp': os.path.getmtime(file)
        })
    return JSONResponse(
        status_code=200,
        content=result
    )


@app.get("/latest-timeline", summary="Get latest timeline allocation for degrees", tags=["Get Timeline Data"])
async def getLatestTimeline():
    output_dir: str = "FAST/university_schedules_stats/"
    
    # Look for timeline allocation files
    timeline_files: list = sorted(glob(os.path.join(output_dir, 'timeline_allocation_*.json')))
    
    if not timeline_files:
        logger.warning("No timeline allocation files found")
        return JSONResponse(
            status_code=200,
            content={}
        )
    
    # Get the latest (last) timeline file
    latest_file = timeline_files[-1]
    logger.info(f"Reading timeline from: {latest_file}")
    
    try:
        with open(latest_file, 'r') as jf:
            content = json.load(jf)
        logger.info(f"Successfully loaded timeline with keys: {list(content.keys())}")
        return JSONResponse(
            status_code=200,
            content=content
        )
    except Exception as e:
        logger.error(f"Error reading timeline file: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to read timeline data: {str(e)}"}
        )


@app.get("/module-mapping", summary="Get module ID to module name mapping", tags=["Get Module Data"])
async def getModuleMapping():
    mapping_file: str = "FAST/dataset/university/map_module_id.csv"
    
    try:
        if not os.path.exists(mapping_file):
            logger.error(f"Module mapping file not found at {mapping_file}")
            return JSONResponse(
                status_code=404,
                content={"error": f"Module mapping file not found"}
            )
        
        with open(mapping_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        mapping = {}
        for line in lines[1:]:  # Skip header
            line = line.strip()
            if not line:
                continue
            parts = line.split(',', 1)  # Split on first comma only
            if len(parts) == 2:
                module_id, module_name = parts
                mapping[module_id.strip()] = module_name.strip()
        
        logger.info(f"Successfully loaded {len(mapping)} module mappings")
        return JSONResponse(
            status_code=200,
            content=mapping
        )
    except Exception as e:
        logger.error(f"Error reading module mapping file: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to read module mapping: {str(e)}"}
        )


@app.post("/auth", summary="Token authentication service (bcrypt)", tags=["Authentication"])
async def authenticate(data: TokenInput):
    result: tuple[bool, str] = DBManager.verifyAuthentication(data.token)
    if result[0]:
        logger.info(f"[AUTH] User {result[1]} is authenticated now.")
        return JSONResponse(
            status_code=200,
            content={"auth": True, "user": result[1]}
        )
    else:
        logger.warning(f"[AUTH] Session token {data.token} invalid: '{result[1]}'.")
        return JSONResponse(
            status_code=401,
            content={"auth": False, "error": result[1]}
        )


@app.post("/login", summary="User or admin login", tags=["Login into application"])
async def login(data: LoginInput):
    if DBManager.verifyCredentials(data.username, data.password):
        logger.info(f"[LOGIN] User {data.username} just logged succesfully.")
        return JSONResponse(
            status_code=200,
            content={"user": data.username, "token": DBManager.makeTokenSession(data.username)}
        )
    logger.warning(f"[LOGIN] User {data.username} failed to log in.")
    return JSONResponse(
        status_code=401,                # unauthorized error
        content={"error": "Invalid credentials"}
    )


@app.post("/register", summary="Register new user", tags=["Register into application"])
async def register(data: RegisterInfo):
    result: bool = DBManager.registerUser(data.user, data.passw, data.maxUnd, data.maxImp)
    if result:
        logger.info(f"[REGISTER] A new user ({data.user}) was registered succesfully.")
        return JSONResponse(
            status_code=200,
            content={"ok": True}
        )
    logger.warning(f"[REGISTER] A new user ({data.user}) failed to register.")
    return JSONResponse(
        status_code=409,
        content={"ok": False}
    )

@app.post("/chatbot", summary="Chatbot conversation endpoint", tags=["Get ChatGPT response"])
async def chatbot(data: ChatInfo):
    try:
        prompt: str = data.message.strip()
        model: str = data.model if data.model else "gpt-4o-mini"
        token: str = data.token.strip() if data.token else ""
        conversationId = data.conversation_id.strip() if data.conversation_id else ""
        newConversation = bool(data.new_conversation)

        if not prompt:
            return JSONResponse(
                status_code=400,
                content={"error": "Message is required"}
            )

        auth = DBManager.verifyAuthentication(token)
        if not auth[0]:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid or expired session token"}
            )

        username = auth[1]

        history = [
            {"role": msg.role, "content": msg.content}
            for msg in data.history
        ]

        response: str = await asyncio.to_thread(
            getChatbotResponse,
            prompt,
            history,
            model,
            username,
        )

        activeConversationId = saveUserChatJson(
            username=username,
            model=model,
            prompt=prompt,
            response=response,
            history=history,
            conversationId=conversationId,
            newConversation=newConversation,
        )

        logger.info(f"[CHATBOT] Generated response with model {model} for user {username}")
        return JSONResponse(
            status_code=200,
            content={
                "message": prompt,
                "response": response,
                "model": model or loadChatConfig()["model"],
                "conversation_id": activeConversationId,
            }
        )
    except Exception as e:
        logger.error(f"[CHATBOT] Unexpected error: {e}")
        return JSONResponse(status_code=500, content={"error": "Errore interno del server"})


@app.get("/chat-config", summary="Get chatbot configuration", tags=["Get ChatGPT response"])
async def getChatConfig():
    config = loadChatConfig()
    return JSONResponse(
        status_code=200,
        content=config,
    )


@app.get("/chat-config/tone-source", summary="Get tone_of_voice source file content", tags=["Get ChatGPT response"])
async def getChatToneSource():
    return JSONResponse(
        status_code=200,
        content={"tone_of_voice": getDefaultTone()},
    )


@app.put("/chat-config", summary="Update chatbot configuration", tags=["Get ChatGPT response"])
async def updateChatConfig(data: ChatConfigInput):
    tone = data.tone_of_voice
    saveToneSource(tone)

    config = {
        "model": data.model.strip() or "gpt-4o-mini",
        "temperature": max(0.0, min(2.0, float(data.temperature))),
        "max_history": max(0, int(data.max_history)),
        "system_prompt_template": data.system_prompt_template.strip(),
        "tone_of_voice": tone,
    }
    saveChatConfig(config)
    savePromptAndConfigSnapshot(config)
    logger.info("[CHAT CONFIG] Chatbot configuration updated")
    return JSONResponse(
        status_code=200,
        content=config,
    )


@app.get("/admin/users", summary="Get all admin-managed users", tags=["Admin users"])
@app.get("/fiscal-users", summary="Get all admin-managed users (legacy path)", tags=["Admin users"])
async def getAdminUsers():
    users = Query.get_all_users()
    # Never expose password hashes in API responses.
    sanitized = [
        {
            "username": row["username"],
            "password": "",
            "regime": row["regime"],
            "cassa": row["cassa"],
            "commercialista_export_key": row["commercialista_key"] or "",
            "vat_opening_date": row["vat_opening_date"],
        }
        for row in users
        if row["role"] != "admin"
    ]
    return JSONResponse(status_code=200, content=sanitized)


@app.get("/admin/commercialisti", summary="Get all commercialisti", tags=["Admin users"])
async def getCommercialisti():
    rows = Query.get_all_commercialisti()
    return JSONResponse(
        status_code=200,
        content=[
            {
                "key": row["key"],
                "name": row["name"],
                "surname": row["surname"],
            }
            for row in rows
        ],
    )


@app.post("/admin/commercialisti", summary="Create commercialista", tags=["Admin users"])
async def createCommercialista(data: CommercialistaInput):
    name = data.name.strip()
    surname = data.surname.strip()
    if not name or not surname:
        return JSONResponse(status_code=400, content={"error": "name and surname are required"})

    baseKey = normalizeCommercialistaKey(data.key or f"{name}-{surname}")
    if not baseKey:
        return JSONResponse(status_code=400, content={"error": "invalid commercialista key"})

    existingRows = Query.get_all_commercialisti()
    existingKeys = {str(row["key"]).strip().lower() for row in existingRows}

    nextKey = baseKey
    suffix = 2
    while nextKey.lower() in existingKeys:
        nextKey = f"{baseKey}-{suffix}"
        suffix += 1

    try:
        ok = Query.insert_commercialista(nextKey, name, surname)
    except Exception:
        ok = False

    if not ok:
        return JSONResponse(status_code=500, content={"error": "unable to create commercialista"})

    return JSONResponse(
        status_code=201,
        content={
            "ok": True,
            "key": nextKey,
            "name": name,
            "surname": surname,
        },
    )


@app.get("/admin/users/chats/users", summary="List users with chat-history metadata", tags=["Admin users"])
async def getUsersChatSummary():
    rows = Query.get_all_users()
    result: list[dict] = []

    for row in rows:
        username = row["username"]
        if row["role"] == "admin":
            continue

        chatPayload = loadUserChatJson(username)
        chats = chatPayload.get("chats", [])
        conversationIds = {
            str(item.get("conversation_id") or item.get("timestamp") or "")
            for item in chats
            if isinstance(item, dict)
        }
        threadCount = len([item for item in conversationIds if item])
        result.append(
            {
                "username": username,
                "has_chat": len(chats) > 0,
                "chat_count": threadCount,
                "updated_at": chatPayload.get("updated_at"),
            }
        )

    return JSONResponse(status_code=200, content=result)


@app.get("/admin/users/chats/{username}", summary="Get chat history for a specific user", tags=["Admin users"])
async def getUserChatHistory(username: str):
    normalized = username.strip()
    if not normalized:
        return JSONResponse(status_code=400, content={"error": "username is required"})

    user = Query.get_user(normalized)
    if not user:
        return JSONResponse(status_code=404, content={"error": "user not found"})

    payload = loadUserChatJson(normalized)
    return JSONResponse(status_code=200, content=payload)


@app.get("/user/chats", summary="Get current user chat history", tags=["User profile"])
async def getCurrentUserChatHistory(token: str):
    normalizedToken = token.strip()
    if not normalizedToken:
        return JSONResponse(status_code=400, content={"error": "token is required"})

    auth = DBManager.verifyAuthentication(normalizedToken)
    if not auth[0]:
        return JSONResponse(status_code=401, content={"error": "Invalid or expired session token"})

    username = auth[1]
    payload = loadUserChatJson(username)
    return JSONResponse(status_code=200, content=payload)


@app.get("/user/profile", summary="Get current user profile", tags=["User profile"])
async def getUserProfile(username: str):
    normalized = username.strip()
    if not normalized:
        return JSONResponse(status_code=400, content={"error": "username is required"})

    user = Query.get_user(normalized)
    if not user:
        return JSONResponse(status_code=404, content={"error": "user not found"})

    return JSONResponse(
        status_code=200,
        content={
            "username": user["username"],
            "password": "",
            "regime": user["regime"],
            "cassa": user["cassa"],
            "commercialista_export_key": user["commercialista_key"] or "",
            "vat_opening_date": user["vat_opening_date"],
        },
    )


@app.put("/user/profile", summary="Update current user profile", tags=["User profile"])
async def updateUserProfile(data: UserSelfProfileInput):
    username = data.username.strip()
    if not username:
        return JSONResponse(status_code=400, content={"error": "username is required"})

    existing = Query.get_user(username)
    if not existing:
        return JSONResponse(status_code=404, content={"error": "user not found"})

    if data.regime is not None and data.regime not in ALLOWED_REGIMI:
        return JSONResponse(status_code=400, content={"error": "invalid regime"})
    if data.cassa is not None and data.cassa not in ALLOWED_CASSE:
        return JSONResponse(status_code=400, content={"error": "invalid cassa"})

    issues = DBManager.updateUserInfo(
        username=username,
        password=data.password,
        regime=data.regime,
        cassa=data.cassa,
        commercialista_key=data.commercialista_export_key,
        vat_opening_date=data.vat_opening_date,
        role=existing["role"],
    )

    if issues:
        return JSONResponse(status_code=400, content={"error": "; ".join(issues)})

    updated = Query.get_user(username)
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "profile": {
                "username": updated["username"],
                "password": "",
                "regime": updated["regime"],
                "cassa": updated["cassa"],
                "commercialista_export_key": updated["commercialista_key"] or "",
                "vat_opening_date": updated["vat_opening_date"],
            },
        },
    )


@app.post("/admin/users", summary="Create user", tags=["Admin users"])
@app.post("/fiscal-users", summary="Create user (legacy path)", tags=["Admin users"])
async def createUser(data: UserProfileInput):
    username = data.username.strip()
    if not username:
        return JSONResponse(status_code=400, content={"error": "username is required"})
    if not data.password.strip():
        return JSONResponse(status_code=400, content={"error": "password is required"})
    if data.regime not in ALLOWED_REGIMI:
        return JSONResponse(status_code=400, content={"error": "invalid regime"})
    if data.cassa not in ALLOWED_CASSE:
        return JSONResponse(status_code=400, content={"error": "invalid cassa"})
    if not data.commercialista_export_key.strip():
        return JSONResponse(status_code=400, content={"error": "commercialista_export_key is required"})
    if not data.vat_opening_date.strip():
        return JSONResponse(status_code=400, content={"error": "vat_opening_date is required"})

    if Query.get_user(username):
        return JSONResponse(status_code=409, content={"error": "user already exists"})

    hashedPassword = ensureHashedPassword(data.password)
    ok = Query.insert_user(
        username=username,
        password=hashedPassword,
        regime=data.regime,
        cassa=data.cassa,
        commercialista_key=data.commercialista_export_key.strip(),
        vat_opening_date=data.vat_opening_date.strip(),
        role="user",
    )

    if not ok:
        return JSONResponse(status_code=500, content={"error": "unable to create user"})

    return JSONResponse(status_code=201, content={"ok": True, "username": username})


@app.put("/admin/users/{username}", summary="Update user", tags=["Admin users"])
@app.put("/fiscal-users/{username}", summary="Update user (legacy path)", tags=["Admin users"])
async def updateUser(username: str, data: UserProfileInput):
    normalized = username.strip()
    if normalized != data.username.strip():
        return JSONResponse(status_code=400, content={"error": "path username and body username must match"})
    if data.regime not in ALLOWED_REGIMI:
        return JSONResponse(status_code=400, content={"error": "invalid regime"})
    if data.cassa not in ALLOWED_CASSE:
        return JSONResponse(status_code=400, content={"error": "invalid cassa"})

    if not Query.get_user(normalized):
        return JSONResponse(status_code=404, content={"error": "user not found"})

    current = Query.get_user(normalized)
    currentPassword = current["password"] if current else ""
    nextPassword = currentPassword
    if data.password.strip():
        nextPassword = ensureHashedPassword(data.password)

    ok = Query.update_user(
        username=normalized,
        password=nextPassword,
        regime=data.regime,
        cassa=data.cassa,
        commercialista_key=data.commercialista_export_key.strip(),
        vat_opening_date=data.vat_opening_date.strip(),
        role=current["role"] if current else "user",
    )
    if not ok:
        return JSONResponse(status_code=500, content={"error": "unable to update user"})

    return JSONResponse(status_code=200, content={"ok": True, "username": normalized})


@app.get("/admin/users/revenue", summary="Get all yearly user revenue", tags=["Admin users"])
@app.get("/fiscal-revenue", summary="Get all yearly user revenue (legacy path)", tags=["Admin users"])
async def getUserRevenue():
    rows = Query.get_all_revenue()
    data = [
        {
            "username": row["username"],
            "year": row["year"],
            "revenue": float(row["sales"]),
        }
        for row in rows
    ]
    return JSONResponse(status_code=200, content=data)


@app.post("/admin/users/revenue", summary="Upsert yearly user revenue", tags=["Admin users"])
@app.post("/fiscal-revenue", summary="Upsert yearly user revenue (legacy path)", tags=["Admin users"])
async def upsertUserRevenue(data: UserRevenueInput):
    username = data.username.strip()
    if not username:
        return JSONResponse(status_code=400, content={"error": "username is required"})
    if data.year < 1900 or data.year > 2200:
        return JSONResponse(status_code=400, content={"error": "year is out of range"})
    if data.revenue < 0:
        return JSONResponse(status_code=400, content={"error": "revenue must be >= 0"})
    if not Query.get_user(username):
        return JSONResponse(status_code=404, content={"error": "user not found"})

    ok = Query.upsert_revenue(username=username, year=int(data.year), revenue=float(data.revenue))
    if not ok:
        return JSONResponse(status_code=500, content={"error": "unable to save revenue"})

    return JSONResponse(status_code=200, content={"ok": True, "username": username, "year": int(data.year)})


@app.put("/edit", summary="Edit user base info (user table)", tags=["Update user info"])
async def updateBaseInfo(data: BaseUserInfo):
    result: list[str] = DBManager.updateUserInfo(data.id, data.user, data.passw, data.maxUnd, data.maxImp)
    if not result:
        logger.info(f"[EDIT] Base info for {data.user} was updated succesfully.")
        return JSONResponse(
            status_code=200,
            content={"ok": True}
        )
    logger.warning(f"[EDIT] Impossible to edit base info for {data.user}, here's why: { ', '.join(result) }")
    return JSONResponse(
        status_code=200,
        content={"ok": False, "issues": result}
    )


@app.get("/{everyPath:path}", summary="Main homepage HTML template", tags=["Homepage for backend"], response_class=HTMLResponse)
async def catchRoutes(everyPath: str):
    logger.debug("[HOMEPAGE] Route catcher, someone wants to see backend documentation.")
    return HTMLResponse(content=HTML_Placeholder())



if __name__ == "__main__":
    dotenv.load_dotenv()
    port: int = 5000
    host: str = os.environ["HOST_INTERFACE"]
    uvicorn.run("main:app", host=host, port=port, reload=True)
