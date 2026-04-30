import { GoogleGenAI, GenerateContentParameters, Type } from "@google/genai";

const MAX_RETRIES = 7;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

export async function generateContentWithRetry(params: GenerateContentParameters) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let lastError: any;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      
      // Better error stringification
      let errorString = '';
      try {
        errorString = JSON.stringify(error);
        if (errorString === '{}' && error instanceof Error) {
          errorString = error.message + ' ' + (error.stack || '');
        }
      } catch (e) {
        errorString = String(error);
      }
      
      const errorMessage = (error.message || '').toLowerCase();
      const status = error.status || (error.error && error.error.code) || error.code;
      const statusText = (error.statusText || (error.error && error.error.status) || '').toLowerCase();
      
      // Extensive check for 429 / Rate Limit / Quota errors
      const isRateLimit = status === 429 ||
                          errorMessage.includes('429') || 
                          errorMessage.includes('resource_exhausted') ||
                          errorMessage.includes('rate limit') ||
                          errorMessage.includes('quota') ||
                          statusText.includes('resource_exhausted') ||
                          errorString.toLowerCase().includes('429') ||
                          errorString.toLowerCase().includes('resource_exhausted');
      
      if (isRateLimit && i < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);
        console.warn(`Gemini rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors or if we've exhausted retries, throw
      throw error;
    }
  }
  
  throw lastError;
}

export async function generateReportInsights(reportData: any) {
  try {
    const prompt = `
      You are an expert AI Financial Analyst for Neoteric Properties, a property management company. 
      Your task is to analyze utility bill data and provide advanced, actionable insights.
      
      REPORT DATA:
      Summary:
      - Total Expense: ₹${reportData.totalAmount?.toLocaleString() || 0}
      - Total Bills: ${reportData.totalCount || 0}
      - Paid Amount: ₹${reportData.paidAmount?.toLocaleString() || 0}
      - Pending Amount: ₹${reportData.pendingAmount?.toLocaleString() || 0}
      
      Category Breakdown (Module-wise):
      ${JSON.stringify(reportData.categoryData, null, 2)}
      
      Subcategory Breakdown (Detailed):
      ${JSON.stringify(reportData.subcategoryData, null, 2)}
      
      Monthly Trend (Temporal):
      ${JSON.stringify(reportData.monthlyTrend, null, 2)}

      Bills Samples (Audit Trail):
      ${JSON.stringify(reportData.bills?.slice(0, 20), null, 2)}

      Please provide your analysis structured in these 4 specific sections:
      
      1. 📈 SPENDING TREND ANALYSIS: Analyze monthly fluctuations. Is spending increasing? Which month had the highest spike and why might that be? Compare module-wise performance.
      
      2. 💰 COST-SAVING OPPORTUNITIES: Identify specific areas where expenses can be reduced. For example, if "Electricity" is high, suggest peak-hour optimization or solar maintenance. If "Telecom" is high, suggest plan reviews. Be specific to the data provided.
      
      3. ⚠️ ANOMALY & RISK ALERTS: Detect unusual patterns. Are there payments that are significantly higher than the average for that category? Is the "Pending Amount" alarming? Identify any missing monthly bills for critical services.
      
      4. 🚀 STRATEGIC RECOMMENDATIONS: Provide 3 clear, actionable steps the management should take next month to improve financial efficiency.

      FORMATTING RULES:
      - Use professional, business-oriented language.
      - Use emojis for bullet points to make it readable.
      - Bold key figures and categories.
      - Ensure the tone is proactive and helpful.
      - Keep it concise but data-rich.
    `;

    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Failed to generate report insights:", error);
    return "The AI Intelligence Engine encountered an error while analyzing your data. Please check your connectivity and try again.";
  }
}
