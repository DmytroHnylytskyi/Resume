from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import auth, courses, teacher, analytics
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mini-LMS API")

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
from dotenv import load_dotenv

load_dotenv()

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173,https://lumina-five-rose.vercel.app")
# Split by comma in case of multiple allowed origins
allowed_origins = [origin.strip() for origin in frontend_url.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins, # Restricted origins for better security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(teacher.router)
app.include_router(analytics.router)

@app.get("/")
def root():
    return {"message": "Welcome to Mini-LMS API"}
