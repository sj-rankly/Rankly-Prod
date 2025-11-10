# Dual Iframe Implementation - Side-by-Side Page Comparison

## Overview

This implementation adds a side-by-side iframe comparison view showing:
1. **Current Design**: The original page rendered in an iframe
2. **Proposed Design**: The regenerated content rendered as HTML in an iframe

## Implementation Status

### ✅ Backend (Complete)
- **Markdown to HTML Converter**: Simple regex-based converter (no external dependencies)
- **HTML Preview Generation Endpoint**: `POST /api/actionables/generate-html-preview`
- **HTML Preview Serving Endpoint**: `GET /api/actionables/html-preview/:previewId`
- **In-Memory Storage**: Uses `global.htmlPreviews` Map (keeps last 100 previews)

### ✅ Frontend API Service (Complete)
- **`apiService.generateHtmlPreview()`**: Method to generate HTML preview from markdown

### 🔄 Frontend Component (In Progress)
- **Dual Iframe Component**: Component to display side-by-side iframes
- **View Toggle**: Switch between markdown view and iframe view in PageList

## Next Steps

1. Create `components/ui/dual-iframe-viewer.tsx` component
2. Add view toggle state in `PageList.tsx` (markdown vs iframe)
3. Generate HTML previews when content is loaded/regenerated
4. Display dual iframes when "Preview" view is selected

## Usage

```typescript
// Generate HTML preview
const preview = await apiService.generateHtmlPreview(markdown, title);
// preview.data.previewUrl = "/api/actionables/html-preview/preview-123..."

// Use in iframe
<iframe src={preview.data.previewUrl} />
```

## Files Modified

1. `backend/src/routes/actionables.js` - Added HTML preview routes
2. `services/api.ts` - Added `generateHtmlPreview()` method
3. `types/actionables.ts` - Added `HtmlPreviewResponse` interface

## Files to Create

1. `components/ui/dual-iframe-viewer.tsx` - Dual iframe component
2. Update `components/tabs/pages/PageList.tsx` - Add view toggle and iframe integration

