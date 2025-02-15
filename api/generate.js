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
      // Enhanced prompt to encourage narrative format
      const enhancedPrompt = `You are a creative storyteller. Write a flowing narrative response about: ${prompt}. Tell the story naturally, without using steps, numbers, or question-answer format.`;

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
            return_full_text: false
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data[0]?.generated_text) {
        let cleanedText = data[0].generated_text
          // Remove step patterns
          .replace(/Step \d+\/\d+/g, '')
          .replace(/^\d+[\.)]/gm, '')
          // Remove Q&A patterns
          .replace(/^Q:|^A:/gm, '')
          .replace(/^Question:|^Answer:/gm, '')
          // Remove other formatting
          .replace(/^[-*•]/gm, '')
          .replace(/^(Here is|Below is|This is).*(example|response).*\n/gi, '')
          .replace(/In (Hindi|English|Spanish|French|German):/gi, '')
          // Clean up whitespace
          .replace(/\n\s*\n/g, '\n')
          .replace(/\s+/g, ' ')
          .trim();

        // Combine fragmented sentences
        cleanedText = cleanedText
          .split(/\n/)
          .filter(line => line.trim().length > 0)
          .map(line => line.trim())
          .join(' ');

        // Ensure proper ending
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
