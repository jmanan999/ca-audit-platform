import google.generativeai as genai
from app.core.config import settings
from typing import Optional
import json

genai.configure(api_key=settings.GEMINI_API_KEY)

async def analyze_audit_insights(audit_data: dict) -> str:
    """Generate AI insights for an audit using Gemini"""
    try:
        prompt = f"""
        Analyze this audit data and provide key insights and recommendations:
        
        Audit Data:
        {json.dumps(audit_data, indent=2)}
        
        Please provide:
        1. High-risk areas
        2. Compliance concerns
        3. Process improvements
        4. Overall risk assessment
        """
        
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise Exception(f"Gemini API call failed: {str(e)}")

async def analyze_document_for_insights(document_content: str, document_type: str) -> dict:
    """Extract and analyze document using Gemini"""
    try:
        prompt = f"""
        Analyze this {document_type} document and extract key information:
        
        Document Content:
        {document_content}
        
        Please extract:
        1. Document type confirmation
        2. Key values/amounts
        3. Important dates
        4. Any anomalies or flags
        5. Verification recommendations
        
        Return as JSON.
        """
        
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Parse JSON response
        try:
            insights = json.loads(response.text)
        except:
            insights = {"raw_insights": response.text}
        
        return insights
    except Exception as e:
        raise Exception(f"Document analysis failed: {str(e)}")

async def generate_risk_assessment(audit_data: dict) -> dict:
    """Generate risk assessment for audit"""
    try:
        prompt = f"""
        Based on this audit data, provide a detailed risk assessment:
        
        {json.dumps(audit_data, indent=2)}
        
        Return JSON with:
        - risk_level (high/medium/low)
        - risk_score (0-100)
        - key_risks (list)
        - recommendations (list)
        - confidence_score (0-100)
        """
        
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        try:
            assessment = json.loads(response.text)
        except:
            assessment = {"raw_assessment": response.text}
        
        return assessment
    except Exception as e:
        raise Exception(f"Risk assessment failed: {str(e)}")
