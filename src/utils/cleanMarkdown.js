// utils/cleanMarkdown.js
export const cleanMarkdown = (text) => {
    if (!text) return '';
    
    // Remove ** markdown
    let cleaned = text.replace(/\*\*/g, '');
    
    // Remove other common markdown if needed
    cleaned = cleaned.replace(/\*/g, '');
    cleaned = cleaned.replace(/_/g, '');
    cleaned = cleaned.replace(/`/g, '');
    
    return cleaned;
  };