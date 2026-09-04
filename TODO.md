# DevLMS product roadmap

DevLMS is a creator-owned learning platform: every course is produced and managed by the platform owner rather than third-party instructors.

## 1. Admin course and lesson management

- [x] Create, edit, publish, unpublish, and delete courses
- [x] Set course title, slug, description, duration, thumbnail, and price
- [x] Show enrollment totals to the platform admin
- [x] Create, edit, reorder, and delete lessons
- [x] Support video, article, and quiz lesson types
- [x] Store video, article content, downloadable attachments, and preview access
- [x] Protect every management operation with server-side platform-admin checks

## 2. Real lesson delivery

- [x] Play optional lesson videos from validated YouTube links
- [x] Render article lesson content safely without injecting HTML
- [x] Connect optional downloadable resources through external URLs
- [x] Add a quiz builder and server-graded quiz player
- [ ] Optional later: move downloadable resources to private R2 storage

## 3. Multi-course student dashboard

- [x] Remove the hardcoded course slug from the dashboard and sidebar
- [x] List all courses in which the student is enrolled
- [x] Show progress and the next lesson for each course
- [x] Continue from the most recently accessed lesson

## 4. Course catalogue

- [x] Add `/courses` catalogue and `/courses/$slug` detail pages
- [x] Load catalogue data from the database instead of static course data
- [x] Show thumbnails, outcomes, curriculum, level, duration, previews, and pricing

## 5. Better progress tracking

- [x] Record last accessed course and lesson
- [ ] Save video playback position and actual learning time
- [ ] Record course completion date
- [ ] Allow a completed lesson to be marked incomplete
- [ ] Optionally auto-complete a lesson after its completion threshold

## 6. Assessments and certificates

- [ ] Add quiz attempt history and practical lab submissions
- [ ] Define passing rules for courses
- [ ] Generate certificates with unique verification IDs
- [ ] Add a public certificate verification page

## 7. Payments

- [ ] Choose one-time purchase, bundles, subscriptions, or a combination
- [ ] Add orders, payments, entitlements, and webhook event records
- [ ] Integrate a Malaysian payment gateway with FPX or DuitNow support
- [ ] Grant course access only from verified server-side payment events

## 8. Analytics and organizations

- [ ] Add course conversion, enrollment, engagement, and completion analytics
- [ ] Decide whether organizations will support college/company licensing
- [ ] If retained, add cohort enrollment and organization progress reports
