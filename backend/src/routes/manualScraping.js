/**
 * Manual Scraping Routes
 * 
 * For websites with bot detection, this provides endpoints to manually
 * inject pre-scraped content (extracted via Browser MCP or manual copy/paste)
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');

/**
 * POST /api/manual-scraping/krvvy-shapewear
 * 
 * Returns the pre-extracted Krvvy shapewear article
 * (extracted via Browser MCP to bypass bot detection)
 */
router.post('/krvvy-shapewear', optionalAuth, asyncHandler(async (req, res) => {
  console.log('📦 [ManualScraping] Serving pre-extracted Krvvy content');
  
  // Load the pre-extracted content
  const krvvyContent = require('../../scripts/extractKrvvyContent');
  const formatter = require('../../scripts/formatKrvvyForApi');
  
  // Return formatted response
  res.json(formatter);
}));

/**
 * POST /api/manual-scraping/custom
 * 
 * Accepts manually provided content and formats it for the app
 * Use this when you copy/paste content from a bot-protected site
 */
router.post('/custom', optionalAuth, asyncHandler(async (req, res) => {
  const { title, url, content, contentBlocks } = req.body;
  
  if (!content && !contentBlocks) {
    return res.status(400).json({
      success: false,
      error: 'Either content (markdown) or contentBlocks (structured) is required'
    });
  }
  
  console.log('📝 [ManualScraping] Processing custom content');
  
  // If structured content blocks provided, use them
  if (contentBlocks && Array.isArray(contentBlocks)) {
    const paragraphs = contentBlocks
      .filter(block => block.type === 'p')
      .map(block => block.text);
    
    const headings = {
      h1: contentBlocks.filter(b => b.type === 'h1').map(b => b.text),
      h2: contentBlocks.filter(b => b.type === 'h2').map(b => b.text),
      h3: contentBlocks.filter(b => b.type === 'h3').map(b => b.text)
    };
    
    // Format as markdown
    let markdown = '';
    if (title) {
      markdown += `# ${title}\n\n`;
    }
    if (url) {
      markdown += `_Source: [${url}](${url})_\n\n`;
    }
    
    contentBlocks.forEach(block => {
      switch (block.type) {
        case 'h1': markdown += `# ${block.text}\n\n`; break;
        case 'h2': markdown += `## ${block.text}\n\n`; break;
        case 'h3': markdown += `### ${block.text}\n\n`; break;
        case 'h4': markdown += `#### ${block.text}\n\n`; break;
        case 'h5': markdown += `##### ${block.text}\n\n`; break;
        case 'h6': markdown += `###### ${block.text}\n\n`; break;
        case 'p': markdown += `${block.text}\n\n`; break;
        case 'blockquote': markdown += `> ${block.text}\n\n`; break;
        case 'li':
          if (block.listType === 'ordered') {
            markdown += `1. ${block.text}\n`;
          } else {
            markdown += `- ${block.text}\n`;
          }
          break;
        default: markdown += `${block.text}\n\n`;
      }
    });
    
    markdown += `---\n\n_Manually scraped at: ${new Date().toISOString()}_\n`;
    
    return res.json({
      success: true,
      data: {
        markdown,
        resolvedUrl: url || 'manually-provided',
        requestedUrl: url || 'manually-provided',
        attemptedUrls: [{ url: url || 'manual', label: 'manual-input' }],
        metadata: {
          title: title || 'Manually Provided Content',
          description: '',
          keywords: '',
          headings,
          contentBlocks,
          paragraphCount: paragraphs.length,
          contactInfo: null,
          businessInfo: null,
          socialLinks: null,
          htmlSnapshot: null,
          method: 'manual-input',
          botDetectionBypass: true
        },
        scrapedAt: new Date().toISOString(),
        warnings: []
      }
    });
  }
  
  // If plain markdown/text content provided
  if (content) {
    // Parse markdown into blocks (simple parser)
    const lines = content.split('\n');
    const contentBlocks = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith('# ')) {
        contentBlocks.push({ type: 'h1', text: trimmed.substring(2), listType: null });
      } else if (trimmed.startsWith('## ')) {
        contentBlocks.push({ type: 'h2', text: trimmed.substring(3), listType: null });
      } else if (trimmed.startsWith('### ')) {
        contentBlocks.push({ type: 'h3', text: trimmed.substring(4), listType: null });
      } else if (trimmed.startsWith('> ')) {
        contentBlocks.push({ type: 'blockquote', text: trimmed.substring(2), listType: null });
      } else if (trimmed.match(/^\d+\. /)) {
        contentBlocks.push({ type: 'li', text: trimmed.replace(/^\d+\. /, ''), listType: 'ordered' });
      } else if (trimmed.match(/^[-*] /)) {
        contentBlocks.push({ type: 'li', text: trimmed.replace(/^[-*] /, ''), listType: 'unordered' });
      } else if (trimmed.length > 20) {
        contentBlocks.push({ type: 'p', text: trimmed, listType: null });
      }
    }
    
    const paragraphs = contentBlocks.filter(b => b.type === 'p').map(b => b.text);
    const headings = {
      h1: contentBlocks.filter(b => b.type === 'h1').map(b => b.text),
      h2: contentBlocks.filter(b => b.type === 'h2').map(b => b.text),
      h3: contentBlocks.filter(b => b.type === 'h3').map(b => b.text)
    };
    
    let markdown = content;
    if (title) {
      markdown = `# ${title}\n\n${markdown}`;
    }
    if (url) {
      markdown = `_Source: [${url}](${url})_\n\n${markdown}`;
    }
    markdown += `\n\n---\n\n_Manually scraped at: ${new Date().toISOString()}_\n`;
    
    return res.json({
      success: true,
      data: {
        markdown,
        resolvedUrl: url || 'manually-provided',
        requestedUrl: url || 'manually-provided',
        attemptedUrls: [{ url: url || 'manual', label: 'manual-input' }],
        metadata: {
          title: title || 'Manually Provided Content',
          description: '',
          keywords: '',
          headings,
          contentBlocks,
          paragraphCount: paragraphs.length,
          contactInfo: null,
          businessInfo: null,
          socialLinks: null,
          htmlSnapshot: null,
          method: 'manual-input',
          botDetectionBypass: true
        },
        scrapedAt: new Date().toISOString(),
        warnings: []
      }
    });
  }
  
  return res.status(400).json({
    success: false,
    error: 'No valid content provided'
  });
}));

module.exports = router;

