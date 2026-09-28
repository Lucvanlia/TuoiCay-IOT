"""Offline checks for repository documentation, diagram references and build outputs."""
from pathlib import Path
import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--require-firmware', action='store_true')
args = parser.parse_args()
errors = []
files = [ROOT / 'readme.md', *sorted((ROOT / 'docs').glob('*.md'))]
links = 0
for path in files:
    content = path.read_text(encoding='utf-8-sig')
    if '\ufffd' in content:
        errors.append(f'{path.name}: replacement character in UTF-8 text')
    if len(re.findall(r'^```', content, re.M)) % 2:
        errors.append(f'{path.name}: unclosed code fence')
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', content):
        target = target.strip('<>').split('#')[0]
        if not target or re.match(r'^[a-z]+://', target, re.I):
            continue
        links += 1
        if not (path.parent / unquote(target)).is_file():
            errors.append(f'{path.name}: broken local link {target}')

diagram = json.loads((ROOT / 'diagram.json').read_text(encoding='utf-8'))
parts = {p['id']: p for p in diagram['parts']}
if len(parts) != len(diagram['parts']):
    errors.append('diagram: duplicate part ID')
pins = {
    'board-esp32-devkit-c-v4': {
        '3V3','5V','GND.1','GND.2','GND.3','TX','RX',
        '13','14','16','17','18','19','23','25','26','27','33','35',
    },
    'wokwi-dht22': {'VCC','SDA','NC','GND'},
    'wokwi-potentiometer': {'VCC','GND','SIG'},
    'wokwi-slide-switch': {'1','2','3'},
    'wokwi-lcd1602': {'VSS','VDD','V0','RS','RW','E','D4','D5','D6','D7','A','K'},
    'wokwi-relay-module': {'VCC','GND','IN','COM','NO','NC'},
    'wokwi-led': {'A','C'}, 'wokwi-resistor': {'1','2'},
    'wokwi-pushbutton': {'1.l','1.r','2.l','2.r'},
}
for connection in diagram['connections']:
    for endpoint in connection[:2]:
        part, pin = endpoint.split(':')
        if part == '$serialMonitor':
            valid = pin in {'RX', 'TX'}
        elif part in parts and parts[part]['type'] == 'wokwi-breadboard':
            valid = bool(re.fullmatch(r'(?:bp|bn)\.\d+|\d+[tb]\.[a-j]', pin))
        else:
            valid = part in parts and pin in pins.get(parts[part]['type'], set())
        if not valid:
            errors.append(f'diagram: invalid endpoint {endpoint}')
    if len(connection) != 4:
        errors.append(f'diagram: malformed connection {connection}')
edges = {frozenset(c[:2]) for c in diagram['connections']}
required_edges = [
    ('esp:19', 'dht1:SDA'), ('esp:35', 'pot1:SIG'),
    ('lcd1:RS', 'esp:13'), ('lcd1:E', 'esp:14'),
    ('esp:16', 'r1:1'), ('r1:2', 'lcd1:D4'),
    ('esp:17', 'r3:1'), ('r3:2', 'lcd1:D5'),
    ('esp:18', 'r4:1'), ('r4:2', 'lcd1:D6'),
    ('esp:23', 'r2:1'), ('r2:2', 'lcd1:D7'),
    ('esp:26', 'relay1:IN'), ('relay1:NO', 'r8:1'),
    ('relay1:NC', 'r7:1'), ('esp:27', 'r5:1'),
    ('esp:33', 'btn1:1.l'), ('esp:25', 'sw1:2'),
]
for left, right in required_edges:
    if frozenset((left, right)) not in edges:
        errors.append(f'diagram: required wire missing {left} <-> {right}')
if parts.get('relay1', {}).get('attrs', {}).get('transistor') != 'pnp':
    errors.append('diagram: relay1 must be pnp so GPIO26 LOW means pump ON')
expected_resistors = {
    'r1': '220', 'r2': '220', 'r3': '220', 'r4': '220',
    'r5': '220', 'r7': '220', 'r8': '220',
}
for part_id, value in expected_resistors.items():
    if parts.get(part_id, {}).get('attrs', {}).get('value') != value:
        errors.append(f'diagram: {part_id} must be {value} ohm')
ET.parse(ROOT / 'docs/hardware-wiring.svg')
json.loads((ROOT / '.vscode/tasks.json').read_text(encoding='utf-8'))
for path in re.findall(r"(?:firmware|elf)\s*=\s*'([^']+)'", (ROOT / 'wokwi.toml').read_text()):
    if args.require_firmware and not (ROOT / path).is_file():
        errors.append(f'Wokwi firmware missing: {path}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print(f'PASS: {len(files)} Markdown files, {links} local links, '
      f'{len(parts)} diagram parts, {len(diagram["connections"])} connections, SVG and VS Code task JSON')
if args.require_firmware:
    print('PASS: firmware.bin and firmware.elf referenced by wokwi.toml exist')
