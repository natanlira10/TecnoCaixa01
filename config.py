import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Neon suspende o banco quando ocioso: testa a conexão antes de usar
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}

    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "chave_padrao"
    )

    DEBUG = os.getenv(
        "FLASK_DEBUG",
        "False"
    ).lower() == "true"

    # Chave e modelo do chatbot Gemini (lidos do .env)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "")

    # Conta padrão do administrador (criada na primeira execução)
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@tecnocaixa.com")
    ADMIN_SENHA = os.getenv("ADMIN_SENHA", "admin123")
    ADMIN_NOME = os.getenv("ADMIN_NOME", "Administrador TecnoCaixa")