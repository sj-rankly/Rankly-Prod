/**
 * Prompt building functions for AI generation
 */

/**
 * Build system prompt for AI
 * @param {number} totalPrompts - Total prompts to generate
 * @param {Object} options - Optional configuration overrides
 */
function buildSystemPrompt(totalPrompts = 20, options = null) {
  // Use override options if provided, otherwise use defaults
  const brandedPercentage = options?.brandedPercentage ?? 15; // 15% branded (reduced from 20% for better TOFU balance)
  
  const brandedCount = Math.max(1, Math.round(totalPrompts * brandedPercentage));
  const nonBrandedCount = totalPrompts - brandedCount;

  return `You are an expert at creating natural, human-like TOFU (Top of Funnel) search queries for Answer Engine Optimization (AEO) analysis.

Your task is to generate EXACTLY ${totalPrompts} diverse, realistic fanned out TOFU prompts that test brand visibility in LLM responses (ChatGPT, Claude, Gemini, Perplexity) for users researching this product/service.

CRITICAL: Each prompt MUST be unique with different angles, focus areas, and wording. NO duplicates or near-duplicates allowed.

🚨 CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE STRICTLY:

1. ALL PROMPTS MUST BE COMMERCIAL ONLY WITH BUYING INTENT:
   - EVERY single prompt must have commercial intent and buying intent
   - Every prompt should indicate users are researching to buy/evaluate/solve a problem with intent to take action
   - ZERO informational queries (no "What is", "How does", "Why" educational content)
   - ZERO navigational queries (no "Where to find", "Best resources")
   - ZERO transactional queries (no "Sign up", "Try", "Apply")
   - ONLY commercial evaluation queries that show buying/research intent

2. TOFU FOCUS - TOP OF FUNNEL ONLY:
   - ALL prompts must target awareness/discovery stage users
   - Users researching solutions, evaluating options, comparing alternatives
   - Early research phase - NOT purchase-ready, NOT educational only
   - Buying intent: users want to solve a problem, find the best solution, evaluate options before buying

3. BRANDED RATIO: 
   - ${nonBrandedCount} prompts (${Math.round((1 - brandedPercentage) * 100)}%) MUST be NON-BRANDED (generic category/problem queries with buying intent)
   - ${brandedCount} prompt (${Math.round(brandedPercentage * 100)}%) can be BRANDED (mentioning specific brand name)

4. NO COMPETITOR MENTIONS:
   - NEVER mention competitor brand names in any prompt
   - Use generic terms like "alternatives", "options", "solutions", "providers" instead
   - Generic comparisons only (e.g., "best personal loan options" NOT "Brand A vs Brand B")

5. FAN OUT - SHORT & DIVERSIFIED ANGLES (CRITICAL FOR DIVERSITY):
   - Vary starting words: Use diverse openings - "Best", "Top", "Compare", "Which", "Should", "Is", "Options for", "Looking for", "Recommend", "Consider", "What are", "Help me find", "I need", "Searching for"
   - Vary research angles: "best for [use case]", "top options", "compare", "which [category]", "should I [action]", "options for [scenario]", "alternatives to", "recommendations for", "guide to choosing"
   - Vary buying contexts: different pain points, scenarios, use cases, user segments, urgency levels, budgets, timeframes
   - Each prompt must be UNIQUE with completely different focus/depth/angle/wording - NO repetition of similar structures
   - Each prompt must be SHORT: 5-12 words maximum
   - CRITICAL: Avoid repetitive patterns - if you use "Is X worth it for Y" once, NEVER use similar structure again
   - CRITICAL: Vary keyword usage - don't repeat the same key phrases across multiple prompts
   - CRITICAL: Use different question types - mix declarative ("Best X for Y"), interrogative ("Which X is best"), and imperative ("Compare X options") forms
   - Examples of DIVERSE prompts: "Best credit cards for travel rewards", "Which loan options suit debt consolidation", "Compare investment platforms for beginners", "Should I get a rewards card for online shopping", "Help me find credit cards with no fees", "What are top cashback card options"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT (NON-BRANDED) - DIVERSE SHORT PROMPTS:
- Best credit cards for travel rewards
- Top loan options for debt consolidation
- Compare investment platforms for beginners
- Which credit cards offer the best cashback
- Options for debt consolidation loans
- Looking for credit cards with no annual fee
- Recommend credit cards for online shopping
- Credit cards suitable for students
- Best rewards programs for everyday spending
- Which credit card rewards travel purchases most


EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT (BRANDED) - SHORT PROMPTS:
- Should I consider [Brand] for travel rewards
- Is [Brand] good for students
- [Brand] cashback benefits review
- Compare [Brand] with other options
- Is [Brand] worth it for online shopping

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NEVER GENERATE THESE (NOT COMMERCIAL TOFU OR TOO LONG):
- "What is [category]?" (informational, no buying intent)
- "How does [category] work?" (educational, no buying intent)
- "Where to find [category]?" (navigational, no buying intent)
- "Sign up for [category]" (transactional, NOT TOFU)
- "Apply for [category]" (transactional, NOT TOFU)
- "Buy [category]" (transactional, NOT TOFU)
- "Purchase [category]" (transactional, NOT TOFU)
- "Try [category]" (transactional, NOT TOFU)
- "Order [category]" (transactional, NOT TOFU)
- "What are the top features to consider when choosing a membership rewards card?" (TOO LONG - 12 words)
- "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (TOO LONG - 14 words)

🚫 STRICTLY PROHIBITED TRANSACTIONAL PATTERNS:
- Any phrase containing: "sign up", "apply", "buy", "purchase", "order", "try now", "get started"
- These indicate purchase intent, not research/evaluation intent (TOFU stage)

✅ ONLY GENERATE SHORT COMMERCIAL QUERIES WITH BUYING INTENT (5-12 words):
- Users researching to solve a specific problem
- Users evaluating options before deciding
- Users comparing different solutions
- Users looking for recommendations for their situation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISTRIBUTION RULES:
- ALL ${totalPrompts} prompts MUST be COMMERCIAL with BUYING INTENT
- ALL ${totalPrompts} prompts MUST be TOFU (awareness/discovery stage)
- ALL ${totalPrompts} prompts MUST be SHORT: 5-12 words maximum
- Write from the persona's perspective (their role, challenges, context)
- Make prompts conversational and natural (like real human queries)
- Each prompt must be UNIQUE - absolutely NO duplicates or near-duplicates
- CRITICAL DIVERSITY: Every prompt must use different words, structure, and angle - avoid any repetition
- Fan out across different buying scenarios, use cases, pain points, question types, and phrasings
- ${nonBrandedCount} non-branded + ${brandedCount} branded
- DO NOT mention any competitor brand names
- MAXIMUM DIVERSITY REQUIRED: If you find yourself using similar wording, STOP and think of a completely different way to phrase it

OUTPUT FORMAT:
Return ONLY a JSON array of EXACTLY ${totalPrompts} SHORT commercial prompt strings (5-12 words each).

Example: ["Best credit cards for travel rewards", "Top loan options for students", "Compare investment platforms"]`;
}

/**
 * Build user prompt with context
 * @param {Object} params - Prompt building parameters
 * @param {Object} params.options - Optional configuration overrides
 */
function buildUserPrompt({
  topic,
  persona,
  region,
  language,
  websiteUrl,
  brandContext,
  competitors, // Will ignore this
  totalPrompts = 80,
  options = null
}) {
  // Use override options if provided, otherwise use defaults
  const brandedPercentage = options?.brandedPercentage ?? 15; // 15% branded (aligned with system prompt)
  
  const brandedCount = Math.max(1, Math.round(totalPrompts * brandedPercentage));
  const nonBrandedCount = totalPrompts - brandedCount;
  
  // ALL prompts are now Commercial TOFU type with buying intent

  // Extract brand name
  let brandName = 'the brand';
  if (brandContext && typeof brandContext === 'object' && brandContext.companyName) {
    brandName = brandContext.companyName;
  } else if (brandContext && typeof brandContext === 'string') {
    try {
      const parsed = JSON.parse(brandContext);
      if (parsed.companyName) brandName = parsed.companyName;
    } catch (e) {}
  }

  // Build comprehensive brand info for better prompt generation
  let brandInfo = '';
  if (brandContext) {
    if (typeof brandContext === 'object') {
      const parts = [];
      if (brandContext.companyName) parts.push(`Company: ${brandContext.companyName}`);
      if (brandContext.industry) parts.push(`Industry: ${brandContext.industry}`);
      if (brandContext.businessModel) parts.push(`Business Model: ${brandContext.businessModel}`);
      if (brandContext.valueProposition) parts.push(`Value Proposition: ${brandContext.valueProposition}`);
      if (brandContext.keyServices && Array.isArray(brandContext.keyServices)) {
        parts.push(`Key Services: ${brandContext.keyServices.join(', ')}`);
      }
      if (brandContext.targetMarket) parts.push(`Target Market: ${brandContext.targetMarket}`);
      if (brandContext.brandTone) parts.push(`Brand Tone: ${brandContext.brandTone}`);
      if (parts.length > 0) brandInfo = `\n\nBRAND ANALYSIS DATA:\n${parts.join('\n')}`;
    }
  }

  return `Generate EXACTLY ${totalPrompts} COMMERCIAL TOFU prompts for brand visibility testing:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND: ${brandName}${websiteUrl ? ` (${websiteUrl})` : ''}${brandInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOPIC/CATEGORY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOPIC: ${topic.name}
${topic.description ? `Description: ${topic.description}` : 'Description: Not provided'}
${topic.keywords && topic.keywords.length > 0 ? `Keywords: ${topic.keywords.join(', ')}` : 'Keywords: Not provided'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PERSONA INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONA: ${persona.type}
${persona.description ? `Description: ${persona.description}` : 'Description: Not provided'}
${persona.painPoints && persona.painPoints.length > 0 ? `Pain Points: ${persona.painPoints.join(', ')}` : 'Pain Points: Not provided'}
${persona.goals && persona.goals.length > 0 ? `Goals: ${persona.goals.join(', ')}` : 'Goals: Not provided'}

TARGET: ${region}, ${language}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 MANDATORY REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. ALL ${totalPrompts} PROMPTS MUST BE COMMERCIAL ONLY WITH BUYING INTENT:
   ✓ EVERY prompt must show commercial intent and buying intent
   ✓ Users researching to solve specific problems with intent to take action
   ✓ Users evaluating options before making a decision
   ✗ ZERO informational queries (no "What is", "How does", "Why", "Guide to")
   ✗ ZERO navigational queries (no "Where to find", "Best resources")
   ✗ ZERO transactional queries (no "Sign up", "Try", "Apply")
   ✓ ONLY commercial evaluation queries that show buying/research intent

2. ALL ${totalPrompts} PROMPTS MUST BE TOFU (Top of Funnel):
   ✓ Awareness/discovery stage users - early research phase
   ✓ Users researching solutions, evaluating options, comparing alternatives
   ✗ NOT purchase-ready (too far down funnel)
   ✗ NOT educational only (no learning focus)
   ✓ Buying intent: users want to solve a problem, find best solutions, evaluate options

3. BRANDED RATIO:
   - ${nonBrandedCount} prompts (${Math.round((1 - brandedPercentage) * 100)}%) MUST be NON-BRANDED
     → Generic category/problem queries with commercial buying intent
   - ${brandedCount} prompt (${Math.round(brandedPercentage * 100)}%) can mention ${brandName}
     → User evaluating/considering the specific brand

4. NO COMPETITOR MENTIONS:
   ✗ NEVER mention competitor brand names
   ✓ Use generic terms: "alternatives", "options", "solutions", "providers", "companies"
   ✓ Generic comparisons only (e.g., "best ${topic.name} options" NOT "Brand A vs Brand B")

5. FAN OUT - SHORT & DIVERSIFIED ANGLES (CRITICAL FOR DIVERSITY):
   - Vary starting words: Use diverse openings - "Best", "Top", "Compare", "Which", "Should", "Is", "Options for", "Looking for", "Recommend", "Consider", "What are", "Help me find", "I need", "Searching for"
   - Vary research angles: "best for [use case]", "top options", "compare", "recommendations", "reviews", "alternatives to", "guide to choosing", "help selecting"
   - Vary buying contexts: different pain points, scenarios, use cases, budgets, urgency, timeframes, user types
   - Each prompt MUST be unique with completely different focus/depth/angle/wording - NO similar patterns
   - Each prompt MUST be SHORT: 5-12 words maximum
   - Cover different stages: initial research → comparison → selection criteria
   - CRITICAL: Use different question types - mix declarative, interrogative, and imperative forms
   - CRITICAL: Vary keyword usage - don't repeat the same phrases across prompts
   - CRITICAL: Avoid repetitive structures - if you use one pattern, use completely different patterns for others

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT - SHORT PROMPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NON-BRANDED (${nonBrandedCount} prompts) - SHORT:
✓ "Best ${topic.name} options for ${persona.type}s"
✓ "Top ${topic.name} for travel rewards"
✓ "Compare investment platforms for beginners"
✓ "Loan options for debt consolidation"
✓ "Credit cards with best cashback"
✓ "Travel insurance for frequent flyers"

BRANDED (${brandedCount} prompt only) - SHORT:
✓ "Should I consider ${brandName} for ${topic.name}"
✓ "${brandName} cashback comparison"
✓ "Is ${brandName} good for students"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER GENERATE THESE (NOT COMMERCIAL TOFU OR TOO LONG)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ "What is ${topic.name}?" (informational, no buying intent)
✗ "How does ${topic.name} work?" (educational, no buying intent)
✗ "Guide to ${topic.name}" (tutorial, no buying intent)
✗ "Where to find ${topic.name}?" (navigational, no buying intent)
✗ "Sign up for ${topic.name}" (transactional, not TOFU)
✗ "Try ${topic.name}" (transactional, not TOFU)
✗ "What are the top features to consider when choosing a membership rewards card?" (TOO LONG - 12 words)
✗ "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (TOO LONG - 14 words)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISTRIBUTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ALL ${totalPrompts} prompts: COMMERCIAL + TOFU + BUYING INTENT
- ALL ${totalPrompts} prompts: SHORT (5-12 words maximum)
- Write from ${persona.type}'s perspective: ${persona.description ? `consider their description ("${persona.description.substring(0, 80)}${persona.description.length > 80 ? '...' : ''}")` : 'their role and needs'}
  ${persona.painPoints && persona.painPoints.length > 0 ? `- Incorporate their pain points: ${persona.painPoints.slice(0, 3).join(', ')}${persona.painPoints.length > 3 ? '...' : ''}` : ''}
  ${persona.goals && persona.goals.length > 0 ? `- Align with their goals: ${persona.goals.slice(0, 3).join(', ')}${persona.goals.length > 3 ? '...' : ''}` : ''}
- Focus on the topic: ${topic.name} ${topic.description ? `(${topic.description.substring(0, 80)}${topic.description.length > 80 ? '...' : ''})` : ''}
  ${topic.keywords && topic.keywords.length > 0 ? `- Use relevant keywords: ${topic.keywords.slice(0, 5).join(', ')}` : ''}
- Incorporate the brand's value proposition and services when relevant
  ${brandContext && typeof brandContext === 'object' && brandContext.companyName ? `- Brand focus: ${brandContext.companyName}${brandContext.valueProposition ? ` - ${brandContext.valueProposition.substring(0, 80)}${brandContext.valueProposition.length > 80 ? '...' : ''}` : ''}` : ''}
  ${brandContext && typeof brandContext === 'object' && brandContext.keyServices && brandContext.keyServices.length > 0 ? `- Brand services: ${brandContext.keyServices.slice(0, 3).join(', ')}${brandContext.keyServices.length > 3 ? '...' : ''}` : ''}
- Make prompts natural, conversational (like real user queries)
- CRITICAL DIVERSITY RULES:
  ✓ Each prompt: ABSOLUTELY UNIQUE - no duplicates, no near-duplicates, no similar structures
  ✓ Vary angles, wording, question types, and keywords across ALL prompts
  ✓ Fan out: different use cases, scenarios, buying contexts, phrasings
  ✓ Avoid repetitive patterns - if one prompt uses "Best X for Y", use completely different structure for others
  ✓ Maximum diversity: Every prompt should feel like a different user's search query
- ${nonBrandedCount} non-branded + ${brandedCount} branded
- NO competitor brand mentions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a JSON array of EXACTLY ${totalPrompts} SHORT commercial prompt strings (5-12 words each).

Example: ["Best credit cards for travel rewards", "Top loan options for students", "Compare investment platforms"]`;
}

module.exports = {
  buildSystemPrompt,
  buildUserPrompt
};


