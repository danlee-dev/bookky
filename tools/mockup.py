"""표지 이미지로 1권 목업과 같은 크기·각도의 3D 책 이미지를 만든다 (투명 PNG/WebP).

사용: python3 tools/mockup.py <표지.png> <책등 제목> <저자> <출력.webp>
1권 목업(1100x1226, 책등이 왼쪽)과 나란히 서가에 놓이도록 캔버스와 각도를 맞췄다.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1100, 1226
FRONT = [(412, 132), (1044, 66), (1048, 1092), (416, 1166)]   # TL, TR, BR, BL
SPINE = [(352, 118), (412, 132), (416, 1166), (356, 1146)]
TOP = [(352, 118), (412, 132), (1044, 66), (986, 54)]   # 위에서 내려다본 종이 단면
GOTHIC = "/Users/zs_olef.x/Work/Startup/first-payment/typeset/fonts/GothicA1-Black.ttf"
PRETENDARD = "/Users/zs_olef.x/Library/Fonts/Pretendard-SemiBold.otf"


def solve(a, b):
    """8x8 가우스 소거."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        for r in range(n):
            if r != c:
                f = m[r][c] / m[c][c]
                for k in range(c, n + 1):
                    m[r][k] -= f * m[c][k]
    return [m[i][n] / m[i][i] for i in range(n)]


def coeffs(dst, src):
    """PIL PERSPECTIVE 계수: 출력 좌표(dst) -> 입력 좌표(src)."""
    a, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return solve(a, b)


def warp(img, quad):
    w, h = img.size
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    return img.convert("RGBA").transform((W, H), Image.PERSPECTIVE, coeffs(quad, src), Image.BICUBIC)


def mask(quad):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon(quad, fill=255)
    return m


def spine_image(title, author, h=2363):
    w = int(h * 0.096)  # 222쪽 PDF를 종이책으로 묶었을 때 두께 감
    img = Image.new("RGB", (w, h), (228, 230, 234))
    d = ImageDraw.Draw(img)
    tf = ImageFont.truetype(GOTHIC, int(w * 0.52))
    af = ImageFont.truetype(PRETENDARD, int(w * 0.2))
    t = Image.new("RGBA", (h, w), (0, 0, 0, 0))
    td = ImageDraw.Draw(t)
    td.text((int(h * 0.05), w // 2), title, font=tf, fill=(14, 16, 20), anchor="lm")
    td.text((int(h * 0.95), w // 2), author, font=af, fill=(14, 16, 20), anchor="rm")
    img.paste(t.rotate(-90, expand=True), (0, 0), t.rotate(-90, expand=True))
    d.rectangle([int(w * 0.36), int(h * 0.36), int(w * 0.64), int(h * 0.36) + int(w * 0.28)], fill=(255, 225, 77))
    return img


def main():
    cover_path, title, author, out = sys.argv[1:5]
    cover = Image.open(cover_path).convert("RGB")
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # 바닥 그림자: 책 아래쪽에서 왼쪽 아래로 번진다
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).polygon([(356, 1150), (1048, 1092), (1010, 1150), (240, 1212)], fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(26))
    canvas.paste((10, 12, 18, 255), (0, 0), sh)

    # 책등: 왼쪽으로 갈수록 어둡게
    sp = warp(spine_image(title, author, cover.size[1]), SPINE)
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(shade)
    for x in range(SPINE[0][0], SPINE[1][0] + 1):
        t = (x - SPINE[0][0]) / max(1, SPINE[1][0] - SPINE[0][0])
        g.line([(x, 0), (x, H)], fill=(0, 0, 0, int(70 - 45 * t)))
    sp = Image.alpha_composite(sp, Image.composite(shade, Image.new("RGBA", (W, H)), mask(SPINE)))
    canvas.paste(sp, (0, 0), mask(SPINE))

    # 앞표지: 원근 변환 + 책등 쪽 접힌 자리의 옅은 그늘
    fr = warp(cover, FRONT)
    light = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(light)
    for i in range(26):
        ld.line([(FRONT[0][0] + i, 0), (FRONT[3][0] + i, H)], fill=(0, 0, 0, int(38 * (1 - i / 26))))
    fr = Image.alpha_composite(fr, Image.composite(light, Image.new("RGBA", (W, H)), mask(FRONT)))
    canvas.paste(fr, (0, 0), mask(FRONT))

    # 윗면: 종이 단면(옅은 회백색 + 가는 결) 위에 표지 판 두께선
    top = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(top)
    td.polygon(TOP, fill=(246, 246, 243, 255))
    for i in range(1, 9):
        t = i / 9
        a = (TOP[0][0] + (TOP[1][0] - TOP[0][0]) * t, TOP[0][1] + (TOP[1][1] - TOP[0][1]) * t)
        b = (TOP[3][0] + (TOP[2][0] - TOP[3][0]) * t, TOP[3][1] + (TOP[2][1] - TOP[3][1]) * t)
        td.line([a, b], fill=(226, 226, 222, 255), width=1)
    canvas.alpha_composite(top)
    d = ImageDraw.Draw(canvas)
    d.line([FRONT[0], FRONT[1]], fill=(212, 214, 218, 255), width=3)
    d.line([TOP[0], TOP[3]], fill=(214, 216, 220, 255), width=2)
    d.line([SPINE[0], SPINE[1]], fill=(196, 198, 204, 255), width=2)

    canvas.save(out, quality=90, method=6)
    print(out, canvas.size)


if __name__ == "__main__":
    main()
