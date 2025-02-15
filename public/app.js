// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const modeBtns = document.querySelectorAll('.mode-btn');
  const themeBtns = document.querySelectorAll('.theme-btn');
  const generateBtn = document.getElementById('generate');
  const promptInput = document.getElementById('prompt');
  const resultText = document.querySelector('.result-text');
  const resultImage = document.querySelector('.result-image');
  const loader = document.querySelector('.loader');
  const loaderText = document.querySelector('.loader-text');
  const errorMessage = document.querySelector('.error-message');
  const btnText = generateBtn.querySelector('.btn-text');
  const btnIcon = generateBtn.querySelector('.btn-icon');

  // Current state
  let currentMode = 'text';

  // Theme configurations
  const themes = {
    space: {
      bg: 'var(--space-bg)',
      card: 'var(--space-card)',
      primary: 'var(--space-primary)',
      secondary: 'var(--space-secondary)',
      text: 'var(--space-text)',
      muted: 'var(--space-muted)'
    },
    ocean: {
      bg: 'var(--ocean-bg)',
      card: 'var(--ocean-card)',
      primary: 'var(--ocean-primary)',
      secondary: 'var(--ocean-secondary)',
      text: 'var(--ocean-text)',
      muted: 'var(--ocean-muted)'
    },
    forest: {
      bg: 'var(--forest-bg)',
      card: 'var(--forest-card)',
      primary: 'var(--forest-primary)',
      secondary: 'var(--forest-secondary)',
      text: 'var(--forest-text)',
      muted: 'var(--forest-muted)'
    }
  };

  // Loading messages
  const loadingMessages = [
    "Consulting the cosmos...",
    "Gathering stardust...",
    "Channeling creativity...",
    "Exploring possibilities...",
    "Weaving digital dreams..."
  ];

  // Initialize star background
  function createStars() {
    const stars = document.querySelector('.stars');
    if (!stars) return;
    
    const numStars = 100;
    for (let i = 0; i < numStars; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      const size = `${Math.random() * 3}px`;
      star.style.width = size;
      star.style.height = size;
      star.style.setProperty('--duration', `${2 + Math.random() * 3}s`);
      star.style.setProperty('--delay', `${Math.random() * 2}s`);
      stars.appendChild(star);
    }
  }

  // Utility functions
  function clearResults() {
    if (resultText) resultText.textContent = '';
    if (resultImage) resultImage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
  }

  function showError(message) {
    if (!errorMessage) return;
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth' });
  }

  function getRandomLoadingMessage() {
    return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  }

  function scrollToResult() {
    const resultArea = document.querySelector('.result-area');
    if (resultArea) {
      resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // API call function
  async function generate(prompt, mode) {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, mode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (mode === 'text') {
        const data = await response.json();
        return data[0]?.generated_text || data.generated_text || "No response generated.";
      } else {
        return response.blob();
      }
    } catch (error) {
      throw error;
    }
  }

  // Event Listeners
  if (themeBtns) {
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const selectedTheme = themes[theme];
        for (const [property, value] of Object.entries(selectedTheme)) {
          document.documentElement.style.setProperty(`--${property}`, value);
        }
        
        const logo = document.querySelector('.logo');
        const themeEmojis = {
          'space': '✨',
          'ocean': '🌊',
          'forest': '🌿'
        };
        if (logo) {
          logo.textContent = `${themeEmojis[theme]} Nova`;
        }
      });
    });
  }

  if (modeBtns) {
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        if (promptInput) {
          promptInput.placeholder = currentMode === 'text' 
            ? "Ask me anything..." 
            : "Describe an image you'd like to create...";
        }
        
        clearResults();
      });
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      if (!promptInput) return;
      
      const prompt = promptInput.value.trim();
      if (!prompt) {
        showError('Please enter a prompt first.');
        promptInput.focus();
        return;
      }

      clearResults();
      generateBtn.disabled = true;
      if (loader) loader.style.display = 'block';
      if (loaderText) loaderText.textContent = getRandomLoadingMessage();
      if (btnText) btnText.textContent = 'Creating...';
      if (btnIcon) btnIcon.className = 'fas fa-circle-notch fa-spin';

      try {
        if (currentMode === 'text') {
          const generatedText = await generate(prompt, 'text');
          if (resultText) {
            resultText.textContent = generatedText;
            scrollToResult();
          }
        } else {
          const imageBlob = await generate(prompt, 'image');
          if (resultImage) {
            const imageUrl = URL.createObjectURL(imageBlob);
            resultImage.src = imageUrl;
            resultImage.style.display = 'block';
            resultImage.onload = scrollToResult;
          }
        }
      } catch (error) {
        showError(`Generation failed: ${error.message}`);
      } finally {
        generateBtn.disabled = false;
        if (loader) loader.style.display = 'none';
        if (btnText) btnText.textContent = 'Create';
        if (btnIcon) btnIcon.className = 'fas fa-sparkles';
      }
    });
  }

  if (promptInput) {
    // Keyboard shortcuts
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        generateBtn.click();
      }
    });

    // Auto-resize textarea
    promptInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  }

  // Initialize features tooltip
  const featuresBtn = document.querySelector('.features-btn');
  const featuresTooltip = document.querySelector('.features-tooltip');

  if (featuresBtn && featuresTooltip) {
    featuresBtn.addEventListener('mouseenter', () => {
      featuresTooltip.style.display = 'block';
    });

    featuresBtn.addEventListener('mouseleave', () => {
      featuresTooltip.style.display = 'none';
    });
  }

  // Initialize the UI
  createStars();
  document.body.classList.add('theme-space');
});
