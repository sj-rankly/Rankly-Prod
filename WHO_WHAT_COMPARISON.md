# WHO & WHAT Comparison: Paper vs Onboarding vs Current Implementation

## 📊 **Current Data Structure**

### **Onboarding Personas** (from Brand URL via Perplexity)
```javascript
{
  type: "Enterprise CTO",                    // Role name
  description: "Senior technical decision-maker...",  // Detailed description
  painPoints: ["Complex integration", "..."],        // Specific pain points
  goals: ["Reduce costs", "..."],                    // Specific goals
  relevance: "High" | "Medium" | "Low"              // Relevance score
}
```

### **Onboarding Topics** (from Brand URL via Perplexity)
```javascript
{
  name: "API Integration",                    // Topic name
  description: "How to integrate with...",   // Detailed description
  keywords: ["API", "integration", "..."],   // Relevant keywords
  priority: "High" | "Medium" | "Low"        // Priority score
}
```

---

## 🔍 **Comparison: Paper vs Onboarding vs My Implementation**

### **WHO Dimension**

#### **Paper Says:**
> "Infer a set of representative user roles most likely to search for this content (e.g., 'technical professionals', 'general readers', 'decision-makers'), **based on the initial intent**."

**Example from Paper:**
- "technical professionals"
- "general readers"
- "decision-makers"

#### **What We Have (Onboarding):**
```javascript
// Example personas from onboarding
[
  {
    type: "Enterprise CTO",
    description: "Senior technical decision-maker looking for enterprise solutions...",
    painPoints: ["Complex integration", "Security concerns", "Scalability"],
    goals: ["Reduce costs", "Improve efficiency", "Ensure compliance"],
    relevance: "High"
  },
  {
    type: "Startup Founder",
    description: "Early-stage entrepreneur seeking affordable solutions...",
    painPoints: ["Limited budget", "Time constraints", "Resource limitations"],
    goals: ["Quick setup", "Cost-effective", "Scalable growth"],
    relevance: "High"
  },
  {
    type: "Marketing Manager",
    description: "Marketing professional focused on customer acquisition...",
    painPoints: ["Lead generation", "ROI measurement", "Campaign optimization"],
    goals: ["Increase conversions", "Improve engagement", "Track metrics"],
    relevance: "Medium"
  }
]
```

#### **What I Implemented (Inferred Roles):**
```javascript
// What LLM would infer from initial intent
[
  {
    inferred_role: "technical professionals",  // Generic, inferred
    rationale: "Based on initial intent...",
    domain_background: "Technical expertise...",
    knowledge_profile: "expert"
  },
  {
    inferred_role: "general readers",           // Generic, inferred
    rationale: "Based on initial intent...",
    domain_background: "General knowledge...",
    knowledge_profile: "intermediate"
  }
]
```

#### **Key Differences:**

| Aspect | Paper Approach | Onboarding Personas | My Implementation |
|--------|---------------|---------------------|-------------------|
| **Source** | Inferred from initial intent | Generated from Brand URL (Perplexity) | Inferred from initial intent |
| **Quality** | Generic, page-specific | Brand-specific, comprehensive | Generic, page-specific |
| **Detail** | Basic role name | Full description, pain points, goals | Basic role name + rationale |
| **Relevance** | Not scored | High/Medium/Low | Not scored |
| **Context** | Single page | Entire brand/website | Single page |

**🎯 Your Point:** Onboarding personas are **brand-specific** and **comprehensive**, while inferred roles are **generic** and **page-specific**.

---

### **WHAT Dimension**

#### **Paper Says:**
> "For each **inferred user role**, the model conditions intent generation on their domain background and knowledge profile, producing candidate motivations and search goals."

**Example from Paper:**
- For "technical professionals": needs about technical specs, API docs, etc.
- For "general readers": needs about benefits, use cases, etc.

#### **What We Have (Onboarding Topics):**
```javascript
// Example topics from onboarding
[
  {
    name: "API Integration",
    description: "How to integrate with our API...",
    keywords: ["API", "integration", "REST", "webhooks"],
    priority: "High"
  },
  {
    name: "Pricing Plans",
    description: "Understanding our pricing structure...",
    keywords: ["pricing", "plans", "cost", "billing"],
    priority: "High"
  },
  {
    name: "Security Features",
    description: "Security measures and compliance...",
    keywords: ["security", "encryption", "compliance", "GDPR"],
    priority: "Medium"
  }
]
```

#### **What I Implemented (Role-Conditioned WHAT):**
```javascript
// What LLM would generate per inferred role
[
  {
    role: "technical professionals",           // Matches inferred role
    retrieval_needs: ["Technical specifications", "API documentation", "..."],
    candidate_motivations: ["Need to integrate", "..."],
    search_goals: ["Find integration guide", "..."],
    domain_background: "Technical expertise in APIs",
    knowledge_profile: "expert",
    role_specific_constraints: ["Must be technically accurate", "..."]
  },
  {
    role: "general readers",                    // Matches inferred role
    retrieval_needs: ["Benefits overview", "Use cases", "..."],
    candidate_motivations: ["Understanding value", "..."],
    search_goals: ["Learn about product", "..."],
    domain_background: "General knowledge",
    knowledge_profile: "intermediate",
    role_specific_constraints: ["Must be accessible", "..."]
  }
]
```

#### **Key Differences:**

| Aspect | Paper Approach | Onboarding Topics | My Implementation |
|--------|---------------|------------------|-------------------|
| **Source** | Generated per role | Generated from Brand URL (Perplexity) | Generated per role |
| **Structure** | Role-conditioned needs | Topic-based content areas | Role-conditioned needs |
| **Detail** | Needs, motivations, goals | Name, description, keywords | Needs, motivations, goals |
| **Priority** | Not scored | High/Medium/Low | Not scored |
| **Context** | Per role | Brand-wide | Per role |

**🎯 Your Point:** Onboarding topics are **brand-wide content areas**, while role-conditioned WHAT is **per-role information needs**.

---

## 💡 **Proposed Hybrid Approach**

### **Option 1: Use Onboarding Personas for WHO (Recommended)**

**WHO:** Use onboarding personas directly (they're brand-specific and comprehensive)
```javascript
reflection: {
  who: [
    {
      inferred_role: "Enterprise CTO",              // ✅ Use onboarding persona.type
      description: "Senior technical decision-maker...",  // ✅ Use onboarding persona.description
      painPoints: ["Complex integration", "..."],  // ✅ Use onboarding persona.painPoints
      goals: ["Reduce costs", "..."],              // ✅ Use onboarding persona.goals
      relevance: "High",                          // ✅ Use onboarding persona.relevance
      rationale: "This persona is likely to search for this content because..."  // ✅ Add rationale based on initial intent
    }
  ]
}
```

**WHAT:** Generate role-conditioned needs per persona (combine onboarding topics with role-specific needs)
```javascript
reflection: {
  what: [
    {
      role: "Enterprise CTO",                      // ✅ Matches persona from WHO
      relevant_topics: ["API Integration", "Security Features"],  // ✅ Map onboarding topics to this role
      retrieval_needs: [
        "Technical specifications for enterprise deployment",  // ✅ Role-specific need
        "Security and compliance documentation",            // ✅ Role-specific need
        "Integration guides for enterprise systems"          // ✅ Role-specific need
      ],
      candidate_motivations: [
        "Need to evaluate technical feasibility",            // ✅ From persona goals
        "Ensure security and compliance"                    // ✅ From persona pain points
      ],
      search_goals: [
        "Find enterprise integration guide",                 // ✅ Role-specific
        "Understand security features"                      // ✅ Role-specific
      ],
      domain_background: "Enterprise technology leadership", // ✅ From persona description
      knowledge_profile: "expert",                          // ✅ Inferred from persona
      role_specific_constraints: [
        "Must address enterprise-scale requirements",        // ✅ From persona pain points
        "Must demonstrate security and compliance"          // ✅ From persona goals
      ]
    }
  ]
}
```

**WHY:** Compare initial intent vs persona-specific needs
```javascript
reflection: {
  why: [
    {
      role: "Enterprise CTO",                              // ✅ Matches persona
      initial_intent_statement: "Users want to learn about our product",  // From initial intent
      role_specific_need: "Enterprise CTO needs technical specs and security docs",  // From WHAT
      semantic_gap: "Initial intent is too generic, doesn't address enterprise concerns",
      misalignment_cause: "Creator assumed general audience, but enterprise CTOs need specific technical details",
      impact: "Enterprise CTOs won't find relevant information, leading to low citations"
    }
  ]
}
```

**HOW:** Reconstruct intent using personas and topics
```javascript
reflection: {
  how: {
    core_informational_focus: "Product capabilities and benefits",  // Preserve from initial intent
    semantic_reconstruction: "Expand to address enterprise CTO concerns (security, scalability) while maintaining general appeal",
    generalization_strategy: "Layer enterprise-specific content (from topics) on top of general content",
    adaptability_enhancements: [
      "Add enterprise use cases",
      "Include security and compliance sections",
      "Provide technical integration guides"
    ],
    constraint_propagation: "Ensure all personas (Enterprise CTO, Startup Founder, Marketing Manager) find relevant content"
  }
}
```

---

### **Option 2: Hybrid - Use Onboarding Personas + Infer Additional Roles**

**WHO:** Use onboarding personas + infer page-specific roles if needed
```javascript
reflection: {
  who: [
    // ✅ Use onboarding personas (primary)
    { inferred_role: "Enterprise CTO", ... },  // From onboarding
    { inferred_role: "Startup Founder", ... }, // From onboarding
    
    // ✅ Infer additional roles if page content suggests different audience
    { inferred_role: "Content creators", ... },  // Inferred if page is about content tools
  ]
}
```

---

## 📋 **Recommendation**

### **Use Option 1: Onboarding Personas for WHO**

**Why:**
1. ✅ **Brand-specific:** Personas are generated from your brand URL, so they're more relevant
2. ✅ **Comprehensive:** They include pain points, goals, and relevance scores
3. ✅ **Already validated:** User selected them during onboarding
4. ✅ **Consistent:** Same personas used across all analyses

**Implementation:**
- **WHO:** Use onboarding personas directly (map `persona.type` to `inferred_role`)
- **WHAT:** Generate role-conditioned needs per persona (use onboarding topics as hints)
- **WHY:** Compare initial intent vs persona-specific needs
- **HOW:** Reconstruct intent using personas and topics

**Benefits:**
- More accurate role representation
- Better alignment with brand strategy
- Consistent with other features (prompt generation)
- Still role-conditioned WHAT (as per paper)

---

## 🔄 **What Needs to Change**

1. **WHO:** Instead of inferring roles, use onboarding personas directly
2. **WHAT:** Still role-conditioned, but map onboarding topics to personas
3. **WHY:** Compare initial intent vs persona needs (same structure)
4. **HOW:** Use personas and topics in reconstruction (same structure)

---

## ❓ **Your Decision**

Please review this comparison and tell me:
1. **WHO:** Use onboarding personas directly, or infer roles?
2. **WHAT:** How should we combine onboarding topics with role-conditioned needs?
3. **Any other adjustments?**

