// File: api/generate.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, mode } = req.body;
  const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

  try {
    if (mode === 'text') {
      const response = await fetch('https://api-inference.huggingface.co/models/google/gemma-7b', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false
          }
        }),
      });

      const data = await response.json();
      return res.status(200).json(data);
    } else {
      const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
      });

      const buffer = await response.buffer();
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(buffer);
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// File: public/index.html (Only showing the modified script section)
<script>
    const modeBtns = document.querySelectorAll('.mode-btn');
    const generateBtn = document.getElementById('generate');
    const promptInput = document.getElementById('prompt');
    const resultText = document.querySelector('.result-text');
    const resultImage = document.querySelector('.result-image');
    const loader = document.querySelector('.loader');
    const errorMessage = document.querySelector('.error-message');

    let currentMode = 'text';

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        promptInput.placeholder = currentMode === 'text' 
          ? "Ask me anything..." 
          : "Describe an image you'd like me to create...";
        clearResults();
      });
    });

    function clearResults() {
      resultText.textContent = '';
      resultImage.style.display = 'none';
      errorMessage.style.display = 'none';
    }

    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
      console.error('Error:', message);
    }

    async function generate(prompt, mode) {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, mode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      if (mode === 'text') {
        const data = await response.json();
        return data[0]?.generated_text || data.generated_text || "No response generated.";
      } else {
        return response.blob();
      }
    }

    generateBtn.addEventListener('click', async () => {
      const prompt = promptInput.value.trim();
      if (!prompt) {
        showError('Please enter a prompt first.');
        return;
      }

      clearResults();
      generateBtn.disabled = true;
      loader.style.display = 'block';

      try {
        if (currentMode === 'text') {
          const generatedText = await generate(prompt, 'text');
          resultText.textContent = generatedText;
        } else {
          const imageBlob = await generate(prompt, 'image');
          resultImage.src = URL.createObjectURL(imageBlob);
          resultImage.style.display = 'block';
        }
      } catch (error) {
        showError(`Generation failed: ${error.message}`);
      } finally {
        generateBtn.disabled = false;
        loader.style.display = 'none';
      }
    });
</script>
