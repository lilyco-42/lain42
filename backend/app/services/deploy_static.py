"""Upload frontend static files to OSS CDN."""
import os
from app.services.oss_upload import _bucket, _cdn

DIST = "/var/www/lain42"
PREFIX = "static"


def upload_static():
    for root, dirs, files in os.walk(DIST):
        for fname in files:
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, DIST).replace("\\", "/")
            key = f"{PREFIX}/{rel}"

            with open(fpath, "rb") as f:
                data = f.read()

            ct = {
                "html": "text/html",
                "js": "application/javascript",
                "css": "text/css",
                "svg": "image/svg+xml",
                "png": "image/png",
                "ico": "image/x-icon",
            }.get(fname.rsplit(".", 1)[-1], "application/octet-stream")

            cache = "no-cache" if fname == "index.html" else "public, max-age=31536000, immutable"
            _bucket.put_object(key, data, headers={
                "Content-Type": ct,
                "Cache-Control": cache,
            })
            print(f"  + {key}")

    # Update index.html to use CDN URLs
    idx_path = os.path.join(DIST, "index.html")
    with open(idx_path) as f:
        html = f.read()

    # Update index.html to use CDN URLs (only for relative paths)
    html = html.replace('src="/assets/', f'src="{_cdn}/{PREFIX}/assets/')
    html = html.replace('href="/assets/', f'href="{_cdn}/{PREFIX}/assets/')
    html = html.replace('href="/favicon.svg"', f'href="{_cdn}/{PREFIX}/favicon.svg"')

    _bucket.put_object(f"{PREFIX}/index.html", html.encode(), headers={
        "Content-Type": "text/html",
        "Cache-Control": "no-cache",
    })

    with open(idx_path, "w") as f:
        f.write(html)

    print(f"Done. index.html now uses CDN: {_cdn}/{PREFIX}/")


if __name__ == "__main__":
    upload_static()
