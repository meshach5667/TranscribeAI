import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv

load_dotenv()

# LangChain reads GOOGLE_API_KEY automatically; alias from our GEMINI_API_KEY
if os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY", "")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.3,
)

summary_template = PromptTemplate(
    input_variables=["transcript"],
    template="""You are a professional transcription analyst.

Here is a transcript of an audio/video file:

{transcript}

Analyse the transcript and respond with **plain formatted text** (NOT JSON, NOT markdown code blocks). Use this exact structure:

SUMMARY
Write a concise 2-3 sentence summary of the content.

HIGHLIGHTS
• First key point or highlight
• Second key point
• (add more as needed)

ACTION ITEMS
• First action item identified
• Second action item
• (write "None identified" if there are no action items)

Do your best to infer timestamps or speaker shifts logically even if the raw transcript lacks them.
Respond ONLY with the plain text above — no JSON, no code fences, no extra commentary.
"""
)

async def generate_summary(transcript: str, sio, job_id: str) -> str:
    """
    Uses LangChain and a Gemini LLM to generate summaries, highlights, and action items.
    """
    await sio.emit(f"job-{job_id}", {"status": "processing", "message": "Generating summary and highlights with Gemini & LangChain..."})
    
    try:
        # Running the LangChain standard invoke
        chain = summary_template | llm
        response = await chain.ainvoke({"transcript": transcript})
        
        return response.content
    except Exception as e:
        print(f"LangChain processing error: {e}")
        raise Exception(f"Summary generation failed: {str(e)}")
