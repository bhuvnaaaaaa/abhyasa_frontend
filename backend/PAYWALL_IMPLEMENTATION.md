# ChapterView Two-Section Layout & Paywall Implementation

## Overview
The ChapterView has been redesigned with two main sections:
1. **In text solutions** - Video tutorial + Q&A content
2. **Test yourself** - MCQ quiz with Rs 99 paywall after 1st question

## Frontend Changes

### Updated Files
- **src/pages/ChapterView.jsx** - New two-section tab interface with paywall logic
- **src/assets/css/ChapterView.css** - Added styles for tabs and paywall overlay
- **src/pages/Subscription.jsx** - New subscription page with pricing details
- **src/assets/css/Subscription.css** - Subscription page styling
- **src/App.jsx** - Added `/subscription` protected route

### Key Features
1. **Section Tabs** - Switch between "In text solutions" and "Test yourself"
2. **Paywall Logic**:
   - Users can see the 1st MCQ question free
   - After answering 1st question, unauthenticated or non-paying users see paywall
   - Paywall redirects to subscription page
3. **Subscription Check** - Fetches user subscription status on mount
4. **Navigation** - Sidebar chapter list maintains state across sections

## Backend Changes

### New Models
- **models/Subscription.js** - Subscription schema with userId, expiresAt, status

### New Controllers
- **controllers/subscriptionController.js**:
  - `getSubscription` - GET `/user/subscription` (checks current subscription status)
  - `createSubscription` - POST `/user/subscription` (creates/renews 30-day subscription)
  - `cancelSubscription` - DELETE `/user/subscription` (cancels subscription)

### New Routes
- **routes/subscriptionRoutes.js** - All subscription endpoints protected by authMiddleware

### Server Changes
- **server.js** - Mounted subscription routes at `/api/user/subscription`

## Database Seeding

### ICSE Curriculum Setup
A new seed script creates complete ICSE structure (Classes 6-12):

```bash
cd abhyasa_backend
npm run seed:icse
# or
node seed/seedICse.js
```

### What Gets Seeded
- **ICSE Board** (if not exists)
- **Grades 6-12** (ICSE Class 6 through Class 12)
- **Subjects per Grade**:
  - Classes 6-8: English, Math, Science, Social Studies
  - Classes 9-10: English, Math, Physics, Chemistry, Biology, Social Studies
  - Classes 11-12: English, Math, Physics, Chemistry, Biology
- **Sample Chapters** (3 per subject):
  - Each chapter has:
    - Title, description, number
    - YouTube video URL (embed)
    - 3 sample MCQ questions with options, correct answer, and explanations
    - Notes/Q&A content

### Update package.json
Add to `abhyasa_backend/package.json` scripts:
```json
"seed:icse": "node seed/seedICse.js"
```

## Paywall Flow

### Free Access (No Login)
1. User visits chapter
2. Clicks "Test yourself" tab
3. Sees 1st question free (no login required)
4. Upon submission → **Paywall triggered**
5. Paywall card shows: "Unlock Full Test for ₹99"
6. "Unlock Now" button → redirects to `/subscription`
7. Requires login at subscription page

### Paid Access (After Subscription)
1. User logs in / creates account
2. Clicks "Unlock Now" on paywall
3. Redirected to `/subscription` page
4. Pays ₹99 for 30-day access
5. Subscription created in database
6. Auto-redirects back to chapter
7. Full access to all MCQ questions enabled

### Admin Access
- Admins bypass paywall completely
- Can see all test questions without subscription

## Subscription Status
Checked at component mount via `GET /api/user/subscription`:
- **404 response** = No subscription (show paywall)
- **200 response with `expired: false`** = Active subscription (allow full access)
- **200 response with `expired: true`** = Expired subscription (show paywall)

## Testing the Flow

### Setup (Backend)
1. Ensure MongoDB is running
2. Run ICSE seed: `npm run seed:icse`
3. Start backend: `npm start` (Port 5000)

### Setup (Frontend)
1. Start frontend: `npm run dev` (Port 5173)

### Test User Flow
1. Go to home page
2. Click "Study Material" in navbar
3. Select "ICSE Class 9" (or any class)
4. Click subject card → chapters list appears
5. Click chapter → redirects to `/chapter/:id`
6. Chapter loads with "In text solutions" tab active
7. Click "Test yourself" tab → MCQ quiz appears
8. Answer 1st question → **Paywall appears**
9. Unauthenticated: "Sign Up/Login" button in navbar → go to `/auth`
10. Authenticated without subscription: Paywall shows unlock button
11. Click "Unlock Now" → redirected to `/subscription`
12. Subscribe for ₹99 → creates subscription record
13. Auto-redirects back to chapter (paywall removed)
14. Full MCQ access now available

## Files Modified/Created

### Frontend
- ✅ `src/pages/ChapterView.jsx` - Updated with two-section layout
- ✅ `src/assets/css/ChapterView.css` - Added paywall + tab styles
- ✅ `src/pages/Subscription.jsx` - New subscription page
- ✅ `src/assets/css/Subscription.css` - Subscription styling
- ✅ `src/App.jsx` - Added subscription route

### Backend
- ✅ `models/Subscription.js` - New model
- ✅ `controllers/subscriptionController.js` - New controller
- ✅ `routes/subscriptionRoutes.js` - New routes
- ✅ `server.js` - Mounted subscription routes
- ✅ `seed/seedICse.js` - New ICSE seeder

## API Endpoints

### Subscription Endpoints
All require authentication (Authorization header with JWT token)

**Get Subscription Status**
```bash
GET /api/user/subscription
Response: { _id, userId, amount, startDate, expiresAt, status, expired }
```

**Create/Renew Subscription**
```bash
POST /api/user/subscription
Body: { amount?: 99, daysValid?: 30 }
Response: { message, subscription }
```

**Cancel Subscription**
```bash
DELETE /api/user/subscription
Response: { message, subscription }
```

## Future Enhancements
1. **Payment Gateway Integration** - Razorpay/PayPal for real payments
2. **Subscription Levels** - Different plans (1-month, 3-month, yearly)
3. **Email Notifications** - Send confirmation & expiry reminders
4. **Dashboard Analytics** - User subscription status in admin panel
5. **Referral System** - Discount codes for new users

## Notes
- Subscription status checks happen on ChapterView mount
- Paywall locks after 1st question is answered
- Admins bypass paywall via role check in JWT token
- All paywall overlays are modal-style (fixed positioning)
- Mobile responsive design included in CSS
