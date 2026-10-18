# WEATHER//TERMINAL (read-only, paper mode)

Static GitHub Pages copy of the weather bot's WEATHER//TERMINAL dashboard: Daily desk (Polymarket temperature markets) and
Hourly desk (ForecastEx HRU contracts shown on Robinhood, signals only). Paper trading only, no keys, no orders.

How it works: the page reads `#src=<blob-url>&k=<base64 AES-256 key>` from the URL hash (never sent to any server),
polls the encrypted gzip + AES-256-GCM JSON blob every 15 s, decrypts it in the browser, and shows a STALE banner if the
box hasn't pushed for 90 s. Without a hash it shows clearly labeled example data.

Read-only: there is no kill switch here. The kill switch is on the box dashboard only.
Nothing secret is in this repo: no key, no blob URL.
