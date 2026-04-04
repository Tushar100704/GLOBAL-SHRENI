from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import os
from openai import OpenAI
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

# Models
class User(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class WalletAnalysis(BaseModel):
    address: str

class ChatMessage(BaseModel):
    message: str

class ContractScan(BaseModel):
    address: str
    code: str = None

# App
app = FastAPI(title="ARISE Guardian API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
mongo_url = os.getenv("MONGODB_URL")
if mongo_url:
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client.arise_guardian
        db_available = True
    except Exception:
        client = None
        db = None
        db_available = False
else:
    client = None
    db = None
    db_available = False

# In-memory storage for demo
users = {}

# AI
try:
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception:
    openai_client = None

# Auth
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@app.post("/register")
async def register(user: User):
    if db_available:
        existing = await db.users.find_one({"email": user.email})
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        hashed = get_password_hash(user.password)
        await db.users.insert_one({"email": user.email, "password": hashed})
    else:
        if user.email in users:
            raise HTTPException(status_code=400, detail="User already exists")
        hashed = get_password_hash(user.password)
        users[user.email] = {"password": hashed}
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "message": "User created"}

@app.post("/login")
async def login(user: User):
    if db_available:
        db_user = await db.users.find_one({"email": user.email})
        if not db_user or not verify_password(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        if user.email not in users or not verify_password(user.password, users[user.email]["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/dashboard")
async def dashboard(current_user: dict = Depends(get_current_user)):
    return {
        "total_assets": 12894.56,
        "risk_score": 32,
        "alerts": 3,
        "network": "Ethereum",
        "transactions": [
            {"hash": "0xabc123...", "type": "Swap", "amount": "0.82 ETH", "status": "Success", "date": "2026-04-04"},
            {"hash": "0xdef456...", "type": "Transfer", "amount": "125 USDC", "status": "Success", "date": "2026-04-03"},
            {"hash": "0xghi789...", "type": "Approval", "amount": "0 DAI", "status": "Pending", "date": "2026-04-02"}
        ],
        "monitored_contracts": [
            {"address": "0x85f53b...", "label": "StableSwap Vault", "risk": "Moderate"},
            {"address": "0x4b21a1...", "label": "DeFi Oracle", "risk": "Safe"}
        ]
    }

@app.post("/analyze-wallet")
async def analyze_wallet(analysis: WalletAnalysis, current_user: dict = Depends(get_current_user)):
    risk_score = 42 if analysis.address else 0
    status = "Safe" if risk_score < 30 else "Moderate" if risk_score < 70 else "Risky"
    return {
        "wallet": analysis.address,
        "chain": "Ethereum",
        "risk_score": risk_score,
        "status": status,
        "estimated_value": 9876.54,
        "top_tokens": [
            {"symbol": "ETH", "balance": "0.78", "usd_value": 1920.00},
            {"symbol": "USDC", "balance": "1240", "usd_value": 1240.00}
        ],
        "recommendations": [
            "Use a hardware wallet for high-value holdings",
            "Avoid interacting with unverified contracts",
            "Enable layered wallet monitoring"
        ],
        "recent_activity": [
            {"hash": "0xabc123...", "action": "Swap", "value": "0.82 ETH", "date": "2026-04-04"},
            {"hash": "0xdef456...", "action": "Transfer", "value": "125 USDC", "date": "2026-04-03"}
        ]
    }

@app.post("/chat")
async def chat(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    if openai_client:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": message.message}]
        )
        return {"response": response.choices[0].message.content}
    else:
        return {
            "response": "Mock AI response: Please configure OPENAI_API_KEY for real AI assistance. "
                        "This demo assistant can explain smart contracts and detect suspicious patterns."
        }

@app.post("/scan-contract")
async def scan_contract(scan: ContractScan, current_user: dict = Depends(get_current_user)):
    flags = []
    if "transferFrom(" in (scan.code or "") or "delegatecall" in (scan.code or ""):
        flags.append("Unsafe call patterns")
    if "withdraw(" in (scan.code or "") or "call.value" in (scan.code or ""):
        flags.append("Potential reentrancy")
    if not flags:
        flags = ["No major issues detected in basic pattern scan"]
    return {
        "address": scan.address,
        "contract_type": "ERC-20" if "ERC20" in (scan.code or "") else "Smart Contract",
        "audit_score": 78,
        "flags": flags,
        "recommendations": [
            "Review external call handling",
            "Verify owner and admin controls",
            "Run a full Solidity audit for production deployments"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)