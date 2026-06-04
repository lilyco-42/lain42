"""Generate cover images from post text using word frequency analysis."""
import io, uuid, re
from collections import Counter
from PIL import Image, ImageDraw, ImageFont
from app.services.oss_upload import upload_to_oss


# Stop words for Chinese + English
STOP_WORDS = set("""
的 了 在 是 我 有 和 就 不 人 都 一 一个 上 也 很 到 说 要 去 你
会 着 没有 看 好 自己 这 他 她 它 们 那 些 什么 而 为 所 以
之 与 及 但 或 从 被 把 对 将 能 可以 使用 通过 需要 已经 这个
可以 如果 因为 所以 不过 还是 只是 的话 结果 其中 所有 一些
the a an is are was were be been being have has had do does did
will would shall should may might must can could in on at to for
of with by from up about into through during before after above
below between under over and but or nor not so if then else when
where why how who whom which what this that these those it its
""".split())


def extract_keywords(text: str, top_n: int = 5) -> list[tuple[str, int]]:
    """Extract most frequent meaningful words from text."""
    # Split Chinese text by common delimiters + extract English words
    words = re.findall(r'[一-鿿]+|[a-zA-Z0-9+#.]+', text.lower())
    filtered = [w for w in words if w not in STOP_WORDS and len(w) > 1]
    counter = Counter(filtered)
    return counter.most_common(top_n)


def _color_for_word(word: str) -> tuple[int, int, int]:
    """Generate a consistent color from a word."""
    h = hash(word) & 0xFFFFFF
    r = (h >> 16) & 0xFF
    g = (h >> 8) & 0xFF
    b = h & 0xFF
    # Ensure readable — boost saturation
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    if max_c - min_c < 60:
        r = (r + 120) % 256
        g = (g + 80) % 256
        b = (b + 200) % 256
    return (r, g, b)


def generate_cover(title: str, description: str = "", content: str = "") -> bytes:
    """Generate a Pinterest-style cover image from text keywords.
    Returns PNG bytes (800x600).
    """
    text = f"{title} {description} {content}"
    keywords = extract_keywords(text, top_n=8)

    if not keywords:
        keywords = [("Lain42", 1)]

    W, H = 800, 600
    # Dark gradient background
    img = Image.new("RGB", (W, H), (20, 20, 30))
    draw = ImageDraw.Draw(img)

    # Gradient overlay
    for y in range(H):
        ratio = y / H
        r = int(20 + 15 * ratio)
        g = int(20 + 20 * ratio)
        b = int(30 + 40 * ratio)
        for x in range(0, W, 4):
            draw.rectangle([x, y, x + 3, y], fill=(r, g, b))

    # Try to use a nice font, fall back to default
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 48)
        word_font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 28)
    except Exception:
        try:
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            word_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        except Exception:
            title_font = ImageFont.load_default()
            word_font = ImageFont.load_default()

    # Draw title
    title_text = title[:30]
    bbox = draw.textbbox((0, 0), title_text, font=title_font)
    tw = bbox[2] - bbox[0]
    draw.text((W // 2 - tw // 2, 40), title_text, fill=(255, 255, 255, 220), font=title_font)

    # Draw subtitle
    if description:
        desc = description[:60]
        draw.text((W // 2 - 200, 110), desc, fill=(180, 180, 200), font=word_font)

    # Draw frequency bars + word labels
    max_freq = max(kw[1] for kw in keywords) if keywords else 1
    bar_start_y = 200
    bar_height = 32
    gap = 16

    for i, (word, freq) in enumerate(keywords):
        y = bar_start_y + i * (bar_height + gap)
        bar_width = int((freq / max_freq) * 300)

        # Background bar
        draw.rounded_rectangle(
            [200, y, 200 + bar_width, y + bar_height],
            radius=8,
            fill=(40, 40, 60),
        )

        # Colored bar
        color = _color_for_word(word)
        draw.rounded_rectangle(
            [200, y, 200 + bar_width, y + bar_height],
            radius=8,
            fill=color,
        )

        # Word label
        draw.text((180, y + 4), word, fill=(200, 200, 220), font=word_font, anchor="ra")

        # Frequency count
        draw.text((210 + bar_width, y + 4), str(freq), fill=(150, 150, 170), font=word_font)

    # Bottom branding
    draw.text((W // 2, H - 40), "Lain42", fill=(100, 100, 120), font=word_font, anchor="mm")

    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def generate_and_upload(title: str, description: str = "", content: str = "") -> str:
    """Generate cover image and upload to OSS. Returns CDN URL."""
    data = generate_cover(title, description, content)
    base_name = uuid.uuid4().hex[:12]
    key = f"lain42/images/covers/{base_name}.png"
    return upload_to_oss(key, data, "image/png")
