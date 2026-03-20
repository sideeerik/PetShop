// PetShop/backend/controllers/groqchatbot.js
const Groq = require('groq-sdk');
const path = require('path');

console.log('Current directory:', __dirname);
console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);

// List of currently supported Groq models (as of 2026)
const SUPPORTED_MODELS = {
  LLAMA_3_3_70B: 'llama-3.3-70b-versatile',     // Latest and most powerful
  LLAMA_3_1_8B: 'llama-3.1-8b-instant',         // Fast and capable
  LLAMA_GUARD_3_8B: 'llama-guard-3-8b',         // Safe and reliable
  GEMMA_2_9B: 'gemma2-9b-it',                    // Good for specialized tasks
  MIXTRAL_8x7B: 'mixtral-8x7b-32768'             // DEPRECATED - DO NOT USE
};

// Initialize Groq with error handling
let groq;
try {
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY is not set in environment variables');
    console.error('Please check your .env file at:', path.join(__dirname, '../config/.env'));
    console.error('Make sure it contains: GROQ_API_KEY=your_api_key_here');
  } else {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    console.log('✅ Groq SDK initialized successfully');
    console.log('📋 Using model: llama-3.3-70b-versatile (latest supported)');
  }
} catch (error) {
  console.error('❌ Failed to initialize Groq SDK:', error.message);
}

// Store conversation history (in production, use Redis or database)
const conversations = new Map();

// Pet types and their handling guides (without specific products)
const petHandlingGuides = {
  '🐶 Dog': {
    description: "Man's best friend - loyal, active, and loving",
    handlingGuide: {
      howToHold: "Support their chest with one arm and hindquarters with the other. Never lift by legs or scruff. For small dogs, cradle like a baby. For large dogs, lift with proper back support.",
      howToCarry: "Use both arms to support their weight. For small dogs, hold close to your chest. For medium-large dogs, one arm under chest, one under hindquarters.",
      safetyTips: [
        "Always use a properly fitted collar/harness from our shop",
        "Never leave unattended in cars",
        "Introduce new people/animals slowly",
        "Keep dangerous foods/items out of reach",
        "Use our safety accessories for walks and travel"
      ],
      firstTimeOwner: "Start with basic training, establish routine, puppy-proof your home, and visit our shop for all essential supplies! We have everything from food bowls to training pads."
    },
    categories: ['Pet Food', 'Pet Accessories', 'Pet Toys', 'Health & Wellness', 'Grooming Supplies', 'Feeding Supplies', 'Housing & Cages']
  },
  '🐱 Cat': {
    description: "Independent, graceful, and affectionate companions",
    handlingGuide: {
      howToHold: "Support their chest with one hand and hindquarters with the other. Never scruff an adult cat. Let them feel secure against your body.",
      howToCarry: "Cradle like a baby or hold against your chest with one arm supporting hindquarters. Watch for signs of stress.",
      safetyTips: [
        "Keep indoors for safety",
        "Provide scratching posts from our accessories section",
        "Use breakaway collars available in our shop",
        "Keep toxic plants away",
        "Secure windows and balconies"
      ],
      firstTimeOwner: "Create a safe room first, provide vertical space, establish litter box routine, and visit our shop for starter essentials! We carry everything from litter boxes to scratching posts."
    },
    categories: ['Pet Food', 'Pet Accessories', 'Pet Toys', 'Health & Wellness', 'Grooming Supplies', 'Feeding Supplies', 'Housing & Cages']
  },
  '🐹 Hamster': {
    description: "Small, active, and adorable pocket pets",
    handlingGuide: {
      howToHold: "Cup gently in both hands. Never squeeze. Let them walk from hand to hand. Always sit on floor when handling in case they jump.",
      howToCarry: "Use both hands cupped together. Keep close to your body. For transport, use our secure hamster carriers from the housing section.",
      safetyTips: [
        "Never wake a sleeping hamster",
        "Provide exercise wheel from our accessories",
        "Use proper bedding from our housing section",
        "Keep away from other pets",
        "Ensure cage bars are appropriate size"
      ],
      firstTimeOwner: "Set up their cage first, provide deep bedding for burrowing, add an exercise wheel, and shop with us for complete habitat setups!"
    },
    categories: ['Pet Food', 'Pet Accessories', 'Pet Toys', 'Health & Wellness', 'Grooming Supplies', 'Feeding Supplies', 'Housing & Cages']
  },
  '🐰 Rabbit': {
    description: "Gentle, social, and curious hoppers",
    handlingGuide: {
      howToHold: "Support hindquarters firmly - rabbits can kick and injure their spine. One hand under chest, one hand supporting bottom. Hold close to your body.",
      howToCarry: "Always support full body weight. Never lift by ears or scruff. Use our rabbit-safe carriers for transport.",
      safetyTips: [
        "Rabbits need exercise time outside cage",
        "Provide hay always for digestive health",
        "Rabbit-proof electrical cords",
        "Use our harnesses for outdoor time",
        "Keep temperature moderate"
      ],
      firstTimeOwner: "Prepare a spacious cage, stock up on Timothy hay, provide hiding spots, and visit our shop for complete rabbit care essentials!"
    },
    categories: ['Pet Food', 'Pet Accessories', 'Pet Toys', 'Health & Wellness', 'Grooming Supplies', 'Feeding Supplies', 'Housing & Cages']
  },
  '🐦 Parrot': {
    description: "Intelligent, colorful, and talkative companions",
    handlingGuide: {
      howToHold: "Let them step onto your hand. Never grab or squeeze. Support feet and provide steady perch. Some prefer shoulder sitting.",
      howToCarry: "Use T-perch for transport. For larger birds, use both hands. Our travel cages from the housing section are perfect for safe transport.",
      safetyTips: [
        "Never use non-stick cookware near birds",
        "Provide varied perches from our accessories",
        "Keep wings clipped by professional",
        "Avoid ceiling fans",
        "Use our bird-safe toys for enrichment"
      ],
      firstTimeOwner: "Research your specific species, prepare a large cage, provide varied diet, and explore our bird section for all supplies!"
    },
    categories: ['Pet Food', 'Pet Accessories', 'Pet Toys', 'Health & Wellness', 'Grooming Supplies', 'Feeding Supplies', 'Housing & Cages']
  },
  '🐠 Goldfish': {
    description: "Peaceful, beautiful, and relaxing aquatic pets",
    handlingGuide: {
      howToHold: "Never hold with bare hands - it damages their protective slime coat. Use our soft fish nets from grooming supplies for moving.",
      howToCarry: "Transport in bags or containers with tank water. Our fish transport bags are available in the housing section.",
      safetyTips: [
        "Never put in bowl - need proper tank",
        "Cycle tank before adding fish",
        "Use water conditioner from health section",
        "Don't overfeed",
        "Regular water changes with our testing kits"
      ],
      firstTimeOwner: "Set up tank and cycle for 2-4 weeks first, add plants and decorations from our accessories, and visit our shop for water testing supplies!"
    },
    categories: ['Pet Food', 'Pet Accessories', 'Health & Wellness', 'Grooming Supplies', 'Feeding Supplies', 'Housing & Cages']
  }
};

// Clean old conversations every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [sessionId, data] of conversations.entries()) {
    if (data.lastUpdated < oneHourAgo) {
      conversations.delete(sessionId);
      console.log(`Cleaned up old session: ${sessionId}`);
    }
  }
}, 60 * 60 * 1000);

/**
 * System prompt focused on YOUR specific pets, handling guides, and shop products
 */
const SYSTEM_PROMPT = {
  role: "system",
  content: `You are PetSense AI, a specialized assistant for our pet shop that sells products for these specific pets:

  OUR PETS AND HANDLING GUIDES:
  
  🐶 DOG:
  - Handling: Support chest and hindquarters when lifting. Never lift by legs.
  - Carrying: Use both arms to support weight. Small dogs can be cradled.
  - Safety: Use proper collars/harnesses from our shop. Never leave in cars.
  - First-time tips: Puppy-proof home, establish routine, visit our shop for essentials.
  - Categories we sell: Pet Food, Pet Accessories, Pet Toys, Health & Wellness, Grooming Supplies, Feeding Supplies, Housing & Cages

  🐱 CAT:
  - Handling: Support chest and hindquarters. Never scruff adult cats.
  - Carrying: Cradle against body or hold with support. Watch for stress signs.
  - Safety: Use breakaway collars from our shop. Keep indoors for safety.
  - First-time tips: Create safe room, provide vertical space, shop with us for litter boxes and scratching posts.
  - Categories we sell: Pet Food, Pet Accessories, Pet Toys, Health & Wellness, Grooming Supplies, Feeding Supplies, Housing & Cages

  🐹 HAMSTER:
  - Handling: Cup gently in both hands. Never squeeze. Always sit on floor.
  - Carrying: Use both hands cupped together. Use our secure carriers.
  - Safety: Provide exercise wheel from our accessories. Never wake sleeping hamster.
  - First-time tips: Set up cage first, deep bedding for burrowing, shop our habitat section.
  - Categories we sell: Pet Food, Pet Accessories, Pet Toys, Health & Wellness, Grooming Supplies, Feeding Supplies, Housing & Cages

  🐰 RABBIT:
  - Handling: Support hindquarters firmly. Never lift by ears. Hold close to body.
  - Carrying: Always support full body weight. Use our rabbit-safe carriers.
  - Safety: Provide hay always. Rabbit-proof cords. Use our harnesses for outdoor time.
  - First-time tips: Spacious cage, stock Timothy hay, hiding spots, shop our rabbit section.
  - Categories we sell: Pet Food, Pet Accessories, Pet Toys, Health & Wellness, Grooming Supplies, Feeding Supplies, Housing & Cages

  🐦 PARROT:
  - Handling: Let them step onto hand. Never grab. Support feet. Use T-perch.
  - Carrying: Use travel cages from our housing section. Both hands for large birds.
  - Safety: No non-stick cookware. Varied perches from our accessories. Avoid ceiling fans.
  - First-time tips: Research species, large cage, varied diet, explore our bird supplies.
  - Categories we sell: Pet Food, Pet Accessories, Pet Toys, Health & Wellness, Grooming Supplies, Feeding Supplies, Housing & Cages

  🐠 GOLDFISH:
  - Handling: Never hold with bare hands. Use our soft fish nets.
  - Carrying: Transport in bags with tank water. Our fish bags available.
  - Safety: Need proper tank (no bowls). Use water conditioner from our shop. Don't overfeed.
  - First-time tips: Cycle tank 2-4 weeks first, add plants from accessories, shop our aquarium section.
  - Categories we sell: Pet Food, Pet Accessories, Health & Wellness, Grooming Supplies, Feeding Supplies, Housing & Cages

  YOUR ROLE:
  1. Help customers choose the right products from our shop based on their pet
  2. Give advice on how to properly handle, carry, and care for their pet
  3. Recommend which category of products they might need
  4. Guide first-time pet owners on setup and essentials
  5. Suggest safety tips using products from our shop

  IMPORTANT RULES:
  - ONLY help with these 6 pet types: Dogs, Cats, Hamsters, Rabbits, Parrots, Goldfish
  - When recommending products, direct them to the specific category (Pet Food, Accessories, etc.)
  - Always include handling/carrying tips when relevant
  - Encourage visiting our shop for specific product needs
  - Be warm, helpful, and knowledgeable about pet care

  EXAMPLE RESPONSES:
  "For your 🐶 dog, when carrying them, always support their chest and hindquarters. We have great harnesses in our Pet Accessories section that make carrying safer and more comfortable!"

  "New 🐹 hamster owner? Great choice! When handling, always cup them gently in both hands while sitting on the floor. Stop by our shop - we have everything in our Housing & Cages section to set up the perfect habitat!"

  "Looking for 🐱 cat supplies? Check out our Pet Toys category for interactive toys, and don't forget our Health & Wellness section for flea prevention. Always use a breakaway collar from our Accessories for safety!"

  OFF-LIMITS RESPONSE:
  If asked about pets not in our list or non-pet topics:
  "🐾 We specialize in products and care advice for dogs, cats, hamsters, rabbits, parrots, and goldfish! I'd be happy to help you with any of these wonderful pets. Which one do you have?"`
};

/**
 * Detect pet type from user message
 */
function detectPetType(message) {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('dog') || messageLower.includes('puppy')) return '🐶 Dog';
  if (messageLower.includes('cat') || messageLower.includes('kitten')) return '🐱 Cat';
  if (messageLower.includes('hamster')) return '🐹 Hamster';
  if (messageLower.includes('rabbit') || messageLower.includes('bunny')) return '🐰 Rabbit';
  if (messageLower.includes('parrot') || messageLower.includes('bird')) return '🐦 Parrot';
  if (messageLower.includes('goldfish') || messageLower.includes('fish')) return '🐠 Goldfish';
  
  return null;
}

/**
 * Send a message to Groq chatbot
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    // Check if Groq is initialized
    if (!groq) {
      return res.status(500).json({ 
        success: false, 
        error: 'Groq API not initialized. Please check your GROQ_API_KEY in .env file.' 
      });
    }

    // Get or create conversation
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, {
        messages: [SYSTEM_PROMPT],
        lastUpdated: Date.now(),
        createdAt: Date.now(),
        petType: null // Track what pet the customer has
      });
      console.log(`New PetSense session created: ${sessionId}`);
    }

    const conversation = conversations.get(sessionId);
    
    // Try to detect pet type from message
    const petTypeDetected = detectPetType(message);
    if (petTypeDetected && !conversation.petType) {
      conversation.petType = petTypeDetected;
      console.log(`Pet type detected for session ${sessionId}: ${petTypeDetected}`);
    }

    // Add user message
    conversation.messages.push({
      role: "user",
      content: message
    });
    conversation.lastUpdated = Date.now();

    // Keep only last 10 messages for context
    const messagesToSend = [
      conversation.messages[0], // System prompt
      ...conversation.messages.slice(-9) // Last 9 messages
    ];

    console.log(`Processing pet shop query for session ${sessionId}`);

    // Call Groq API with the latest supported model
    const chatCompletion = await groq.chat.completions.create({
      messages: messagesToSend,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.9,
    });

    const response = chatCompletion.choices[0]?.message?.content || '';

    // Add assistant response
    conversation.messages.push({
      role: "assistant",
      content: response
    });

    // Keep conversation manageable
    if (conversation.messages.length > 21) {
      conversation.messages = [
        conversation.messages[0],
        ...conversation.messages.slice(-20)
      ];
    }

    return res.json({
      success: true,
      response,
      sessionId: sessionId,
      detectedPetType: conversation.petType
    });

  } catch (error) {
    console.error('Groq API Error:', error);
    
    let errorMessage = 'Failed to get response from PetSense AI';
    let statusCode = 500;

    // Handle specific error types
    if (error.status === 401) {
      errorMessage = 'API configuration error. Please check your GROQ_API_KEY.';
      statusCode = 401;
    } else if (error.status === 429) {
      errorMessage = 'Too many requests. Please try again later.';
      statusCode = 429;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Network error. Cannot connect to Groq API.';
    } else if (error.message.includes('API key')) {
      errorMessage = 'Invalid GROQ_API_KEY. Please check your API key.';
    } else if (error.message.includes('model') && error.message.includes('decommissioned')) {
      console.error('⚠️ Model deprecated error caught - using fallback response');
      
      const fallbackSessionId = req.body.sessionId || 'default';
      
      return res.json({
        success: true,
        response: "🐾 I'm here to help with your pet! Whether you have a dog, cat, hamster, rabbit, parrot, or goldfish, I can give you handling tips and guide you to the right products in our shop. Tell me about your pet and what you need!",
        sessionId: fallbackSessionId
      });
    }

    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: error.message,
      sessionId: req.body.sessionId || 'default'
    });
  }
};

/**
 * Get handling guide for specific pet
 */
exports.getHandlingGuide = (req, res) => {
  try {
    const { petType } = req.params;
    
    // Format pet type for lookup (add emoji if needed)
    let formattedPetType = petType;
    if (!petType.includes('🐶') && !petType.includes('🐱') && !petType.includes('🐹') && 
        !petType.includes('🐰') && !petType.includes('🐦') && !petType.includes('🐠')) {
      
      const petLower = petType.toLowerCase();
      if (petLower.includes('dog')) formattedPetType = '🐶 Dog';
      else if (petLower.includes('cat')) formattedPetType = '🐱 Cat';
      else if (petLower.includes('hamster')) formattedPetType = '🐹 Hamster';
      else if (petLower.includes('rabbit') || petLower.includes('bunny')) formattedPetType = '🐰 Rabbit';
      else if (petLower.includes('parrot') || petLower.includes('bird')) formattedPetType = '🐦 Parrot';
      else if (petLower.includes('goldfish') || petLower.includes('fish')) formattedPetType = '🐠 Goldfish';
    }
    
    const guide = petHandlingGuides[formattedPetType];
    
    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Pet type not found',
        validPets: Object.keys(petHandlingGuides)
      });
    }

    return res.json({
      success: true,
      petType: formattedPetType,
      description: guide.description,
      handlingGuide: guide.handlingGuide,
      categories: guide.categories,
      message: `Here's how to properly handle your ${formattedPetType}! Visit our shop for all the supplies you need.`
    });

  } catch (error) {
    console.error('Get handling guide error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get handling guide' 
    });
  }
};

/**
 * Get categories for a specific pet
 */
exports.getPetCategories = (req, res) => {
  try {
    const { petType } = req.params;
    
    // Format pet type for lookup
    let formattedPetType = petType;
    if (!petType.includes('🐶') && !petType.includes('🐱') && !petType.includes('🐹') && 
        !petType.includes('🐰') && !petType.includes('🐦') && !petType.includes('🐠')) {
      
      const petLower = petType.toLowerCase();
      if (petLower.includes('dog')) formattedPetType = '🐶 Dog';
      else if (petLower.includes('cat')) formattedPetType = '🐱 Cat';
      else if (petLower.includes('hamster')) formattedPetType = '🐹 Hamster';
      else if (petLower.includes('rabbit') || petLower.includes('bunny')) formattedPetType = '🐰 Rabbit';
      else if (petLower.includes('parrot') || petLower.includes('bird')) formattedPetType = '🐦 Parrot';
      else if (petLower.includes('goldfish') || petLower.includes('fish')) formattedPetType = '🐠 Goldfish';
    }
    
    const guide = petHandlingGuides[formattedPetType];
    
    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Pet type not found',
        validPets: Object.keys(petHandlingGuides)
      });
    }

    return res.json({
      success: true,
      petType: formattedPetType,
      categories: guide.categories,
      message: `Shop our ${formattedPetType} section! We have everything in these categories.`
    });

  } catch (error) {
    console.error('Get pet categories error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get categories' 
    });
  }
};

/**
 * Clear conversation history
 */
exports.clearConversation = (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    
    if (conversations.has(sessionId)) {
      conversations.set(sessionId, {
        messages: [SYSTEM_PROMPT],
        lastUpdated: Date.now(),
        createdAt: conversations.get(sessionId)?.createdAt || Date.now(),
        petType: null
      });
      
      console.log(`Cleared PetSense chat for session: ${sessionId}`);
      
      return res.json({ 
        success: true, 
        message: 'Conversation cleared',
        sessionId 
      });
    } else {
      return res.json({ 
        success: true, 
        message: 'No conversation found',
        sessionId 
      });
    }
  } catch (error) {
    console.error('Clear conversation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to clear conversation' 
    });
  }
};

/**
 * Get conversation history
 */
exports.getHistory = (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const conversation = conversations.get(sessionId);
    
    if (!conversation) {
      return res.json({
        success: true,
        messages: [],
        sessionId
      });
    }

    // Filter out system messages for history
    const chatHistory = conversation.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    return res.json({
      success: true,
      messages: chatHistory,
      petType: conversation.petType,
      sessionId,
      createdAt: conversation.createdAt,
      lastUpdated: conversation.lastUpdated
    });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get history' 
    });
  }
};

/**
 * Health check endpoint
 */
exports.healthCheck = (req, res) => {
  try {
    return res.json({
      status: 'healthy',
      service: 'PetSense AI - Pet Shop Assistant with Handling Guides',
      activeSessions: conversations.size,
      apiConfigured: !!process.env.GROQ_API_KEY,
      groqInitialized: !!groq,
      model: 'llama-3.3-70b-versatile',
      petsSupported: Object.keys(petHandlingGuides),
      categories: ['Pet Food', 'Pet Accessories', 'Pet Toys', 'Health & Wellness', 'Grooming Supplies', 'Feeding Supplies', 'Housing & Cages'],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Health check failed' 
    });
  }
};

/**
 * Get available models (useful for debugging)
 */
exports.getAvailableModels = async (req, res) => {
  try {
    if (!groq) {
      return res.status(500).json({ 
        success: false, 
        error: 'Groq API not initialized' 
      });
    }

    return res.json({
      success: true,
      currentModel: 'llama-3.3-70b-versatile',
      recommendedModel: 'llama-3.3-70b-versatile',
      supportedModels: SUPPORTED_MODELS,
      note: 'llama-3.3-70b-versatile is the latest supported model as of 2026'
    });
  } catch (error) {
    console.error('Get models error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get models' 
    });
  }
};

// Get active sessions (for debugging)
exports.getActiveSessions = (req, res) => {
  try {
    const sessions = Array.from(conversations.entries()).map(([id, data]) => ({
      sessionId: id,
      messageCount: data.messages.length,
      petType: data.petType || 'Not identified',
      createdAt: data.createdAt,
      lastUpdated: data.lastUpdated,
      age: Math.round((Date.now() - data.createdAt) / 60000) + ' minutes'
    }));

    return res.json({
      success: true,
      totalSessions: conversations.size,
      sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get sessions' 
    });
  }
};

/**
 * Validate if pet type is supported
 */
exports.validatePet = (req, res) => {
  try {
    const { petType } = req.params;
    
    // Format pet type for lookup
    let formattedPetType = petType;
    if (!petType.includes('🐶') && !petType.includes('🐱') && !petType.includes('🐹') && 
        !petType.includes('🐰') && !petType.includes('🐦') && !petType.includes('🐠')) {
      
      const petLower = petType.toLowerCase();
      if (petLower.includes('dog')) formattedPetType = '🐶 Dog';
      else if (petLower.includes('cat')) formattedPetType = '🐱 Cat';
      else if (petLower.includes('hamster')) formattedPetType = '🐹 Hamster';
      else if (petLower.includes('rabbit') || petLower.includes('bunny')) formattedPetType = '🐰 Rabbit';
      else if (petLower.includes('parrot') || petLower.includes('bird')) formattedPetType = '🐦 Parrot';
      else if (petLower.includes('goldfish') || petLower.includes('fish')) formattedPetType = '🐠 Goldfish';
    }
    
    const isValid = !!petHandlingGuides[formattedPetType];

    return res.json({
      success: true,
      petType: formattedPetType,
      isValid,
      supportedPets: isValid ? null : Object.keys(petHandlingGuides),
      message: isValid 
        ? `${formattedPetType} is one of our specialty pets! We have products and handling guides for them.`
        : `We specialize in dogs, cats, hamsters, rabbits, parrots, and goldfish only.`
    });

  } catch (error) {
    console.error('Validate pet error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to validate pet type' 
    });
  }
};