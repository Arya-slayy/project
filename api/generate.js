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
      // Add system prompt to encourage proper formatting
      const enhancedPrompt = `You are a helpful AI assistant. Please provide a direct response without step numbers, language specifications, or special formatting. Here is the user's question: ${prompt}`;

      const response = await fetch('https://api-inference.huggingface.co/models/google/gemma-7b', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: enhancedPrompt,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false,
            clean_up_tokenization_spaces: true,
            remove_special_tokens: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Enhanced text cleaning
      if (Array.isArray(data)) {
        data[0].generated_text = data[0].generated_text
          .replace(/<[^>]*>/g, '')  // Remove XML-like tags
          .replace(/^(Step \d+:|In \w+:)/gm, '')  // Remove step numbers and language specifications
          .replace(/^\d+\.\s*/gm, '')  // Remove numbered lists
          .replace(/\b(Step|Steps?)(\s+\d+)?:/gi, '') // Remove any remaining step references
          .replace(/In (Hindi|English|Spanish|French|German):/gi, '') // Remove language specifications
          .replace(/^\s*[-*]\s*/gm, '') // Remove bullet points
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .replace(/\n{3,}/g, '\n\n')  // Normalize multiple line breaks
          .trim();
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
