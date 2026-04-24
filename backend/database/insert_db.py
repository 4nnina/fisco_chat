from manager import init_db, Query
import bcrypt

def euro_to_float(val: str) -> float:
    return float(val.replace("€", "").replace(",", ".").strip())


def date_to_iso(val: str) -> str:
    d, m, y = val.split("/")
    return f"{y}-{m}-{d}"


def make_key(nome: str, cognome: str) -> str:
    return f"{nome.lower()}.{cognome.lower()}"


def make_username(nome: str, cognome: str) -> str:
    return f"{nome.lower()}.{cognome.lower()}"


def main():
    init_db()

    # -------------------------
    # COMMERCIALISTI
    # -------------------------
    commercialisti = [
        ("Elena", "Bianchi"),
        ("Roberto", "Neri"),
    ]

    for nome, cognome in commercialisti:
        key = make_key(nome, cognome)
        Query.upsert_commercialista(key, nome, cognome)

    # -------------------------
    # UTENTI + FATTURATO
    # -------------------------
    data = [
        {
            "nome": "Mario",
            "cognome": "Rossi",
            "regime": "Forfettario",
            "cassa": "GS INPS",
            "commercialista": ("Elena", "Bianchi"),
            "apertura": "15/01/2023",
            "f2025": "78,50€",
            "f2026": "82,00€",
        },
        {
            "nome": "Giulia",
            "cognome": "Verdi",
            "regime": "Semplificato",
            "cassa": "INARCASSA",
            "commercialista": ("Roberto", "Neri"),
            "apertura": "10/03/2021",
            "f2025": "120,00€",
            "f2026": "45,00€",
        },
        {
            "nome": "Luca",
            "cognome": "Martini",
            "regime": "Forfettario",
            "cassa": "ENPAP",
            "commercialista": ("Elena", "Bianchi"),
            "apertura": "01/06/2024",
            "f2025": "30,00€",
            "f2026": "15,00€",
        },
        {
            "nome": "Elena",
            "cognome": "Riva",
            "regime": "Forfettario",
            "cassa": "ENPAPI",
            "commercialista": ("Roberto", "Neri"),
            "apertura": "20/11/2022",
            "f2025": "84,50€",
            "f2026": "5,00€",
        },
    ]

    for u in data:
        username = make_username(u["nome"], u["cognome"])
        comm_key = make_key(*u["commercialista"])

        password_hash = bcrypt.hashpw('user'.encode("utf-8"), bcrypt.gensalt())

        # Inserisci utente (se esiste già viene ignorato)
        Query.insert_user(
            username=username,
            password=password_hash,  # placeholder
            regime=u["regime"],
            cassa=u["cassa"],
            commercialista_key=comm_key,
            vat_opening_date=date_to_iso(u["apertura"]),
        )

        # Inserisci fatturato
        Query.upsert_revenue(username, 2025, euro_to_float(u["f2025"]))
        Query.upsert_revenue(username, 2026, euro_to_float(u["f2026"]))


    Query.insert_user(
    username="admin",
    password=bcrypt.hashpw('admin'.encode("utf-8"), bcrypt.gensalt()),
    role="admin",
)
    # -------------------------
    # OUTPUT DI VERIFICA
    # -------------------------
    print("\n✔ Database popolato\n")

    print("COMMERCIALISTI:")
    for c in Query.get_all_commercialisti():
        print(c)

    print("\nUTENTI:")
    for u in Query.get_all_users():
        print(u)

    print("\nFATTURATO:")
    for f in Query.get_all_revenue():
        print(f)


if __name__ == "__main__":
    main()