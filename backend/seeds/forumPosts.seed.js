/**
 * EGourd Official Forum Seed Data
 * Author: EGourd Admin (69528d77c821503ec8de7fa0)
 * Purpose: Onboarding users and providing expert gourd growing guides.
 */

const mongoose = require('mongoose');

// The specific ID you provided for the EGourd Admin account
const eGourdId = new mongoose.Types.ObjectId('69528d77c821503ec8de7fa0');

const forumPostsData = [
  {
    author: eGourdId,
    category: 'tips',
    title: 'Welcome to EGourd! 🌿 How to Use Our Smart Scanner',
    content: `# Welcome to the EGourd Community! 🚀

We are thrilled to have you here. Our mission is to make gourd growing accessible to everyone, from balcony gardeners to small-scale farmers. 

## Getting Started with the Flower Scanner
One of the most powerful features of this app is the **Flower Identification Scanner**. If you're struggling to tell the difference between a male and female flower, follow these steps:

1. **Open the Scanner**: Tap the camera icon in the bottom navigation.
2. **Lighting Matters**: Ensure you have bright, natural light (early morning is best).
3. **The "Base" Check**: Focus the camera on the base of the flower. 
    - *Female flowers* have a small bulb (the ovary) that looks like a miniature fruit.
    - *Male flowers* have a thin, straight stem.
4. **AI Diagnosis**: The app will tell you the health of the flower and if it's the optimal time for hand pollination.

### Why does this matter?
Gourds have a very short pollination window. Missing this window means no fruit! Use our scanner daily to ensure your yield is maximized.

Happy Scanning!
— The EGourd Team`,
    images: [],
    tags: ['official', 'tutorial', 'ai-scanner', 'onboarding'],
    isPinned: true,
    isLocked: true,
    views: 1250,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'tips',
    title: 'Mastering Hand Pollination: A Step-by-Step Guide',
    content: `# The Art of Hand Pollination 🌸

Since bees can sometimes be unreliable in urban environments, hand pollination is a skill every EGourd user should master.

## The Process
1. **Identify**: Use the EGourd scanner to find one fresh male flower and one receptive female flower.
2. **Harvest**: Pluck the male flower and carefully peel back the petals to reveal the pollen-covered stamen.
3. **Transfer**: Gently "paint" the pollen onto the stigma (the center) of the female flower.
4. **Log it**: Don't forget to use the **"Log Pollination"** button in the app! We will send you a notification in a few days to remind you to check if the fruit has set.

## Common Mistakes
* **Wet Pollen**: If it rained, wait for the flowers to dry. Wet pollen is often clumpy and ineffective.
* **Late Timing**: Most gourd flowers close by 10:00 AM. Set your alarm!



Hand pollination increases success rates by up to 80% in container gardens!`,
    images: [],
    tags: ['pollination', 'expert-tips', 'yield-optimization', 'tutorial'],
    isPinned: false,
    isLocked: false,
    views: 890,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'discussion',
    title: 'Vertical vs. Ground Growing: Which is better for you?',
    content: `# The Great Trellis Debate 🏗️

At EGourd, we often get asked: "Should I let my gourds crawl on the ground or climb a trellis?"

## Ground Growing (Prostrate)
* **Pros**: No construction costs, natural mulch for the soil, handles wind better.
* **Cons**: Fruits are prone to rot, more susceptible to soil-borne pests (slugs/snails), takes up massive garden space.

## Vertical Growing (Trellis)
* **Pros**: Cleaner fruit, better airflow (less mildew), easier to harvest, saves space.
* **Cons**: Requires sturdy construction, heavy fruits may need "fruit hammocks" (like mesh bags) to prevent falling.

### EGourd Recommendation:
If you are growing **Upo** or **Patola**, we highly recommend vertical growing. The fruits stay straight and beautiful. For heavy **Kalabasa (Squash)**, ground growing is often safer unless you have a professional-grade steel trellis.

**What are you using this season? Share your trellis photos in the Showcase section!**`,
    images: [],
    tags: ['trellis', 'garden-design', 'discussion', 'vertical-farming'],
    isPinned: false,
    isLocked: false,
    views: 445,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'questions',
    title: 'Troubleshooting: Why is the AI Scanner not identifying my plant?',
    content: `# Scanner Troubleshooting 📸

Is the EGourd AI struggling to identify your gourd variety? Here are the three most common reasons and how to fix them:

### 1. Distance and Focus
The AI needs to see the leaf shape and the flower clearly. If you are too far away, it picks up background grass. If you are too close, it gets blurry. Stay about **15-20cm** away from the target.

### 2. New Varieties
We are constantly updating our database. If you are growing a rare heritage variety, the AI might get confused. 
* **Fix**: Use the "Feedback" button to send us the photo. Our botanists will manually identify it and add it to the model!

### 3. Leaf Damage
If your plant is heavily damaged by pests, the leaf patterns change. Try scanning a healthy leaf on the same vine for a more accurate identification.

**Need more help?** Post a photo of your plant in this thread and our community moderators will help you out!`,
    images: [],
    tags: ['app-support', 'ai', 'troubleshooting', 'tech-tips'],
    isPinned: false,
    isLocked: false,
    views: 320,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'tips',
    title: 'Organic Pest Control: The Neem Oil Protocol',
    content: `# Keeping it Organic with EGourd 🐞

We believe in sustainable gardening. Chemical pesticides kill the bees we need for pollination. Instead, try our recommended **Neem Oil Protocol**:

## The Recipe
* 1 Liter of lukewarm water
* 1 Teaspoon of pure cold-pressed Neem Oil
* 1/2 Teaspoon of mild dish soap (to emulsify the oil)

## Application Schedule
1. **Preventative**: Spray once every 2 weeks in the late evening.
2. **Infestation**: Spray every 3 days for two weeks.

### Why Evening?
Never spray in the morning! The combination of oil and bright sun can "cook" your leaves (phytotoxicity). Always apply when the sun is going down so the plant has all night to absorb the nutrients.

**Pro Tip:** Focus on the undersides of the leaves—that's where the aphids and spider mites hide!`,
    images: [],
    tags: ['organic', 'pest-control', 'neem-oil', 'safety'],
    isPinned: false,
    isLocked: false,
    views: 612,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'showcase',
    title: 'Featured Garden: Urban Rooftop Gourd Farming',
    content: `# EGourd Community Spotlight 🌟

Today we are featuring a user from Manila who managed to grow **15kg of Bitter Gourd** on a 4th-floor balcony!

## How they did it:
* **Containers**: Used 20-gallon smart pots with high drainage.
* **Fertilizer**: Weekly liquid seaweed extract.
* **App Usage**: They used the EGourd "Watering Reminder" feature to ensure the pots never dried out in the tropical heat.

This goes to show that you don't need a farm to be a farmer! Gourd vines are incredibly adaptable to vertical structures like balcony railings.

**Want to be featured?** Keep your "Garden Journal" updated in the app and we might reach out to you for next month's spotlight!`,
    images: [],
    tags: ['inspiration', 'urban-farming', 'success-story', 'showcase'],
    isPinned: false,
    isLocked: false,
    views: 1102,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'discussion',
    title: 'Soil Health: The Secret to Large Gourds',
    content: `# It All Starts in the Dirt 🕳️

If your vines are thin and your flowers are falling off, the problem is likely underground. 

## The N-P-K Balance for Gourds
* **Early Growth**: Needs higher Nitrogen (N) for leaf production.
* **Flowering/Fruiting**: Needs higher Phosphorus (P) and Potassium (K).

### EGourd's Favorite Soil Mix:
* 40% Garden Soil
* 30% Vermicast (Worm castings)
* 20% Carbonized Rice Hull (for aeration)
* 10% Dried Cow/Chicken Manure

**Discussion Question:** Do you make your own compost at home, or do you prefer store-bought organic mixes? Let us know your "secret ingredient" below!`,
    images: [],
    tags: ['soil-health', 'fertilizer', 'composting', 'gardening-101'],
    isPinned: false,
    isLocked: false,
    views: 540,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'tips',
    title: 'How to Store Your Harvest for Maximum Freshness',
    content: `# You've Harvested... Now What? 🧺

Harvesting is just the beginning. If you don't store gourds correctly, they lose their crunch and nutritional value within days.

## Storage Guidelines:
1. **Ampalaya**: Wrap in paper towels (to absorb moisture) and place in a perforated plastic bag in the fridge. Lasts 5-7 days.
2. **Upo/Patola**: Do not wash before storing! Moisture on the skin leads to fungal spots. Store in the vegetable crisper.
3. **Squash (Kalabasa)**: Can stay at room temperature in a cool, dark place for up to 2 months if the stem is still attached.

### The "Stem" Secret
Always cut gourds with at least **2 inches of stem** attached. This prevents bacteria from entering the fruit and causing internal rot.

Check out the "Recipes" section in the app for ideas on how to cook your fresh harvest!`,
    images: [],
    tags: ['harvesting', 'food-storage', 'kitchen-tips', 'freshness'],
    isPinned: false,
    isLocked: false,
    views: 388,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'questions',
    title: 'Understanding Yellow Vine Syndrome',
    content: `# Yellowing Vines? Here is a Checklist. 📉

If your once-green vines are turning yellow from the base upward, your plant is stressed. Before you panic and add more fertilizer, check these three things:

1. **Overwatering**: Gourds hate "wet feet." If the soil is muddy, the roots are suffocating.
2. **Nitrogen Deficiency**: The plant is pulling nutrients from old leaves to feed new ones. Time for a compost tea!
3. **Root-Knot Nematodes**: Small bumps on the roots that block water flow.

**How to use EGourd for this:**
Take a photo of the yellowing pattern and use our **"Health Diagnostic"** tool. It can distinguish between nutrient deficiency and viral infections like the Mosaic Virus.`,
    images: [],
    tags: ['plant-health', 'diagnosis', 'yellow-leaves', 'troubleshooting'],
    isPinned: false,
    isLocked: false,
    views: 477,
    status: 'active',
  },
  {
    author: eGourdId,
    category: 'tips',
    title: 'The Importance of Pruning Your Gourd Vines',
    content: `# Prune for Productivity ✂️

Many beginners make the mistake of letting the vine grow as long as possible. This is actually counter-productive!

## Why Prune?
A gourd plant has a limited amount of energy. If it spends all its energy growing 30 feet of vine, it won't have enough to grow big fruits.

## The 10-Leaf Rule
Once your main vine reaches about 10 feet, pinch off the growing tip. This encourages **lateral (side) branching**. 
* **Fun Fact**: Most female flowers grow on the side branches, while the main vine produces mostly male flowers.

### What to remove:
* Any yellowing or diseased leaves at the base.
* "Suckers" that appear too crowded.
* Excess fruit (keep only 3-4 fruits per vine for maximum size).



Happy pruning!`,
    images: [],
    tags: ['pruning', 'growth-hacks', 'gardening-tips', 'productivity'],
    isPinned: false,
    isLocked: false,
    views: 920,
    status: 'active',
  }
];

module.exports = forumPostsData;
