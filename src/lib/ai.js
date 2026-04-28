// src/lib/ai.js – calls Firebase Cloud Functions (Vertex AI + OpenAI)
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Callable function references
const generatePollCall = httpsCallable(functions, 'generatePollWithAI');
const rephraseContentCall = httpsCallable(functions, 'rephraseContent');
const generateImageCall = httpsCallable(functions, 'generateImage');
const generateOptionImagesCall = httpsCallable(functions, 'generateOptionImages');
const generatePollFromURLCall = httpsCallable(functions, 'generatePollFromURL');
const generatePollInsightsCall = httpsCallable(functions, 'generatePollInsights');
const generateAndUploadImageCall = httpsCallable(functions, 'generateAndUploadImage');
const getDetailedPromptCall = httpsCallable(functions, 'getDetailedPrompt');   // NEW

/**
 * Generate poll suggestions (question + options) using Vertex AI.
 * @param {string} topic – The topic for the poll.
 * @param {number} numOptions – Number of options (2-6).
 * @param {string} pollType – 'quick', 'yesno', 'rating', 'comparison', 'live', 'rating_multiple'.
 * @param {string} action – 'generate', 'addOption', 'rephrase', 'complete'.
 * @param {string[]} existingOptions – Existing options (for 'addOption', 'rephrase', 'complete').
 * @returns {Promise<{question: string, options?: string[], scale?: {min: number, max: number, step: number}}>}
 */
export async function generatePollSuggestions(topic, numOptions = 4, pollType = 'quick', action = 'generate', existingOptions = []) {
  console.log('[Frontend] generatePollSuggestions called:', { topic, numOptions, pollType, action });
  try {
    const result = await generatePollCall({
      topic,
      numOptions,
      pollType,
      action,
      existingOptions,
    });
    console.log('[Frontend] generatePollSuggestions success:', result.data);
    return result.data;
  } catch (err) {
    console.error('[Frontend] generatePollSuggestions error:', err);
    throw err;
  }
}

/**
 * Rephrase a piece of text using Vertex AI.
 * @param {string} text – The text to rephrase.
 * @param {string} context – Context like 'question', 'option', 'content', etc.
 * @returns {Promise<string>} The rephrased text.
 */
export async function rephraseContent(text, context = 'text') {
  console.log('[Frontend] rephraseContent called, text length:', text?.length);
  try {
    const result = await rephraseContentCall({ text, context });
    console.log('[Frontend] rephraseContent success, rephrased length:', result.data.rephrased?.length);
    return result.data.rephrased;
  } catch (err) {
    console.error('[Frontend] rephraseContent error:', err);
    return text; // fallback to original
  }
}

/**
 * Generate a single image using DALL‑E (with automatic prompt rewriting on the server).
 * @param {string} prompt – Description of the image.
 * @param {string} context – 'poll question' or 'poll option' (used for rewriting).
 * @returns {Promise<string>} URL of the generated image.
 */
export async function generateImage(prompt, context = 'poll question') {
  console.log('[Frontend] generateImage called, prompt length:', prompt?.length);
  try {
    const result = await generateImageCall({ prompt, context });
    console.log('[Frontend] generateImage success, URL:', result.data.imageUrl);
    return result.data.imageUrl;
  } catch (err) {
    console.error('[Frontend] generateImage error:', err);
    throw err;
  }
}

/**
 * Generate images for multiple poll options in batch.
 * @param {string[]} optionTexts – Array of option texts.
 * @param {string} pollQuestion – The poll question (for context).
 * @returns {Promise<(string | null)[]>} Array of image URLs (null for failed).
 */
export async function generateOptionImages(optionTexts, pollQuestion) {
  console.log('[Frontend] generateOptionImages called, options count:', optionTexts.length);
  try {
    const result = await generateOptionImagesCall({ optionTexts, pollQuestion });
    console.log('[Frontend] generateOptionImages success, images count:', result.data.imageUrls?.length);
    return result.data.imageUrls;
  } catch (err) {
    console.error('[Frontend] generateOptionImages error:', err);
    return optionTexts.map(() => null);
  }
}

/**
 * Generate poll from a URL (article).
 * @param {string} url – The article URL.
 * @param {number} numOptions – Number of options (2-6).
 * @param {string} pollType – 'quick', 'yesno', etc.
 * @returns {Promise<{question: string, options: string[]}>}
 */
export async function generatePollFromURL(url, numOptions = 4, pollType = 'quick') {
  console.log('[Frontend] generatePollFromURL called:', { url, numOptions, pollType });
  try {
    const result = await generatePollFromURLCall({ url, numOptions, pollType });
    console.log('[Frontend] generatePollFromURL success:', result.data);
    return result.data;
  } catch (err) {
    console.error('[Frontend] generatePollFromURL error:', err);
    throw err;
  }
}

/**
 * Generate AI insights for a poll (Premium feature).
 * @param {string} pollId – The poll ID.
 * @returns {Promise<{text: string, suggestion: string}>}
 */
export async function generatePollInsights(pollId) {
  console.log('[Frontend] generatePollInsights called for poll:', pollId);
  try {
    const result = await generatePollInsightsCall({ pollId });
    console.log('[Frontend] generatePollInsights success');
    return result.data;
  } catch (err) {
    console.error('[Frontend] generatePollInsights error:', err);
    throw err;
  }
}

/**
 * Generate and upload an image (single call) – no CORS issues.
 * @param {string} prompt – The image description.
 * @param {string} folder – Firebase Storage folder path (e.g., "polls/{uid}/questions").
 * @param {string} context – 'poll_question' or 'poll_option'.
 * @param {string} style – Image style (auto, photorealistic, etc.)
 * @param {string} pollQuestion – The poll question (for context).
 * @param {string[]} pollOptions – Array of all option texts (for context and consistency).
 * @param {number} [optionIndex] – Option index (for option images).
 * @param {number} [totalOptions] – Total number of options.
 * @returns {Promise<string>} Permanent Firebase Storage URL.
 */
export async function generateAndUploadImage(
  prompt,
  folder,
  context = 'poll_question',
  style = 'auto',
  pollQuestion = undefined,
  pollOptions = [],
  optionIndex = undefined,
  totalOptions = undefined,
  pollType = 'quick',
  customPrompt = false
) {
  console.log('[Frontend] generateAndUploadImage called', { customPrompt });
  const result = await generateAndUploadImageCall({
    prompt,
    folder,
    context,
    style,
    pollQuestion,
    pollOptions,
    optionIndex,
    totalOptions,
    pollType,
    customPrompt,
  });
  return result.data.imageUrl;
}

/**
 * Get a detailed, Gemini‑crafted DALL‑E prompt without generating an image.
 * @param {string} subject – The raw question or option text.
 * @param {string} context – 'poll_question' or 'poll_option'.
 * @param {string} style – Image style (auto, photorealistic, etc.)
 * @param {string} pollQuestion – The poll question (for context).
 * @param {string[]} pollOptions – All option texts.
 * @param {number} [optionIndex] – Option index (for options).
 * @param {number} [totalOptions] – Total number of options.
 * @param {string} pollType – Poll type (quick, yesno, etc.)
 * @returns {Promise<string>} The detailed prompt.
 */
export async function getDetailedPrompt(
  subject,
  context = 'poll_question',
  style = 'auto',
  pollQuestion = undefined,
  pollOptions = [],
  optionIndex = undefined,
  totalOptions = undefined,
  pollType = 'quick'
) {
  console.log('[Frontend] getDetailedPrompt called');
  const result = await getDetailedPromptCall({
    subject,
    context,
    style,
    pollQuestion,
    pollOptions,
    optionIndex,
    totalOptions,
    pollType,
  });
  return result.data.detailedPrompt;
}

// Kept for backward compatibility (if any code still calls it)
export async function rewritePromptForDalle(prompt) {
  console.warn('[Frontend] rewritePromptForDalle is deprecated; rewriting is done server‑side in generateImage.');
  return prompt;
}