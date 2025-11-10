# How Personas Work in Content Regeneration

## Overview

Personas are **brand-wide user types** that are generated **once during onboarding** and then **reused for ALL page regenerations** within the same analysis. They are NOT unique per page/link.

## The Flow

### 1. **Persona Generation (One-Time, During Onboarding)**

```
User enters brand URL → Website Analysis → LLM generates personas
```

- **When**: During the onboarding flow for "Answer Engine Analytics"
- **Where**: Generated from the brand's website using Perplexity
- **What**: 3-44 personas representing different user types who might use the brand
- **Storage**: Saved in MongoDB with `userId` and `urlAnalysisId`
- **Example personas**:
  - "Enterprise CTO" (High relevance)
  - "Startup Founder" (Medium relevance)
  - "Marketing Manager" (Low relevance)

### 2. **Persona Selection (Per Regeneration Request)**

When you click "Regenerate Content" on any page:

```javascript
// In actionables.js route
const selection = await personaTopicSelectionService.selectPersonasAndTopics({
  userId: req.userId,
  urlAnalysisId: urlAnalysisId, // ✅ Same analysis ID for all pages
});

allPersonas = selection.personas; // ✅ Gets 3-5 personas (smart filtering)
allTopics = selection.topics;    // ✅ Gets 5-8 topics (smart filtering)
```

**Selection Strategy**:
1. **Priority 1**: User-selected personas (if user explicitly selected some)
2. **Priority 2**: High-relevance personas
3. **Priority 3**: Most recent personas
4. **Limit**: Max 5 personas (to keep LLM prompts manageable)

### 3. **Content Regeneration Pipeline (4-Stage RAID G-SEO)**

```
Stage 1: Summarization
  ↓
Stage 2a: Initial Intent (Creator's Perspective)
  ↓
Stage 2b: 4W Multi-Role Reflection ← ✅ PERSONAS USED HERE
  ↓
Stage 3: Step Planning
  ↓
Stage 4: Content Rewrite
```

### 4. **How Personas Are Used in Stage 2b (4W Reflection)**

The personas are used in the **WHO dimension** of the 4W framework:

```javascript
// In build4WReflectionPrompt()
const personasSection = `
=== User Personas from Onboarding (WHO) - USE THESE DIRECTLY ===
${JSON.stringify(allPersonas, null, 2)}

CRITICAL: These personas are brand-specific and were generated from the brand URL.
Use them DIRECTLY for the WHO dimension. Do NOT infer new roles.
Each persona includes:
- type: The role name (e.g., "Enterprise CTO", "Startup Founder")
- description: Comprehensive description of the persona
- painPoints: Specific pain points this persona faces
- goals: Specific goals this persona has
- relevance: High/Medium/Low relevance score
`;
```

**The 4W Reflection Process**:

1. **WHO**: Use the personas directly from onboarding
   - "Enterprise CTO" with their painPoints and goals
   - "Startup Founder" with their painPoints and goals
   - etc.

2. **WHAT**: Generate detailed retrieval needs FOR EACH persona
   - What does "Enterprise CTO" need from THIS page?
   - What does "Startup Founder" need from THIS page?
   - Map relevant topics to each persona

3. **WHY**: Compare initial intent vs persona needs
   - Does the initial intent address "Enterprise CTO" needs?
   - What gaps exist for "Startup Founder"?
   - Use subjective metrics to identify weak areas

4. **HOW**: Semantically reconstruct content to address ALL personas
   - Preserve core informational focus
   - Expand scope to address all personas
   - Ensure topic coverage for each persona

## Key Points

### ✅ Personas Are Shared Across All Pages

- **Same personas** are used for regenerating:
  - `/ab-testing/ab-testing-tools` page
  - `/pricing` page
  - `/features` page
  - Any other page in the same analysis

- **Why?** Because personas represent **brand-wide user types**, not page-specific ones
  - An "Enterprise CTO" persona is relevant across multiple pages
  - Their painPoints and goals are consistent across the brand

### ✅ Personas Are NOT Unique Per Link

- **No**: Creating new personas for each page
- **Yes**: Reusing the same personas from onboarding for all pages

### ✅ Smart Filtering Ensures Quality

The `personaTopicSelectionService` intelligently selects:
- **Max 5 personas** (to keep LLM prompts manageable)
- **Max 8 topics** (for comprehensive coverage)
- Prioritizes high-relevance and user-selected items

### ✅ Fallback Mechanism

If no personas are found:
- System creates a generic "General User" persona
- Regeneration proceeds (but with less personalized content)
- This ensures regeneration always works, even if onboarding wasn't completed

## Example Flow

```
1. User completes onboarding for "fibr.ai"
   → Generates 10 personas (Enterprise CTO, Startup Founder, etc.)
   → Stores in DB with urlAnalysisId: "abc123"

2. User goes to Actionables tab
   → Sees page: "/ab-testing/ab-testing-tools"
   → Clicks "Regenerate Content"

3. Backend fetches personas
   → personaTopicSelectionService.selectPersonasAndTopics({
        userId: "user123",
        urlAnalysisId: "abc123" // ✅ Same ID for all pages
      })
   → Returns 5 personas (smart filtered from 10)

4. Content regeneration uses personas
   → Stage 2b: 4W Reflection
   → WHO: Uses the 5 personas directly
   → WHAT: Generates needs for each persona
   → WHY: Compares intent vs persona needs
   → HOW: Reconstructs content for all personas

5. Result: Regenerated content addresses all 5 personas
   → Content is optimized for "Enterprise CTO" needs
   → Content is optimized for "Startup Founder" needs
   → Content is optimized for other personas
   → Content is more comprehensive and LLM-friendly
```

## Why This Approach Works

1. **Efficiency**: Generate personas once, reuse everywhere
2. **Consistency**: Same user types across all pages
3. **Comprehensiveness**: Content addresses multiple user perspectives
4. **LLM Optimization**: Multi-role reflection improves semantic coverage
5. **Scalability**: Works for any number of pages without regenerating personas

## Summary

- **Personas = Brand-wide user types** (generated once during onboarding)
- **Reused for ALL pages** in the same analysis (not unique per link)
- **Used in 4W Reflection** to ensure content addresses multiple user perspectives
- **Smart filtering** selects 3-5 most relevant personas per regeneration
- **Fallback mechanism** ensures regeneration always works

