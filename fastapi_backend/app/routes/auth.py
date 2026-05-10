from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.models.user import User, UserRole, CA_ROLES
import jwt
import logging
from datetime import datetime, timedelta
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    firebase_available = True
except ImportError:
    firebase_admin = None
    firebase_auth = None
    firebase_available = False

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
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
    db_user = db.query(User).filter(User.email == user.email).first()

    auto_approved = user.role in CA_ROLES

    if db_user:
        if not db_user.firebase_uid.startswith("temp_"):
            raise HTTPException(status_code=400, detail="User already registered")
        db_user.name = user.name
        db_user.phone = user.phone
        db_user.role = user.role
        db_user.department = user.department
        db_user.is_approved = auto_approved
        db.commit()
        db.refresh(db_user)
        return db_user

    new_user = User(
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=user.role,
        department=user.department,
        firebase_uid=f"temp_{user.email}",
        is_approved=auto_approved,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
def login(user_login: UserLogin, db: Session = Depends(get_db)):
    try:
        if firebase_available:
            try:
                decoded_token = firebase_auth.verify_id_token(user_login.firebase_token)
            except Exception as e:
                logger.error("Firebase token verification failed: %s", e)
                raise HTTPException(status_code=401, detail=f"Firebase token invalid: {str(e)}")
            firebase_uid = decoded_token["uid"]
            email = decoded_token.get("email", "")
        else:
            firebase_uid = f"dev_{user_login.firebase_token[:10]}"
            email = "dev@example.com"

        # Look up by real Firebase UID first
        db_user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

        if not db_user:
            # First login after /register — the record was saved with a temp_ UID.
            # Bridge it by finding the matching email and updating the UID.
            db_user = db.query(User).filter(User.email == email).first()
            if db_user:
                db_user.firebase_uid = firebase_uid
                db.commit()
                db.refresh(db_user)
            else:
                # No prior registration record — create one on the fly.
                default_role = UserRole.ADMIN if not firebase_available else UserRole.AUDITOR
                db_user = User(
                    firebase_uid=firebase_uid,
                    email=email,
                    name="Development User" if not firebase_available else "",
                    role=default_role,
                    is_approved=default_role in CA_ROLES,
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)

        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        encoded_jwt = jwt.encode(
            {"sub": firebase_uid, "exp": expire},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

        return {
            "access_token": encoded_jwt,
            "token_type": "bearer",
            "user": UserResponse.from_orm(db_user),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed unexpectedly: %s", e)
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user
