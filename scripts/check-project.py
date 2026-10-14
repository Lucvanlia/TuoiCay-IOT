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
        '13','14','16','17','18','19','21','22','23','25','26','27','33','34','35',
    },
    'wokwi-dht22': {'VCC','SDA','NC','GND'},
    'wokwi-potentiometer': {'VCC','GND','SIG'},
    'wokwi-slide-switch': {'1','2','3'},
    'wokwi-lcd1602': {
        'VSS','VDD','V0','RS','RW','E','D4','D5','D6','D7','A','K',
        'GND','VCC','SDA','SCL',
    },
    'wokwi-relay-module': {'VCC','GND','IN','COM','NO','NC'},
    'wokwi-vcc': {'VCC'}, 'wokwi-gnd': {'GND'},
    'wokwi-led': {'A','C'}, 'wokwi-resistor': {'1','2'},
    'wokwi-pushbutton': {'1.l','1.r','2.l','2.r'},
    'wokwi-a4988': {
        'ENABLE','MS1','MS2','MS3','RESET','SLEEP','STEP','DIR',
        'GND.1','GND.2','VDD','1B','1A','2A','2B','VMOT',
    },
    'wokwi-stepper-motor': {'A-','A+','B+','B-'},
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
    ('lcd1:GND', 'esp:GND.3'), ('lcd1:VCC', 'esp:5V'),
    ('lcd1:SDA', 'esp:21'), ('lcd1:SCL', 'esp:22'),
    ('esp:26', 'relay1:IN'), ('esp:18', 'relay1:COM'),
    ('relay1:NO', 'drvPump:STEP'), ('drvPump:STEP', 'rStep:1'),
    ('rStep:2', 'gndRelayLeds:GND'), ('drvPump:RESET', 'drvPump:SLEEP'),
    ('drvPump:1B', 'pump1:B-'), ('drvPump:1A', 'pump1:B+'),
    ('drvPump:2A', 'pump1:A+'), ('drvPump:2B', 'pump1:A-'),
    ('esp:27', 'r5:1'),
    ('esp:33', 'btn1:1.l'), ('esp:25', 'sw1:2'),
    ('sw1:1', 'esp:3V3'), ('bb1:bp.2', 'bb1:bp.50'),
    ('bb1:bn.1', 'bb1:bn.50'),
]
for left, right in required_edges:
    if frozenset((left, right)) not in edges:
        errors.append(f'diagram: required wire missing {left} <-> {right}')
if parts.get('relay1', {}).get('attrs', {}).get('transistor') != 'npn':
    errors.append('diagram: relay1 must explicitly use npn so GPIO26 HIGH means pump ON')
for connection in diagram['connections']:
    endpoints = set(connection[:2])
    if any(endpoint.startswith('relay1:') for endpoint in endpoints) and any(
            endpoint.startswith('bb1:62b.') for endpoint in endpoints):
        errors.append('diagram: relay VCC/GND/IN must not share breadboard column 62')
expected_resistors = {'r5': '220', 'rStep': '10000'}
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
