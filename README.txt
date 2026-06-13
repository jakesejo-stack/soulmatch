HOIL7 Professional Split Structure

This package reorganizes the site into page folders with separate HTML, CSS and JS files.

Structure:
- index.html                Root redirect to /main/
- main/index.html           Original index hub page
- main/main.css
- main/main.js

- home/index.html
- home/home.css
- home/home.js

- scheme2/index.html
- scheme2/scheme2.css
- scheme2/scheme2.js

- scheme3/index.html
- scheme3/scheme3.css
- scheme3/scheme3.js

- scheme4/index.html
- scheme4/scheme4.css
- scheme4/scheme4.js

- scheme5/index.html
- scheme5/scheme5.css
- scheme5/scheme5.js

What changed:
- Inline <style> blocks were moved into page-specific .css files.
- Inline <script> blocks were moved into page-specific .js files.
- External CDN scripts such as Three.js stay in the HTML before the local JS.
- Internal links were updated to folder routes: ../home/, ../scheme3/, etc.
- A root redirect index.html was added so http://localhost:5500 opens the main hub.
- START_PREVIEW.bat starts a local npx serve server on port 5500.

Preview:
1. Extract this ZIP.
2. Open the extracted folder in PowerShell.
3. Run:
   npx serve . -l 5500
4. Open:
   http://localhost:5500

Direct page URLs:
- http://localhost:5500/main/
- http://localhost:5500/home/
- http://localhost:5500/scheme2/
- http://localhost:5500/scheme3/
- http://localhost:5500/scheme4/
- http://localhost:5500/scheme5/

UPDATE: Scheme 3 profile film-strip
- scheme3/ now uses the approved preview style: presenter intro, film-strip profile cards, green/cyan glow under every image, and Scheme 1 liquid-gradient background behind the cards.
- scheme3/ loads profiles from data/users.json.
- Put manual profile photos in assets/users/<user-folder>/ and reference them in data/users.json.
- Example local image path: assets/users/user1/user1-pic1.jpg


LOCALHOST REGISTER / LOGIN UPDATE
---------------------------------
Scheme 5 now has working register/login on localhost.

IMPORTANT:
- `npx serve` only previews static files. It CANNOT save users.
- For real registration/login and profile-photo saving, use the Node server.

Steps:
1. Extract the ZIP.
2. Open terminal in the extracted Hoil7.1 folder.
3. Run:
   npm install
4. Run:
   npm run dev
5. Open:
   http://localhost:5500/scheme5/

Where users save:
- Auth database: assets/users/users.json
- User folders/photos: assets/users/<USER_ID>/
- Public profile data for Scheme 3: data/users.json

Scheme 3 can continue reading data/users.json, so newly registered users can appear in the film-strip after profile save/photo upload.
