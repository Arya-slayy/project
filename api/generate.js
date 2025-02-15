export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { prompt, mode } = await req.json();
    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

    if (!HUGGINGFACE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'text') {
      // Enhanced system prompt to get direct content
      const enhancedPrompt = `You are a helpful AI assistant. Provide a direct response about the topic. Do not give examples, instructions, or meta-commentary about how to write. Simply write the actual content requested. Here is the topic:

${prompt}

Remember: Give the actual content only, no meta-commentary or instructions.`;

      const response = await fetch('https://api-inference.huggingface.co/models/google/gemma-7b', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: enhancedPrompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false,
            clean_up_tokenization_spaces: true,
            remove_special_tokens: true,
            stop: ["</s>", "\n\n\n"],
            repetition_penalty: 1.2
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        let cleanedText = data[0].generated_text
          // Remove meta-commentary and instructions
          .replace(/^(Here is|Below is|This is|Following is).*example.*\n?/gi, '')
          .replace(/^(Here's|Below is|This is|Following is).*response.*\n?/gi, '')
          .replace(/Note how.*\n?/gi, '')
          .replace(/When writing.*\n?/gi, '')
          .replace(/Your (essay|response|answer|paragraph) should.*\n?/gi, '')
          .replace(/The (essay|response|answer|paragraph) should.*\n?/gi, '')
          .replace(/You (can|should|must|need to).*\n?/gi, '')
          .replace(/Let('s| us) write.*\n?/gi, '')
          .replace(/^[a-z]\)\s.*\n?/gi, '') // Remove letter prefixes like "a)" or "b)"
          .replace(/For example.*\n?/gi, '')
          .replace(/Example:.*\n?/gi, '')
          // Standard cleanup
          .replace(/<[^>]*>/g, '')
          .replace(/^(Step \d+:|In \w+:)/gm, '')
          .replace(/^\d+\.\s*/gm, '')
          .replace(/\b(Step|Steps?)(\s+\d+)?:/gi, '')
          .replace(/In (Hindi|English|Spanish|French|German):/gi, '')
          .replace(/^\s*[-*]\s*/gm, '')
          .replace(/^(Question|Query|Prompt|Answer|Response):/gi, '')
          .replace(/I would like to.*$/gm, '')
          .replace(/The paragraph should be.*$/gm, '')
          .replace(/.*words\.\s*/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        // Remove any remaining prompt repetition at the start
        const promptWords = prompt.toLowerCase().split(' ').slice(0, 5).join(' ');
        if (cleanedText.toLowerCase().startsWith(promptWords)) {
          cleanedText = cleanedText.substring(promptWords.length).trim();
        }

        // Check for and fix abrupt endings
        if (cleanedText.match(/[a-zA-Z]$/)) {
          cleanedText = cleanedText.replace(/\s+\w+$/, '');
          cleanedText += '.';
        }

        // Ensure proper sentence ending
        if (!cleanedText.match(/[.!?]$/)) {
          cleanedText += '.';
        }

        data[0].generated_text = cleanedText;
      }

      return new Response(JSON.stringify(data), {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });
    } else {
      const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: prompt,
          parameters: {
            guidance_scale: 7.5,
            num_inference_steps: 50
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const imageData = await response.arrayBuffer();
      return new Response(imageData, {
        headers: { 
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000'
        },
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: `Generation failed: ${error.message}` 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
