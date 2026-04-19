// src/lib/ai.js
// ⚠️ TEMPORARY: Hardcoded API keys for LOCAL DEVELOPMENT only.
// Before deploying to production, replace this file with the cloud function version.
// Never commit real API keys to version control.

// ===== Replace these with your actual API keys =====
const GEMINI_API_KEY = 'AIzaSyBd2qKpt0jdWgil-Tl1c4zuPdV9Qe6G_so'; // Your Gemini key
const OPENAI_API_KEY = 'sk-proj-...'; // Your OpenAI key
// ===================================================

export async function rephraseContent(text, context) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Rephrase this ${context} to be more engaging, clear, and neutral. Return only the improved version:\n\nOriginal: "${text}"\n\nImproved:` }]
          }]
        })
      }
    );
    const data = await response.json();
    const improved = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
    return { improvedText: improved.trim() };
  } catch (err) {
    console.error('Rephrase error:', err);
    return { improvedText: text };
  }
}

export async function generatePollSuggestions(topic) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a poll about "${topic}". Provide:
              1. One engaging question (max 120 characters)
              2. 4 concise options (max 50 characters each)
              Format your response as JSON: {question: "question text", options: ["option1", "option2", "option3", "option4"]}`
            }]
          }]
        })
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('Poll generation error:', err);
    return { question: `What do you think about ${topic}?`, options: ['Love it', 'It\'s okay', 'Not a fan', 'No opinion'] };
  }
}

export async function rewritePromptForDalle(prompt) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Rewrite the following user prompt to be completely safe for DALL‑E image generation.
              Keep the core meaning and subject but remove any violent, hateful, or policy‑violating terms.
              Make the description neutral, descriptive, and visually evocative.
              Return only the rewritten prompt.

              Original: "${prompt}"`
            }]
          }]
        })
      }
    );
    const data = await response.json();
    const rewritten = data.candidates?.[0]?.content?.parts?.[0]?.text || prompt;
    return { rewritten: rewritten.trim() };
  } catch (err) {
    console.error('Rewrite error:', err);
    return { rewritten: prompt };
  }
}

export async function generateImage(prompt, quality = 'standard') {
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: quality,
      })
    });
    const data = await response.json();
    const url = data.data?.[0]?.url;
    if (!url) throw new Error('No image URL');
    return { url };
  } catch (err) {
    console.error('Image generation error:', err);
    throw err;
  }
}