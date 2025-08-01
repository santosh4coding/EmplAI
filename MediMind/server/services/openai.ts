import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface AIResponse {
  message: string;
  intent?: string;
  confidence?: number;
  actions?: string[];
}

export async function processHospitalQuery(
  userMessage: string,
  userRole: string,
  context?: any
): Promise<AIResponse> {
  try {
    const systemPrompt = `You are an AI assistant for a hospital front desk system. 
    The user's role is: ${userRole}
    
    You can help with:
    - Appointment booking and scheduling
    - Queue status and wait times
    - Doctor availability
    - Department information
    - General hospital services
    - Patient registration guidance
    - Insurance and billing queries
    
    Provide helpful, accurate responses specific to hospital operations.
    Respond with JSON in this format: { "message": "your response", "intent": "detected intent", "confidence": 0.95, "actions": ["suggested actions"] }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      message: result.message || "I'm here to help with your hospital needs.",
      intent: result.intent || "general_inquiry",
      confidence: result.confidence || 0.8,
      actions: result.actions || []
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      message: "I'm experiencing technical difficulties. Please contact front desk staff for immediate assistance.",
      intent: "error",
      confidence: 0.0,
      actions: ["contact_staff"]
    };
  }
}

export async function analyzePatientFeedback(feedbackText: string): Promise<{
  sentiment: "positive" | "negative" | "neutral";
  priority: "low" | "medium" | "high";
  category: string;
  summary: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are analyzing patient feedback for a hospital. Classify the sentiment, priority, and category. Respond with JSON in this format: { 'sentiment': 'positive/negative/neutral', 'priority': 'low/medium/high', 'category': 'service/medical/facilities/staff/billing/other', 'summary': 'brief summary' }"
        },
        {
          role: "user",
          content: feedbackText
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      sentiment: result.sentiment || "neutral",
      priority: result.priority || "medium",
      category: result.category || "other",
      summary: result.summary || "Patient feedback received"
    };
  } catch (error) {
    console.error("Feedback analysis error:", error);
    return {
      sentiment: "neutral",
      priority: "medium",
      category: "other",
      summary: "Unable to analyze feedback"
    };
  }
}

export async function generateAppointmentSummary(
  patientName: string,
  symptoms: string,
  department: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Generate a brief appointment summary for hospital records. Be professional and concise."
        },
        {
          role: "user",
          content: `Patient: ${patientName}\nSymptoms: ${symptoms}\nDepartment: ${department}`
        }
      ],
      max_tokens: 200,
    });

    return response.choices[0].message.content || "Appointment scheduled for patient consultation.";
  } catch (error) {
    console.error("Summary generation error:", error);
    return "Appointment scheduled for patient consultation.";
  }
}
