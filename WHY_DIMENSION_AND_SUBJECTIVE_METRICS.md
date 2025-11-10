# WHY Dimension & Subjective Metrics Usage

## 📊 **WHAT We Have in WHY Dimension**

### **Structure:**
For **EACH persona** (from WHO), the WHY dimension contains:

```javascript
{
  "why": [
    {
      "role": "Persona type from WHO",                    // e.g., "Enterprise CTO"
      "initial_intent_statement": "Quote from initial intent that misaligns with this persona",
      "role_specific_need": "What this persona needs (from WHAT)",
      "semantic_gap": "Specific gap between initial intent and persona need",
      "misalignment_cause": "Why the misalignment occurs (consider persona painPoints/goals)",
      "impact": "Consequence of this gap for this persona"
    }
    // ✅ One entry per persona (if 5 personas → 5 WHY entries)
  ]
}
```

### **What WHY Does:**
1. **Compares** initial intent vs persona-specific needs (from WHAT)
2. **Identifies** semantic gaps between them
3. **Explains** misalignment causes (considering persona painPoints/goals)
4. **Assesses** impact of the gap

---

## 🎯 **Where 6 Subjective Impression Metrics Are Used**

### **1. Fetched in Actionables Route** (`backend/src/routes/actionables.js`)

**Location:** Lines 471-556

**What Happens:**
- Finds `PromptTest` entries that cite the page URL
- Retrieves `SubjectiveMetrics` for those prompts
- Calculates **average scores** across all 6 metrics:
  ```javascript
  avgScores = {
    relevance: 0,
    influence: 0,
    uniqueness: 0,
    position: 0,
    clickProbability: 0,
    diversity: 0,
    overallQuality: 0
  }
  ```
- Identifies **weak areas** (scores < 3.0):
  ```javascript
  weakAreas = ["relevance", "influence", ...]  // Metrics with score < 3.0
  ```

**Output:**
```javascript
subjectiveMetrics = {
  scores: {
    relevance: 2.3,
    influence: 2.1,
    uniqueness: 3.5,
    position: 2.8,
    clickProbability: 2.5,
    diversity: 3.2,
    overallQuality: 2.7
  },
  sampleSize: 10,  // Number of evaluations averaged
  brandName: "Stripe",
  weakAreas: ["relevance", "influence", "position", "clickProbability"]  // Scores < 3.0
}
```

---

### **2. Passed to Content Regeneration Service**

**Location:** `backend/src/routes/actionables.js` Line 570

```javascript
const result = await contentRegenerationService.regenerateContent({
  // ...
  subjectiveMetrics,  // ✅ Passed here
});
```

---

### **3. Used in 4W Reflection Prompt (WHY Section)**

**Location:** `backend/src/services/contentRegenerationService.js` Lines 490-546

**How They're Used:**

#### **A. Added as Context Section:**
```javascript
=== Subjective Impression Metrics (Additional Context for WHY) ===
Current average scores: 
- Relevance 2.3/5
- Influence 2.1/5
- Uniqueness 3.5/5
- Position 2.8/5
- Click Probability 2.5/5
- Diversity 3.2/5

Weak areas: relevance, influence, position, clickProbability
```

#### **B. Referenced in WHY Instructions:**
```javascript
**WHY: Identify misalignments between initial intent and persona needs**
For EACH persona from WHO, identify semantic gaps:
- Compare the initial intent statement vs what this persona needs (from WHAT)
- What specific semantic gaps exist?
- Why does the initial intent misalign with this persona's needs?
- What are the misalignment causes?
- What is the impact of this gap?
- Consider weak subjective metrics (relevance, influence, position, clickProbability) when identifying gaps  // ✅ HERE
```

#### **C. Used to Inform WHY Entries:**
The LLM is instructed to:
- Consider weak subjective metrics when identifying gaps
- Use low scores to understand what's missing
- Prioritize improvements that address weak areas

---

## 📋 **Summary**

### **WHY Dimension Contains:**
- **Number:** 1 entry per persona (if 5 personas → 5 WHY entries)
- **Fields per entry:**
  - `role` - Persona type
  - `initial_intent_statement` - Quote from initial intent
  - `role_specific_need` - What persona needs (from WHAT)
  - `semantic_gap` - Gap between intent and need
  - `misalignment_cause` - Why misalignment occurs
  - `impact` - Consequence of gap

### **6 Subjective Metrics Used:**
1. **Relevance** - How relevant is content to query
2. **Influence** - How influential/authoritative
3. **Uniqueness** - How unique/distinctive
4. **Position** - Subjective positional prominence
5. **Click Probability** - Likelihood of user clicking
6. **Diversity** - Content diversity and coverage

### **Where They're Used:**
1. ✅ **Fetched** in `actionables.js` route (lines 471-556)
2. ✅ **Passed** to `contentRegenerationService.regenerateContent()` (line 570)
3. ✅ **Included** in 4W reflection prompt as context (lines 490-497)
4. ✅ **Referenced** in WHY instructions (line 546)
5. ✅ **Used** by LLM to identify gaps and prioritize improvements

### **How They Inform WHY:**
- **Weak areas** (scores < 3.0) are highlighted
- LLM considers these weak metrics when identifying semantic gaps
- Helps prioritize which gaps to address first
- Informs the `misalignment_cause` and `impact` fields

---

## 🔍 **Example Flow**

```
1. User regenerates content for a page
   ↓
2. actionables.js finds PromptTests that cite this page URL
   ↓
3. Fetches SubjectiveMetrics for those prompts
   ↓
4. Calculates average scores:
   - Relevance: 2.3/5 ⚠️
   - Influence: 2.1/5 ⚠️
   - Uniqueness: 3.5/5 ✅
   - Position: 2.8/5 ⚠️
   - Click Probability: 2.5/5 ⚠️
   - Diversity: 3.2/5 ✅
   ↓
5. Identifies weak areas: ["relevance", "influence", "position", "clickProbability"]
   ↓
6. Passes to contentRegenerationService with subjectiveMetrics
   ↓
7. 4W reflection prompt includes:
   "Weak areas: relevance, influence, position, clickProbability
    Consider weak subjective metrics when identifying gaps"
   ↓
8. LLM generates WHY entries that:
   - Address relevance gaps (content not relevant enough)
   - Address influence gaps (content not authoritative enough)
   - Address position gaps (content not prominent enough)
   - Address click probability gaps (content not engaging enough)
```

---

## ✅ **Current Status**

- ✅ WHY dimension properly structured (per persona)
- ✅ 6 subjective metrics fetched and averaged
- ✅ Weak areas identified (scores < 3.0)
- ✅ Metrics passed to content regeneration
- ✅ Metrics included in 4W reflection prompt
- ✅ Metrics referenced in WHY instructions
- ✅ LLM uses metrics to inform gap identification

