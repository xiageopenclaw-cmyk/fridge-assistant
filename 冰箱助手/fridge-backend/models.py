from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class FoodItem(BaseModel):
    id: Optional[int] = None
    name: str
    category: str
    quantity: float = 1
    unit: str = "件"
    purchase_date: Optional[str] = None
    expiry_date: str
    image_url: Optional[str] = None


class RecordEntry(BaseModel):
    id: Optional[int] = None
    type: str
    description: str
    items_used: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[str] = None


class NutritionSummary(BaseModel):
    date: str
    protein_g: float = 0
    fat_g: float = 0
    carbs_g: float = 0
    fiber_g: float = 0
    calories: float = 0
    note: Optional[str] = None


class UserProfile(BaseModel):
    family_size: int = 2
    preferences: List[str] = Field(default_factory=lambda: ["中式", "清淡"])
    allergies: List[str] = Field(default_factory=list)
    dislikes: List[str] = Field(default_factory=list)
    special_needs: Optional[str] = None
    cook_time: str = "30min"


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
