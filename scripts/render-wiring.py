"""Render this repository's simple SVG subset with Pillow (no browser needed)."""
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
svg = ET.parse(root / 'docs/hardware-wiring.svg').getroot()
im = Image.new('RGB', (int(svg.attrib['width']), int(svg.attrib['height'])), 'white')
draw = ImageDraw.Draw(im)
fonts = Path('C:/Windows/Fonts')
for element in svg:
    tag = element.tag.split('}')[-1]
    a = element.attrib
    kind = a.get('class', '')
    if tag == 'rect':
        x, y = float(a.get('x', 0)), float(a.get('y', 0))
        box = (x, y, x + float(a['width']), y + float(a['height']))
        fill = a.get('fill', '#f8fafc' if kind == 'panel' else 'white')
        outline = '#ccd7e2' if kind == 'panel' else '#52687c' if kind == 'part' else None
        draw.rounded_rectangle(box, radius=float(a.get('rx', 0)), fill=fill, outline=outline, width=2)
    elif tag == 'polyline':
        points = [tuple(map(float, p.split(','))) for p in a['points'].split()]
        draw.line(points, fill='#bc3c45' if kind == 'power' else '#266c81', width=3, joint='curve')
    elif tag == 'text':
        size = 30 if kind == 'title' else 23 if kind == 'h' else 16 if kind == 'small' else 18
        font = ImageFont.truetype(str(fonts / ('segoeuib.ttf' if kind in ('title', 'h') else 'segoeui.ttf')), size)
        draw.text((float(a['x']), float(a['y'])), element.text or '', font=font,
                  fill='#925b11' if kind == 'note' else '#172b4d', anchor='ls')
im.save(root / 'docs/hardware-wiring.png')
print('Rendered docs/hardware-wiring.png')
