## 📂 Backend folder structure

```bash
├── database                        
│   ├── db.sqlite3                  -> application database 
│   └── manager.py                  -> sqlalchemy interface to database (schemas & queries)
├── FAST
│   └── README.md                   -> explains all about FAST algorithm, read It
├── index.html                      -> default page for backend main route 
├── logs
│   └── logConfig.py                -> log configuration (this dir will contain app.log)
├── main.py                         -> server entry point, route manager 
├── model.py                        -> manages data and executes queries and functions
├── prompts
│   ├── build.py                    -> utility script, not crucial
│   ├── prompt-v0.md                -> ...
│   ├── prompt-v1.md                -> ...
│   ├── prompt-v2.md                -> many prompt templates for LLM (feel free to add more)
│   ├── prompt-v3.md                -> ...
│   └── prompt-v4.md                -> ...
├── README.md                       -> this file
├── requirements.txt                -> required libraries for backend code
└── run.sh                          -> backend server starter
```

---

### 💭 Remember

If the server is on, you can see API documentation at <a href="http://127.0.0.1:5000">`http://127.0.0.1:5000`</a>