# 4W Structure Fixes - Implementation Summary

## ✅ Fixed: Two-Stage Intent Modeling

### Before:
- Combined initial intent + 4W reflection in ONE prompt
- No clear separation between creator's perspective and refined intent

### After:
- **Stage 2a:** `generateInitialIntent()` - Generates creator's initial projection
- **Stage 2b:** `refineIntentWith4W()` - Applies 4W reflection to enhance initial intent
- Two separate LLM calls with distinct prompts

---

## ✅ Fixed: WHO Dimension - Infer Roles from Initial Intent

### Before:
- Used pre-generated personas directly from onboarding
- No inference based on initial intent

### After:
- LLM **INFERS** 3-5 representative user roles based on initial intent
- Examples: "technical professionals", "general readers", "decision-makers"
- Pre-generated personas are provided as **hints only** (not used directly)
- Each role includes: `inferred_role`, `rationale`, `domain_background`, `knowledge_profile`

---

## ✅ Fixed: WHAT Dimension - Role-Conditioned Needs

### Before:
- Used topics independently
- Not conditioned on roles

### After:
- **FOR EACH inferred role** from WHO, generate:
  - `retrieval_needs` - What they need to retrieve
  - `candidate_motivations` - Their motivations
  - `search_goals` - Their search goals
  - `domain_background` - Role-specific domain knowledge
  - `role_specific_constraints` - Constraints to limit semantic drift
- WHAT is now **conditioned on role's background and knowledge profile**

---

## ✅ Fixed: WHY Dimension - Compare Initial Intent vs Role Needs

### Before:
- Compared current content vs needs
- Not structured per role

### After:
- **FOR EACH role** from WHO:
  - Compare **initial intent statement** vs **role-specific need** (from WHAT)
  - Identify `semantic_gap` between them
  - Explain `misalignment_cause`
  - Assess `impact`
- WHY now properly compares initial intent vs role-specific needs per role

---

## ✅ Fixed: HOW Dimension - Semantically Reconstruct Intent

### Before:
- Only provided "generalization strategy"
- Didn't reconstruct initial intent

### After:
- **Semantically reconstruct** the initial intent:
  - `core_informational_focus` - What to preserve
  - `semantic_reconstruction` - How to reconstruct
  - `generalization_strategy` - How to expand scope
  - `adaptability_enhancements` - Enhancements for adaptability
  - `constraint_propagation` - How constraints limit semantic drift
- Refined intent includes:
  - `preserved_core` - What core was preserved
  - `expanded_scope` - How scope was expanded
  - `intent_statement` - Reconstructed intent

---

## Code Changes

### Files Modified:
1. **`backend/src/services/contentRegenerationService.js`**
   - Split `inferIntent()` into `generateInitialIntent()` and `refineIntentWith4W()`
   - Created `buildInitialIntentPrompt()` for Stage 2a
   - Rewrote `build4WReflectionPrompt()` (was `buildIntentPrompt()`) for Stage 2b
   - Updated usage tracking to include `initialIntent` and `refinedIntent` stages

2. **`types/actionables.ts`**
   - Updated `RegenerationIntent` interface to match new structure:
     - WHO: `inferred_role` instead of `role`
     - WHAT: `retrieval_needs`, `candidate_motivations`, `role_specific_constraints`
     - WHY: `initial_intent_statement`, `role_specific_need`, `semantic_gap`
     - HOW: `core_informational_focus`, `semantic_reconstruction`, `constraint_propagation`
     - Refined Intent: `preserved_core`, `expanded_scope`
   - Updated usage tracking types

---

## How It Works Now

1. **Stage 1:** Content Summarization (unchanged)

2. **Stage 2a:** Generate Initial Intent
   - LLM generates creator's initial projection of user search intent
   - Output: `{ statement, supporting_queries, confidence, creator_assumptions }`

3. **Stage 2b:** 4W Multi-Role Reflection
   - **WHO:** Infer 3-5 roles from initial intent (e.g., "technical professionals")
   - **WHAT:** For each role, generate role-conditioned retrieval needs
   - **WHY:** For each role, compare initial intent vs role needs (identify gaps)
   - **HOW:** Semantically reconstruct initial intent (preserve core, expand scope)
   - Output: `{ reflection: { who, what, why, how }, refined_intent }`

4. **Stage 3:** Step Planning (unchanged, uses refined intent)

5. **Stage 4:** Content Rewriting (unchanged, uses refined intent)

---

## Key Improvements

✅ **Proper two-stage intent modeling** (as per paper)  
✅ **WHO infers roles** from initial intent (not pre-generated)  
✅ **WHAT is role-conditioned** (needs generated per role)  
✅ **WHY compares initial intent vs role needs** (per role)  
✅ **HOW reconstructs intent** (preserves core, expands scope)  
✅ **Constraint propagation** to limit semantic drift  
✅ **Type safety** with updated TypeScript interfaces  

---

## Testing

The implementation is backward compatible - the combined `intent` object still includes both `initial_intent` and `refined_intent` for existing code.

To test:
1. Regenerate content in Actionables tab
2. Check logs for "Stage 2a" and "Stage 2b" messages
3. Verify intent structure includes inferred roles and role-conditioned WHAT/WHY

