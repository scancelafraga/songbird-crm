import os
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from passlib.context import CryptContext
from jose import JWTError, jwt
import datetime
from typing import Optional

# --- SECURITY CONFIG ---
# En un futuro ideal, esto también debería venir de una variable de entorno
SECRET_KEY = "SUPER_SECRET_KEY_CHANGE_THIS_IN_PROD_PLEASE" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- DATABASE CONFIGURATION (PostgreSQL + SQLite Fallback) ---
# 1. Buscamos la variable en Render
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Configuración de argumentos (SQLite necesita check_same_thread, Postgres no)
connect_args = {}

if DATABASE_URL:
    # Estamos en Render (Producción)
    # Fix para SQLAlchemy: Render da "postgres://", necesitamos "postgresql://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # Estamos en Local (Tu PC) -> Usamos SQLite
    DATABASE_URL = "sqlite:///./messages.db"
    connect_args = {"check_same_thread": False}

# 3. Crear el motor de la base de datos
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- DB MODELS ---
class MessageDB(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, index=True)
    phone = Column(String, default="") 
    content = Column(Text)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

# Crea las tablas si no existen (Fundamental para Postgres nuevo)
Base.metadata.create_all(bind=engine)

# --- FASTAPI APP ---
app = FastAPI()

# --- CORS CONFIG ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://songbirdcolumbia.com",      # <--- Tu dominio oficial
    "https://www.songbirdcolumbia.com",  # <--- Versión con WWW
    "https://songbirdcolumbia.netlify.app" # Tu link de Netlify
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- AUTH HELPERS ---
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def get_password_hash(pwd): return pwd_context.hash(pwd)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401)
    user = db.query(UserDB).filter(UserDB.username == username).first()
    if user is None: raise HTTPException(status_code=401)
    return user

# --- STARTUP: CREATE ADMIN ---
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    # Usamos variables limpias
    NEW_USER = "alfredo_76!SongBird_Columbia_YeahYeah"
    NEW_PASS = "SongbirdColumbia!2026..senegal_origami" 
    
    user = db.query(UserDB).filter(UserDB.username == NEW_USER).first()
    if not user:
        print(f"--- CREATING NEW ADMIN ---")
        db.add(UserDB(username=NEW_USER, hashed_password=get_password_hash(NEW_PASS)))
        db.commit()
    db.close()

# --- SCHEMAS ---
class MessageCreate(BaseModel):
    name: str
    email: str
    phone: str 
    content: str

class MessageUpdate(BaseModel):
    status: str

# --- ROUTES ---
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    return {"access_token": create_access_token(data={"sub": user.username}), "token_type": "bearer"}

@app.post("/contact/")
def create_message(msg: MessageCreate, db: Session = Depends(get_db)):
    db.add(MessageDB(name=msg.name, email=msg.email, phone=msg.phone, content=msg.content))
    db.commit()
    return {"status": "ok"}

@app.get("/messages/")
def get_messages(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    return db.query(MessageDB).order_by(MessageDB.created_at.desc()).all()

@app.patch("/messages/{msg_id}/status")
def update_status(msg_id: int, update: MessageUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    msg = db.query(MessageDB).filter(MessageDB.id == msg_id).first()
    if not msg: raise HTTPException(status_code=404)
    msg.status = update.status
    db.commit()
    return {"status": "updated"}

@app.delete("/messages/{msg_id}")
def delete_message(msg_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    msg = db.query(MessageDB).filter(MessageDB.id == msg_id).first()
    if not msg: raise HTTPException(status_code=404)
    db.delete(msg)
    db.commit()
    return {"status": "deleted"}