Serve only this directory, over HTTPS. Entry: /nom-khai.css.

Set Access-Control-Allow-Origin: * on CSS and fonts. Stable nom-khai.css and latest.json: Cache-Control: public, max-age=300, must-revalidate (or no-cache with ETag). /assets/ and /versions/: Cache-Control: public, max-age=31536000, immutable. Do not route missing .woff2 files to HTML; return 404. MIME: text/css, font/woff2, font/ttf.

Deploy assets and pinned CSS first; verify hashes; replace nom-khai.css last atomically. Retain previous asset files. Roll back by restoring the stable CSS from the desired pinned version (adjust ../assets/ to ./assets/). Projects use the same URL and receive approved updates within the cache period; already-open pages need reload. Downloaded/copied font files never update themselves.

Usage: <link rel="stylesheet" href="https://YOUR-HOST/nom-khai.css"> then use class="nom-khai" or font-family: "Nom Khai", serif. No global body styles are imposed. Unsupported glyphs fall back through CSS to chunked Nom Na Tong; chunks download only when their Unicode ranges are used.
