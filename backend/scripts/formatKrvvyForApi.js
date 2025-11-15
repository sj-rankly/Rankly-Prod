/**
 * Format Krvvy content extracted via Browser MCP for API response
 */

const krvvyExtractedContent = require('./extractKrvvyContent');

// Format as markdown (matching the formatScrapedContentToMarkdown function)
function formatAsMarkdown(contentData) {
  let markdown = '';
  
  // Add title
  if (contentData.title) {
    markdown += `# ${contentData.title}\n\n`;
  }
  
  // Add source URL
  markdown += `_Source: [${contentData.url}](${contentData.url})_\n\n`;
  
  // Add content blocks
  contentData.contentBlocks.forEach((block) => {
    switch (block.type) {
      case 'h1':
        markdown += `# ${block.text}\n\n`;
        break;
      case 'h2':
        markdown += `## ${block.text}\n\n`;
        break;
      case 'h3':
        markdown += `### ${block.text}\n\n`;
        break;
      case 'h4':
        markdown += `#### ${block.text}\n\n`;
        break;
      case 'h5':
        markdown += `##### ${block.text}\n\n`;
        break;
      case 'h6':
        markdown += `###### ${block.text}\n\n`;
        break;
      case 'p':
        markdown += `${block.text}\n\n`;
        break;
      case 'blockquote':
        markdown += `> ${block.text}\n\n`;
        break;
      case 'li':
        if (block.listType === 'ordered') {
          markdown += `1. ${block.text}\n`;
        } else {
          markdown += `- ${block.text}\n`;
        }
        break;
      default:
        markdown += `${block.text}\n\n`;
    }
  });
  
  // Add scraped timestamp
  markdown += `---\n\n`;
  markdown += `_Scraped at: ${contentData.metadata.scrapedAt}_\n`;
  
  return markdown.trim();
}

// Format as API response
function formatAsApiResponse() {
  const markdown = formatAsMarkdown(krvvyExtractedContent);
  
  return {
    success: true,
    data: {
      markdown,
      resolvedUrl: krvvyExtractedContent.url,
      requestedUrl: krvvyExtractedContent.url,
      attemptedUrls: [
        {
          url: krvvyExtractedContent.url,
          label: 'browser-mcp'
        }
      ],
      metadata: {
        title: krvvyExtractedContent.title,
        description: 'Expert tips for choosing the best shapewear for plus-size women',
        keywords: 'shapewear, plus size, body shape, compression',
        headings: krvvyExtractedContent.headings,
        contentBlocks: krvvyExtractedContent.contentBlocks,
        paragraphCount: krvvyExtractedContent.paragraphs.length,
        contactInfo: null,
        businessInfo: null,
        socialLinks: null,
        htmlSnapshot: null, // Could capture if needed
        method: 'browser-mcp',
        botDetectionBypass: true
      },
      scrapedAt: krvvyExtractedContent.metadata.scrapedAt,
      warnings: []
    }
  };
}

// Export
const apiResponse = formatAsApiResponse();

console.log('✅ Formatted Krvvy Content for API Response');
console.log(`   - Markdown length: ${apiResponse.data.markdown.length} chars`);
console.log(`   - Content blocks: ${apiResponse.data.metadata.contentBlocks.length}`);
console.log(`   - Paragraphs: ${apiResponse.data.metadata.paragraphCount}`);
console.log(`   - Headings: ${Object.values(apiResponse.data.metadata.headings).flat().length}`);
console.log('');
console.log('📋 Preview (first 500 chars):');
console.log(apiResponse.data.markdown.substring(0, 500));
console.log('...');

module.exports = apiResponse;

