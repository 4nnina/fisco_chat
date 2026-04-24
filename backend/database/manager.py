from __future__ import annotations
from pathlib import Path

from sqlalchemy import (
    BigInteger,
    Column,
    Engine,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    PrimaryKeyConstraint,
    String,
    Table,
    create_engine,
    delete,
    event,
    insert,
    select,
    update,
)


BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "database"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "db.sqlite3"

metadata = MetaData()

commercialisti = Table(
    "commercialisti",
    metadata,
    Column("key", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("surname", String, nullable=False),
)

users = Table(
    "users",
    metadata,
    Column("username", String, primary_key=True),
    Column("password", String, nullable=False),
    Column("regime", String),
    Column("cassa", String),
    Column("commercialista_key", String, ForeignKey("commercialisti.key")),
    Column("vat_opening_date", String),
    Column("role", String, nullable=False, default="user"),
)

fatturato = Table(
    "fatturato",
    metadata,
    Column(
        "username",
        String,
        ForeignKey("users.username", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("year", Integer, nullable=False),
    Column("sales", Float, nullable=False),
    PrimaryKeyConstraint("username", "year"),
)

sessions = Table(
    "sessions",
    metadata,
    Column(
        "user",
        String,
        ForeignKey("users.username", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("token", String, primary_key=True),
    Column("scadenza", BigInteger, nullable=False),
)

engine: Engine = create_engine(f"sqlite:///{DB_PATH}")



@event.listens_for(engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def init_db() -> None:
    metadata.create_all(engine)

VALID_ROLES = {"user", "admin"}

class Query:


    @staticmethod
    def _parse_full_name(full_name: str) -> tuple[str, str] | None:
        parts = full_name.strip().split()
        if len(parts) < 2:
            return None
        name = parts[0].strip()
        surname = " ".join(parts[1:]).strip()
        return name, surname

    @staticmethod
    def _commercialista_exists(conn, commercialista_key: str) -> bool:
        query = select(commercialisti.c["key"]).where(
            commercialisti.c["key"] == commercialista_key
        )
        return conn.execute(query).scalar_one_or_none() is not None

    @staticmethod
    def _user_exists(conn, username: str) -> bool:
        query = select(users.c["username"]).where(users.c["username"] == username)
        return conn.execute(query).scalar_one_or_none() is not None

    @staticmethod
    def get_commercialista_key_by_fullname(full_name: str) -> str | None:
        parsed = Query._parse_full_name(full_name)
        if parsed is None:
            return None

        name, surname = parsed

        with engine.connect() as conn:
            query = select(commercialisti.c["key"]).where(
                commercialisti.c["name"] == name,
                commercialisti.c["surname"] == surname,
            )
            return conn.execute(query).scalar_one_or_none()

    @staticmethod
    def get_commercialista(key: str) -> dict | None:
        with engine.connect() as conn:
            query = select(commercialisti).where(commercialisti.c["key"] == key)
            return conn.execute(query).mappings().first()

    @staticmethod
    def get_all_commercialisti() -> list[dict]:
        with engine.connect() as conn:
            query = select(commercialisti).order_by(
                commercialisti.c["surname"], commercialisti.c["name"]
            )
            return conn.execute(query).mappings().all()

    @staticmethod
    def insert_commercialista(key: str, name: str, surname: str) -> bool:
        with engine.begin() as conn:
            query = insert(commercialisti).values(
                key=key.strip(),
                name=name.strip(),
                surname=surname.strip(),
            )
            return conn.execute(query).rowcount == 1

    @staticmethod
    def upsert_commercialista(key: str, name: str, surname: str) -> bool:
        with engine.begin() as conn:
            exists = Query._commercialista_exists(conn, key)
            if exists:
                query = (
                    update(commercialisti)
                    .where(commercialisti.c["key"] == key)
                    .values(name=name.strip(), surname=surname.strip())
                )
            else:
                query = insert(commercialisti).values(
                    key=key.strip(),
                    name=name.strip(),
                    surname=surname.strip(),
                )
            return conn.execute(query).rowcount == 1

    @staticmethod
    def delete_commercialista(key: str) -> bool:
        with engine.begin() as conn:
            query = delete(commercialisti).where(commercialisti.c["key"] == key)
            return conn.execute(query).rowcount == 1

    @staticmethod
    def get_user(username: str) -> dict | None:
        with engine.connect() as conn:
            query = select(users).where(users.c["username"] == username)
            return conn.execute(query).mappings().first()

    @staticmethod
    def get_all_users() -> list[dict]:
        with engine.connect() as conn:
            query = select(users).order_by(users.c["username"])
            return conn.execute(query).mappings().all()

    @staticmethod
    def user_exists(username: str) -> bool:
        with engine.connect() as conn:
            query = select(users.c["username"]).where(users.c["username"] == username)
            return conn.execute(query).scalar_one_or_none() is not None

    @staticmethod
    def insert_user(
        username: str,
        password: str,
        regime: str | None = None,
        cassa: str | None = None,
        commercialista_key: str | None = None,
        vat_opening_date: str | None = None,
        role: str = "user",
    ) -> bool:
        with engine.begin() as conn:
            role = role.strip().lower()
            if role not in VALID_ROLES:
                return False

            if commercialista_key is not None and commercialista_key.strip() != "":
                commercialista_key = commercialista_key.strip()
                if not Query._commercialista_exists(conn, commercialista_key):
                    return False
            else:
                commercialista_key = None


            query = insert(users).values(
                username=username.strip(),
                password=password,
                regime=regime.strip() if regime else None,
                cassa=cassa.strip() if cassa else None,
                commercialista_key=commercialista_key,
                vat_opening_date=vat_opening_date.strip() if vat_opening_date else None,
                role=role,
            )
            return conn.execute(query).rowcount == 1

    @staticmethod
    def insert_user_by_commercialista_name(
        username: str,
        password: str,
        regime: str,
        cassa: str,
        commercialista_full_name: str,
        vat_opening_date: str,
        role: str = "user",
    ) -> bool:
        commercialista_key = Query.get_commercialista_key_by_fullname(
            commercialista_full_name
        )
        if commercialista_key is None:
            return False

        return Query.insert_user(
            username=username,
            password=password,
            regime=regime,
            cassa=cassa,
            commercialista_key=commercialista_key,
            vat_opening_date=vat_opening_date,
            role=role,
        )

    @staticmethod
    def update_user(
        username: str,
        password: str,
        regime: str | None = None,
        cassa: str | None = None,
        commercialista_key: str | None = None,
        vat_opening_date: str | None = None,
        role: str = "user",
    ) -> bool:
        with engine.begin() as conn:
            role = role.strip().lower()
            if role not in VALID_ROLES:
                return False

            if commercialista_key is not None and commercialista_key.strip() != "":
                commercialista_key = commercialista_key.strip()
                if not Query._commercialista_exists(conn, commercialista_key):
                    return False
            else:
                commercialista_key = None

            query = (
                update(users)
                .where(users.c["username"] == username)
                .values(
                    password=password,
                    regime=regime.strip() if regime else None,
                    cassa=cassa.strip() if cassa else None,
                    commercialista_key=commercialista_key,
                    vat_opening_date=vat_opening_date.strip() if vat_opening_date else None,
                    role=role,
                )
            )
            return conn.execute(query).rowcount == 1
        
    @staticmethod
    def delete_user(username: str) -> bool:
        with engine.begin() as conn:
            query = delete(users).where(users.c["username"] == username)
            return conn.execute(query).rowcount == 1

    @staticmethod
    def get_all_revenue() -> list[dict]:
        with engine.connect() as conn:
            query = select(fatturato).order_by(
                fatturato.c["username"], fatturato.c["year"]
            )
            return conn.execute(query).mappings().all()

    @staticmethod
    def get_revenue_by_user(username: str) -> list[dict]:
        with engine.connect() as conn:
            query = (
                select(fatturato)
                .where(fatturato.c["username"] == username)
                .order_by(fatturato.c["year"])
            )
            return conn.execute(query).mappings().all()

    @staticmethod
    def get_revenue_by_user_and_year(username: str, year: int) -> dict | None:
        with engine.connect() as conn:
            query = select(fatturato).where(
                fatturato.c["username"] == username,
                fatturato.c["year"] == year,
            )
            return conn.execute(query).mappings().first()

    @staticmethod
    def upsert_revenue(username: str, year: int, revenue: float) -> bool:
        with engine.begin() as conn:
            if not Query._user_exists(conn, username):
                return False

            existing = conn.execute(
                select(fatturato).where(
                    fatturato.c["username"] == username,
                    fatturato.c["year"] == year,
                )
            ).mappings().first()

            if existing is None:
                query = insert(fatturato).values(
                    username=username,
                    year=year,
                    sales=float(revenue),
                )
            else:
                query = (
                    update(fatturato)
                    .where(
                        fatturato.c["username"] == username,
                        fatturato.c["year"] == year,
                    )
                    .values(sales=float(revenue))
                )

            return conn.execute(query).rowcount == 1

    @staticmethod
    def delete_revenue(username: str, year: int) -> bool:
        with engine.begin() as conn:
            query = delete(fatturato).where(
                fatturato.c["username"] == username,
                fatturato.c["year"] == year,
            )
            return conn.execute(query).rowcount == 1

    @staticmethod
    def getInfoFromUser(name: str) -> dict | None:
        with engine.connect() as conn:
            query = select(users).where(
                users.c["username"] == name
            )
            return conn.execute(query).mappings().first()

    @staticmethod
    def getInfoBySessionToken(token: str) -> dict | None:
        with engine.connect() as conn:
            query = select(sessions).where(
                sessions.c["token"] == token
            )
            return conn.execute(query).mappings().first()

    @staticmethod
    def getSessionsFromUser(user: str) -> list[dict]:
        with engine.connect() as conn:
            query = select(sessions).where(
                sessions.c["user"] == user
            ).order_by(
                sessions.c["scadenza"]
            )
            return conn.execute(query).mappings().all()

    @staticmethod
    def insertNewSession(user: str, token: str, expiring: float) -> bool:
        with engine.begin() as conn:
            query = insert(sessions).values(
                user = user,
                token = token,
                scadenza = expiring
            )
            return conn.execute(query).rowcount == 1

    @staticmethod
    def deleteSessionToken(token: str) -> bool:
        with engine.begin() as conn:
            query = delete(sessions).where(
                sessions.c["token"] == token
            )
            return conn.execute(query).rowcount == 1

    
    @staticmethod
    def is_admin(username: str) -> bool:
        user = Query.get_user(username)
        return user is not None and user["role"] == "admin"