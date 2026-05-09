from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.models.user import User
from typing import Optional
import jwt
from datetime import datetime, timedelta
from app.core.config import settings

# Firebase imports - handle gracefully for development
try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    firebase_available = True
except ImportError:
    firebase_admin = None
    firebase_auth = None
    firebase_available = False

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def get_current_user(db: Session = Depends(get_db), token: Optional[str] = None) -> User:
    """Get current authenticated user from token"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization token provided"
        )
    
    try:
        # Verify JWT token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        firebase_uid: str = payload.get("sub")
        if firebase_uid is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="User already registered")
    
    # Create user in database
    new_user = User(
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=user.role,
        department=user.department,
        firebase_uid=f"temp_{user.email}"  # Will be updated on login with Firebase UID
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/login")
def login(user_login: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with Firebase token or development mode"""
    try:
        if firebase_available:
            # Verify Firebase token
            decoded_token = firebase_auth.verify_id_token(user_login.firebase_token)
            firebase_uid = decoded_token['uid']
            email = decoded_token.get('email', '')
        else:
            # Development mode - accept any token as valid
            firebase_uid = f"dev_{user_login.firebase_token[:10]}"  # Use first 10 chars as UID
            email = "dev@example.com"
        
        # Find or create user
        db_user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        if not db_user:
            # Create new user
            db_user = User(
                firebase_uid=firebase_uid,
                email=email,
                name="Development User" if not firebase_available else "",
                role="ADMIN" if not firebase_available else "AUDITOR"
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        
        # Generate JWT token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expire = datetime.utcnow() + access_token_expires
        to_encode = {"sub": firebase_uid, "exp": expire}
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        return {
            "access_token": encoded_jwt,
            "token_type": "bearer",
            "user": UserResponse.from_orm(db_user)
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
