# Kenobi
# Stargazing Web Application

A full-stack web application that evaluates stargazing conditions for any location and recommends better nearby observing spots.

Built as a phased project to demonstrate full-stack development, geospatial reasoning, and cloud-native architecture.

---

## What It Does

Users can:

- Enter coordinates or drop a pin on a map
- View location context (city, state, country, elevation)
- See sunset, sunrise, and astronomical twilight times
- Receive a Stargazing Score (0–100) with explanations
- View Bortle class (light pollution)
- See visible planets and curated deep-sky objects
- Get nearby alternative locations when conditions are poor
- View a monthly stargazing forecast graph
- Subscribe to email alerts for good stargazing conditions within a radius

---

## Tech Stack

Frontend:
- Next.js
- TypeScript
- Map rendering
- Charting for monthly forecasts

Backend:
- AWS API Gateway + Lambda
- Deterministic scoring engine
- External API aggregation

Data:
- DynamoDB (caching + subscriptions)
- S3 (light pollution raster + catalogs)
- CloudFront CDN

Cloud:
- AWS CDK (infrastructure as code)
- GitHub Actions (CI/CD)

Notifications (later phase):
- Amazon SES
- EventBridge Scheduler

---

## Stargazing Score

Each location is evaluated with a 0–100 score based on:

- Cloud cover during observing window (primary factor)
- Moon illumination and moon presence
- Bortle class (darkness)

The API returns both the score and human-readable explanations so results are transparent and debuggable.

---

## Development Phases

### Phase 0 – Core Evaluation (MVP; Current)
- Take input
- Reverse geocoding
- Sunset/sunrise + astronomical twilight
- Weather aggregation
- Moon phase and visibility
- Stargazing Score with explanations
- Public deployment

### Phase 1 – UX Improvements
- Map click to drop waypoint
- Date selection
- Loading and error states
- Basic caching

### Phase 2 – Light Pollution
- Satellite-based light pollution sampling
- Bortle class calculation
- Darkness contribution to score

### Phase 3 – Nearby Alternatives
- Generate nearby candidate locations
- Rank by score improvement and distance
- Display top alternatives

### Phase 4 – Visible Objects
- Planet visibility
- Curated deep-sky objects
- Filtering by observing window

### Phase 5 – Monthly Forecast
- 30-day stargazing score graph
- Hover details per day

### Phase 6 – Email Alerts
- User subscriptions
- Scheduled evaluations
- Email notifications when conditions exceed threshold

---
