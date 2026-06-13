SoulMatch v31 - AR Live Map Engine

What changed:
- Built on v30 working flow and original public pages are preserved.
- Scheme 2 duplicate path: member-scheme2-cities-map/
- Sliven city slide now uses assets/cities/sliven-panorama.png from the uploaded panorama.
- Ruse city slide uses the provided Ruse street image URL.
- Last city slide opens AR Live Map with 3D cube animation and scroll-down.
- AR engine gets exact private browser coordinates, displays them, and opens a real Google Maps embed around that location.
- Desktop controls: WASD / arrows / Q/E turn.
- Phone controls: touch/hold arrow buttons.
- Movement updates the POV coordinates and the map iframe.
- Avatar upload supports photo/video through /api/upload-avatar.
- Private location save through /api/location/current.

Run:
npm install
npm run dev

Open:
http://localhost:5500/home/
Then login/register -> onboarding -> Scheme 5, or directly open:
http://localhost:5500/member-scheme2-cities-map/
