# GourdVision Custom Images

This folder contains custom images for the GourdVision web application.

## Required Images

### Hero Image

- **File:** `hero-gourd-farm.jpg`
- **Location:** `/assets/images/`
- **Recommended Size:** 800x600 pixels or higher
- **Description:** Main hero image shown on the Landing page and User Home page. Should feature gourd farming, agricultural scenes, or your farm.

### Muntinlupa City Farm Images

- **Location:** `/assets/images/muntinlupa/`
- **Files needed:**
  - `farm-1.jpg` - Tunasan Community Farm
  - `farm-2.jpg` - Poblacion Urban Garden
  - `farm-3.jpg` - Sucat Agricultural Center
  - `farm-4.jpg` - Alabang Hills Farm
- **Recommended Size:** 600x400 pixels or higher
- **Description:** Images of partner farms in Muntinlupa City. These should showcase actual farm fields, crops, or farming activities.

## How to Add Your Images

1. **Prepare your images:**
   - Use high-quality JPEG or PNG images
   - Optimize for web (compress if needed)
   - Recommended aspect ratios:
     - Hero image: 4:3 or 16:9
     - Farm images: 3:2 or 4:3

2. **Place images in the correct folders:**

   ```
   src/assets/images/
   ├── hero-gourd-farm.jpg
   ├── README.md
   └── muntinlupa/
       ├── farm-1.jpg
       ├── farm-2.jpg
       ├── farm-3.jpg
       └── farm-4.jpg
   ```

3. **Restart the development server** if it's running

## Adding More Farms

To add more Muntinlupa farms, edit the farm data arrays in:

- `src/pages/user/LandingPage.jsx` (for landing page)
- `src/pages/user/UserHome.jsx` (for user home page)

Example:

```jsx
{
  id: 5,
  name: 'New Farm Name',
  location: 'Barangay Name',
  description: 'Description of the farm...',
  image: newFarmImage, // import this at the top
  crops: ['Ampalaya', 'Upo']
}
```

## Image Tips

- Use natural lighting for farm photos
- Showcase healthy crops and farming activities
- Include people (farmers) when possible for authenticity
- Ensure images are properly licensed or owned by you
