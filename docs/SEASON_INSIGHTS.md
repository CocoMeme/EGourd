# Gourd Season Insights

## Overview

The Season Insights feature provides community-wide seasonal pollination data and growing recommendations for all supported gourd types. Data is aggregated from **all users** — not just the current user — making it a shared knowledge base that helps farmers decide the best time to plant each gourd.

## Supported Gourd Types

| Gourd | Filipino Name | Emoji | Color Code | Optimal Temp |
|-------|--------------|-------|------------|-------------|
| Bitter Gourd | Ampalaya | 🥒 | `#27AE60` | 25–32°C |
| Bottle Gourd | Upo | 🍐 | `#3498DB` | 24–35°C |
| Sponge Gourd | Patola | 🧽 | `#F39C12` | 25–30°C |
| Cucumber | Pipino | 🥒 | `#8BC34A` | 22–30°C |
| Squash | Kalabasa | 🎃 | `#E67E22` | 24–32°C |

## Philippine Seasons

- **Wet Season**: June to November
- **Dry Season**: December to May

## Screens & Navigation

### HomeScreen (entry point)
A compact card on the home screen labeled **"Gourd Season Insights"** with subtitle *"Seasonal trends, analysis & growing tips"*. Tapping it navigates to the full insights screen.

**Route**: `HomeStack` → `SeasonalInsights`

### SeasonalInsightsScreen (full page)
Located at `frontend/mobile-app/src/screens/HomeScreens/SeasonalInsightsScreen.js`

Contains the following sections:

1. **Current Season Banner** — Shows whether it's wet or dry season with the current month
2. **Overall Performance** — Total pollinations across all gourds with a horizontal bar chart breakdown
3. **Gourd Analysis Selector** — Chip-style tabs to pick a gourd type for detailed view
4. **Monthly Pollination Chart** — Bar chart showing successful pollinations per month, with peak months highlighted
5. **Season Comparison** — Wet vs. dry season side-by-side with a verdict on which season performs better
6. **Key Statistics** — Total pollinations, best month, active months, monthly average
7. **Growing Guide** — Gourd-specific tips including optimal temperature, spacing, season preference, pollination advice, and 5 numbered growing tips

## API

### `GET /api/plants/seasonal/pollination-stats`

**Access**: Public (no auth required — aggregates all users' data)

**Response**:
```json
{
  "success": true,
  "data": {
    "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "gourdTypes": [
      {
        "type": "bitter_gourd",
        "label": "Ampalaya",
        "data": [0, 0, 5, 12, 8, 15, 20, 18, 10, 6, 2, 0],
        "peakMonths": ["Jun", "Jul", "Aug"]
      }
    ]
  }
}
```

**How it works**:
- Unwinds all `pollinations` arrays from the `Plant` collection
- Filters for `status` of `success` or `partial`
- Groups by `{month, gourdType}` and sums `actualSuccessfulCount` (defaults to 1)
- Peak months are those with values ≥ 70% of the maximum for that gourd

## File Map

| File | Purpose |
|------|---------|
| `frontend/mobile-app/src/screens/HomeScreens/SeasonalInsightsScreen.js` | Full-page insights screen |
| `frontend/mobile-app/src/screens/HomeScreens/HomeScreen.js` | Entry card that navigates to insights |
| `frontend/mobile-app/src/components/PollinationComponents/SeasonalInsightsCard.js` | Original expandable card (still exported, unused on HomeScreen) |
| `frontend/mobile-app/src/navigation/stacks/HomeStack.js` | Route registration (`SeasonalInsights`) |
| `frontend/mobile-app/src/services/plantService.js` | `getSeasonalPollinationStats()` API call |
| `backend/src/controllers/plantController.js` | `getSeasonalPollinationStats` controller |
| `backend/src/routes/plant.js` | Route: `GET /seasonal/pollination-stats` |

## Growing Tips (built-in)

Each gourd type has static tips embedded in the screen covering:
- Optimal temperature range
- Plant spacing
- Preferred season
- Pollination method & timing
- 5 practical growing tips for Philippine conditions
