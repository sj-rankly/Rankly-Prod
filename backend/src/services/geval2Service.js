/**
 * G-Eval 2.0 Service
 * 
 * Implements improved G-Eval methodology with:
 * 1. Prompt-generate-prompt strategy (generate evaluation prompts dynamically)
 * 2. 6-level evaluation rubric (0-5 instead of 1-5)
 * 3. Improved scoring reliability
 * 
 * Based on: "G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment"
 * Improved version with prompt-generate-prompt for better consistency
 */

const axios = require('axios');

class GEval2Service {
  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    this.model = 'openai/gpt-4o-mini'; // Use same model for consistency
    
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    
    console.log('📊 G-Eval 2.0 Service initialized');
    console.log(`   Model: ${this.model}`);
    console.log(`   Rubric: 6-level (0-5)`);
  }

  /**
   * Generate evaluation rubric/prompt for a specific dimension
   * This is the "prompt-generate-prompt" strategy
   * 
   * @param {string} dimension - Dimension name (e.g., 'relevance', 'influence')
   * @param {string} dimensionDescription - Description of what this dimension measures
   * @param {string} query - User query
   * @param {string} brandName - Brand name being evaluated
   * @returns {Promise<Object>} Generated rubric with prompt and criteria
   */
  async generateDimensionRubric(dimension, dimensionDescription, query, brandName) {
    console.log(`📝 [G-Eval 2.0] Generating rubric for dimension: ${dimension}`);

    const rubricGenerationPrompt = `You are an expert evaluation rubric designer. Your task is to create a detailed, granular 6-level evaluation rubric (0-5) for assessing "${dimension}" in LLM-generated answers.

Dimension: ${dimension}
Description: ${dimensionDescription}
Context: Evaluating how "${brandName}" is cited in answers to the query: "${query}"

Create a comprehensive 6-level rubric (0-5) with:
1. Clear, specific criteria for each level (0, 1, 2, 3, 4, 5)
2. Distinct differences between adjacent levels
3. Concrete examples of what each level looks like
4. Evaluation steps that ensure consistent scoring

Respond in JSON format:
{
  "rubric": {
    "level_0": {
      "score": 0,
      "description": "Clear description of what score 0 means",
      "criteria": ["Criterion 1", "Criterion 2"],
      "example": "Example scenario that would receive score 0"
    },
    "level_1": { ... },
    "level_2": { ... },
    "level_3": { ... },
    "level_4": { ... },
    "level_5": {
      "score": 5,
      "description": "Clear description of what score 5 means",
      "criteria": ["Criterion 1", "Criterion 2"],
      "example": "Example scenario that would receive score 5"
    }
  },
  "evaluation_steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "evaluation_prompt": "Complete prompt to use for evaluation using this rubric"
}`;

    try {
      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert evaluation rubric designer. Create detailed, granular rubrics that ensure consistent and reliable scoring. Respond ONLY with valid JSON.'
            },
            {
              role: 'user',
              content: rubricGenerationPrompt
            }
          ],
          temperature: 0.3, // Lower temperature for more consistent rubric generation
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rankly.ai',
            'X-Title': 'Rankly G-Eval 2.0 - Rubric Generation'
          },
          timeout: 30000
        }
      );

      const content = response.data.choices[0].message.content;
      const rubric = JSON.parse(content);

      console.log(`✅ [G-Eval 2.0] Rubric generated for ${dimension}`);
      return rubric;
    } catch (error) {
      console.error(`❌ [G-Eval 2.0] Error generating rubric for ${dimension}:`, error);
      // Fallback to default rubric structure
      return this.getDefaultRubric(dimension, dimensionDescription);
    }
  }

  /**
   * Get default rubric structure if generation fails
   */
  getDefaultRubric(dimension, dimensionDescription) {
    return {
      rubric: {
        level_0: {
          score: 0,
          description: `${dimension} is completely absent or irrelevant`,
          criteria: ['Not mentioned', 'No relevance to query'],
          example: 'Brand is not cited at all'
        },
        level_1: {
          score: 1,
          description: `Minimal ${dimension} with very limited value`,
          criteria: ['Mentioned but not relevant', 'Minimal contribution'],
          example: 'Brand is mentioned but provides no useful information'
        },
        level_2: {
          score: 2,
          description: `Some ${dimension} but with significant gaps`,
          criteria: ['Partially relevant', 'Limited contribution'],
          example: 'Brand is mentioned with some relevant information but incomplete'
        },
        level_3: {
          score: 3,
          description: `Moderate ${dimension} with acceptable quality`,
          criteria: ['Generally relevant', 'Moderate contribution'],
          example: 'Brand is cited with relevant information that addresses the query'
        },
        level_4: {
          score: 4,
          description: `Strong ${dimension} with high quality`,
          criteria: ['Highly relevant', 'Strong contribution'],
          example: 'Brand is prominently cited with comprehensive, relevant information'
        },
        level_5: {
          score: 5,
          description: `Exceptional ${dimension} with outstanding quality`,
          criteria: ['Perfectly relevant', 'Essential contribution'],
          example: 'Brand is excellently cited with exceptional, comprehensive information'
        }
      },
      evaluation_steps: [
        `Read the query and generated answers carefully`,
        `Identify how "${dimension}" is demonstrated in the brand citation`,
        `Compare against the 6-level rubric criteria`,
        `Assign the appropriate score (0-5) based on best match`
      ],
      evaluation_prompt: `Evaluate ${dimension} using the provided 6-level rubric (0-5).`
    };
  }

  /**
   * Evaluate a single dimension using generated rubric
   * 
   * @param {string} dimension - Dimension name
   * @param {Object} rubric - Generated rubric for this dimension
   * @param {string} query - User query
   * @param {Array} promptTests - Prompt test responses
   * @param {string} brandName - Brand name
   * @returns {Promise<Object>} Evaluation result with score and reasoning
   */
  async evaluateDimension(dimension, rubric, query, promptTests, brandName) {
    console.log(`📊 [G-Eval 2.0] Evaluating dimension: ${dimension}`);

    // Format platform answers
    const platformAnswers = promptTests.map((pt, idx) => {
      return `Platform ${idx + 1} (${pt.llmProvider.toUpperCase()}):\n${pt.rawResponse}\n---`;
    }).join('\n\n');

    // Build evaluation prompt using generated rubric
    const evaluationPrompt = `You are evaluating how "${brandName}" is cited in LLM-generated answers.

Query: ${query}

Generated Answers:
${platformAnswers}

==================================================
EVALUATION RUBRIC FOR ${dimension.toUpperCase()}
==================================================

${JSON.stringify(rubric.rubric, null, 2)}

==================================================
EVALUATION STEPS
==================================================

${rubric.evaluation_steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

==================================================
TASK
==================================================

Evaluate the ${dimension} of "${brandName}" citation using the 6-level rubric above (0-5).

Provide:
1. A score from 0 to 5 (integer only)
2. A concise reasoning (30-35 words) explaining your score based on the rubric criteria
3. Reference the specific rubric level that best matches the citation

Respond in JSON format:
{
  "score": 0-5,
  "reasoning": "Concise explanation (30-35 words) referencing specific rubric criteria",
  "matched_level": "level_X",
  "key_factors": ["Factor 1", "Factor 2"]
}`;

    try {
      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert evaluator using G-Eval 2.0 methodology. Evaluate ${dimension} objectively using the provided 6-level rubric. Respond ONLY with valid JSON.`
            },
            {
              role: 'user',
              content: evaluationPrompt
            }
          ],
          temperature: 0.4, // Balanced for consistency
          max_tokens: 500,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rankly.ai',
            'X-Title': 'Rankly G-Eval 2.0 - Dimension Evaluation'
          },
          timeout: 30000
        }
      );

      const content = response.data.choices[0].message.content;
      const evaluation = JSON.parse(content);

      // Validate score is 0-5
      if (typeof evaluation.score !== 'number' || evaluation.score < 0 || evaluation.score > 5) {
        throw new Error(`Invalid score: ${evaluation.score} (must be 0-5)`);
      }

      // Round to integer
      evaluation.score = Math.round(evaluation.score);

      console.log(`✅ [G-Eval 2.0] ${dimension} evaluated: ${evaluation.score}/5`);
      return evaluation;
    } catch (error) {
      console.error(`❌ [G-Eval 2.0] Error evaluating ${dimension}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate all dimensions using G-Eval 2.0 methodology
   * 
   * @param {string} query - User query
   * @param {Array} promptTests - Prompt test responses
   * @param {string} brandName - Brand name
   * @returns {Promise<Object>} Complete evaluation with all dimensions
   */
  async evaluateAllDimensions(query, promptTests, brandName) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 [G-Eval 2.0] Starting evaluation for "${brandName}"`);
    console.log(`   Query: ${query.substring(0, 100)}...`);
    console.log(`   Platforms: ${promptTests.map(pt => pt.llmProvider).join(', ')}`);
    console.log('='.repeat(70));

    const dimensions = [
      {
        name: 'relevance',
        description: 'The degree to which the citation text is directly related to the query. Measures how well the source addresses the user\'s query and provides useful and pertinent information.'
      },
      {
        name: 'influence',
        description: 'The degree to which the answer depends on the citation. Measures how much the source contributes to the completeness, coherence, and overall quality of the answer.'
      },
      {
        name: 'uniqueness',
        description: 'The unique information in answer cited to the brand. Measures how much impression/visibility the source has on the user reading the generated answer.'
      },
      {
        name: 'position',
        description: 'The likelihood that a user, while reading the answer, would encounter the citation. Measures how prominently the source is positioned within the answer from the user\'s perspective.'
      },
      {
        name: 'clickProbability',
        description: 'The likelihood that a user, after reading the citation, would navigate to the website for more information. Measures how much the source engages the user\'s interest and prompts them to seek more information.'
      },
      {
        name: 'diversity',
        description: 'The range of different ideas or topics discussed in the citation. Measures how much the source contributes to a comprehensive and balanced answer to the user\'s query.'
      }
    ];

    const results = {};
    const rubrics = {};

    // Step 1: Generate rubrics for all dimensions (prompt-generate-prompt)
    console.log('\n📝 [G-Eval 2.0] Step 1: Generating rubrics for all dimensions...');
    for (const dimension of dimensions) {
      try {
        const rubric = await this.generateDimensionRubric(
          dimension.name,
          dimension.description,
          query,
          brandName
        );
        rubrics[dimension.name] = rubric;
      } catch (error) {
        console.error(`⚠️ [G-Eval 2.0] Error generating rubric for ${dimension.name}, using default`);
        rubrics[dimension.name] = this.getDefaultRubric(dimension.name, dimension.description);
      }
    }

    // Step 2: Evaluate each dimension using its generated rubric
    console.log('\n📊 [G-Eval 2.0] Step 2: Evaluating all dimensions using generated rubrics...');
    for (const dimension of dimensions) {
      try {
        const evaluation = await this.evaluateDimension(
          dimension.name,
          rubrics[dimension.name],
          query,
          promptTests,
          brandName
        );
        results[dimension.name] = {
          score: evaluation.score,
          reasoning: evaluation.reasoning,
          matchedLevel: evaluation.matched_level,
          keyFactors: evaluation.key_factors || []
        };
      } catch (error) {
        console.error(`❌ [G-Eval 2.0] Error evaluating ${dimension.name}:`, error);
        // Use default score of 0 if evaluation fails
        results[dimension.name] = {
          score: 0,
          reasoning: `Evaluation failed: ${error.message}`,
          matchedLevel: 'level_0',
          keyFactors: []
        };
      }
    }

    // Step 3: Calculate overall quality
    const avgScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / dimensions.length;
    results.overallQuality = {
      score: Math.round(avgScore * 10) / 10, // Round to 1 decimal
      summary: `Overall quality based on average of all 6 dimensions: ${avgScore.toFixed(1)}/5. ${Object.entries(results).filter(([k]) => k !== 'overallQuality').map(([k, v]) => `${k}: ${v.score}`).join(', ')}.`
    };

    console.log('\n✅ [G-Eval 2.0] Evaluation complete');
    console.log(`   Average score: ${results.overallQuality.score}/5`);
    console.log('='.repeat(70) + '\n');

    return {
      metrics: results,
      rubrics: rubrics, // Store generated rubrics for reference
      methodology: 'G-Eval 2.0 (prompt-generate-prompt + 6-level rubric)'
    };
  }
}

module.exports = new GEval2Service();

