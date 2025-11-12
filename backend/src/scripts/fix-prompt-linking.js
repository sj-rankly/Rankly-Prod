const mongoose = require('mongoose');
require('dotenv').config();

const Prompt = require('../models/Prompt');
const PromptTest = require('../models/PromptTest');
const UrlAnalysis = require('../models/UrlAnalysis');

async function fixPromptLinking() {
  try {
    console.log('🔧 Starting prompt linking fix...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly');
    console.log('✅ Connected to MongoDB');

    // Get all prompts with undefined urlAnalysisId
    const unlinkedPrompts = await Prompt.find({ 
      urlAnalysisId: { $exists: false } 
    }).lean();
    
    console.log(`📝 Found ${unlinkedPrompts.length} unlinked prompts`);

    if (unlinkedPrompts.length === 0) {
      console.log('✅ All prompts are already properly linked');
      process.exit(0);
    }

    // Get all URL analyses to match prompts
    const urlAnalyses = await UrlAnalysis.find({}).lean();
    console.log(`🔗 Found ${urlAnalyses.length} URL analyses`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const prompt of unlinkedPrompts) {
      console.log(`\n🔍 Processing prompt: "${prompt.text.substring(0, 50)}..."`);
      
      // Try to determine which URL this prompt belongs to based on content
      let targetUrlAnalysis = null;
      
      // Check if prompt mentions specific brands/companies
      const promptText = prompt.text.toLowerCase();
      
      // MongoDB-related prompts
      if (promptText.includes('mongodb')) {
        targetUrlAnalysis = urlAnalyses.find(ua => 
          ua.url.includes('mongodb.com') || 
          ua.brandContext?.companyName?.toLowerCase().includes('mongodb')
        );
      }
      // GitHub-related prompts
      else if (promptText.includes('github') || promptText.includes('code hosting') || promptText.includes('repository')) {
        targetUrlAnalysis = urlAnalyses.find(ua => 
          ua.url.includes('github.com') || 
          ua.brandContext?.companyName?.toLowerCase().includes('github')
        );
      }
      // Wargames-related prompts
      else if (promptText.includes('wargames') || promptText.includes('overthewire')) {
        targetUrlAnalysis = urlAnalyses.find(ua => 
          ua.url.includes('overthewire.org') || 
          ua.brandContext?.companyName?.toLowerCase().includes('wargames')
        );
      }
      // Arch Linux-related prompts
      else if (promptText.includes('arch linux') || promptText.includes('linux distribution')) {
        targetUrlAnalysis = urlAnalyses.find(ua => 
          ua.url.includes('archlinux.org') || 
          ua.brandContext?.companyName?.toLowerCase().includes('arch')
        );
      }
      // Google-related prompts
      else if (promptText.includes('google') || promptText.includes('sheets') || promptText.includes('workspace')) {
        targetUrlAnalysis = urlAnalyses.find(ua => 
          ua.url.includes('google.com') || 
          ua.brandContext?.companyName?.toLowerCase().includes('google')
        );
      }

      if (targetUrlAnalysis) {
        console.log(`   ✅ Linking to: ${targetUrlAnalysis.brandContext?.companyName} (${targetUrlAnalysis.url})`);
        
        // Update the prompt
        await Prompt.updateOne(
          { _id: prompt._id },
          { $set: { urlAnalysisId: targetUrlAnalysis._id } }
        );
        
        // Update all related prompt tests
        const testUpdateResult = await PromptTest.updateMany(
          { promptId: prompt._id },
          { $set: { urlAnalysisId: targetUrlAnalysis._id } }
        );
        
        console.log(`   📊 Updated ${testUpdateResult.modifiedCount} prompt tests`);
        fixedCount++;
      } else {
        console.log(`   ⚠️  Could not determine target URL for this prompt`);
        console.log(`   📝 Prompt text: "${prompt.text}"`);
        skippedCount++;
      }
    }

    console.log(`\n🎉 Prompt linking fix completed!`);
    console.log(`✅ Fixed: ${fixedCount} prompts`);
    console.log(`⚠️  Skipped: ${skippedCount} prompts`);

    // Verify the fix
    console.log(`\n🔍 Verification:`);
    const remainingUnlinked = await Prompt.countDocuments({ 
      urlAnalysisId: { $exists: false } 
    });
    console.log(`📝 Remaining unlinked prompts: ${remainingUnlinked}`);

    const linkedPrompts = await Prompt.countDocuments({ 
      urlAnalysisId: { $exists: true, $ne: null } 
    });
    console.log(`✅ Properly linked prompts: ${linkedPrompts}`);

    // Check prompt tests
    const unlinkedTests = await PromptTest.countDocuments({ 
      urlAnalysisId: { $exists: false } 
    });
    console.log(`🧪 Unlinked prompt tests: ${unlinkedTests}`);

    const linkedTests = await PromptTest.countDocuments({ 
      urlAnalysisId: { $exists: true, $ne: null } 
    });
    console.log(`✅ Properly linked prompt tests: ${linkedTests}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing prompt linking:', error);
    process.exit(1);
  }
}

// Run the fix
fixPromptLinking();
