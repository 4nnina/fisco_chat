# Funzionalita dell'applicativo Fiscozen Chat

## Obiettivo
L'applicativo permette di offrire un assistente AI orientato al contesto fiscale, con gestione utenti, configurazione centralizzata del chatbot e tracciamento storico delle conversazioni.

## Architettura (alto livello)
- Frontend web in React + TypeScript.
- Backend API in FastAPI.
- Persistenza dati su database SQLite (utenti, commercialisti, fatturato, sessioni) e file JSON per storico chat utente.

## Ruoli e accessi
- Utente standard:
  - Accesso alla chat AI.
  - Gestione profilo personale.
  - Consultazione storico chat personale (sola lettura).
- Admin:
  - Configurazione modello, prompt e tone of voice.
  - Gestione utenti.
  - Gestione commercialisti.
  - Gestione fatturato annuo per utente.
  - Consultazione storico chat di tutti gli utenti.

## Funzionalita principali

### 1) Autenticazione e sessione
- Login con username/password.
- Token di sessione salvato lato client.
- Endpoint di verifica token per proteggere le pagine riservate.
- Reindirizzamento automatico in base al ruolo (utente/admin).

### 2) Chatbot utente
- Invio messaggi all'assistente AI.
- Supporto storico conversazione nel payload per risposte contestuali.
- Nuova chat esplicita: il sistema crea un nuovo thread solo quando l'utente avvia davvero una nuova conversazione.
- Visualizzazione chat in formato bubble (utente/AI).

### 3) Storico chat utente
- Pagina dedicata per consultare lo storico personale.
- Dati in sola lettura.
- Conversazioni raggruppate per thread.
- Rendering in stile chat originale per coerenza UX.

### 4) Configurazione chatbot (admin)
- Selezione modello AI.
- Impostazione temperatura.
- Impostazione max history.
- Modifica system prompt template.
- Modifica tone of voice.
- Salvataggio configurazione con applicazione lato backend.

### 5) Gestione utenti (admin)
- Creazione utente (nome, cognome, username derivato, password, regime, cassa, commercialista, data apertura P.IVA).
- Aggiornamento utente esistente.
- Visualizzazione elenco utenti.
- Click su riga per precompilare il form.

### 6) Gestione commercialisti (admin)
- Selezione commercialista in fase creazione/aggiornamento utente.
- Possibilita di aggiungere un nuovo commercialista direttamente dalla pagina utenti.
- Salvataggio del nuovo commercialista nella tabella dedicata.
- Auto-selezione del commercialista appena creato nel form utente.

### 7) Gestione fatturato annuo (admin)
- Inserimento/aggiornamento fatturato per utente e anno.
- Tabella storico fatturato con selezione rapida per modifica.
- Funzionalita collocata nella pagina Admin Users.

### 8) Storico chat utenti (admin)
- Elenco utenti con metadati chat.
- Selezione utente e consultazione storico completo.
- Conversazioni raggruppate per thread.
- Visualizzazione in formato chat, sola lettura.

## Dati gestiti
- Utenti: credenziali (hash lato backend), profilo fiscale, ruolo.
- Commercialisti: chiave export, nome, cognome.
- Fatturato: valore annuale per utente.
- Sessioni: token e scadenza.
- Chat: storico per utente con timestamp, prompt, risposta, modello, conversation_id.

## Flusso tipico utente
1. Login.
2. Accesso a chatbot.
3. Conversazione con AI.
4. Eventuale avvio nuova chat.
5. Consultazione profilo.
6. Consultazione storico chat personale.

## Flusso tipico admin
1. Login admin.
2. Configurazione chatbot (modello/prompt/tone).
3. Creazione o modifica utenti.
4. Gestione commercialisti.
5. Gestione fatturato annuo.
6. Monitoraggio storico chat utenti.

## Note operative
- La temperatura influisce su variabilita/creativita delle risposte: valori bassi aumentano coerenza e prevedibilita.
- Le conversazioni sono persistite per utente e organizzate in thread.
- Le pagine storico sono progettate in sola lettura per audit e consultazione.
