#pragma once
#include <Arduino.h>
#include <Wire.h>
// PCF8574: P0 RS, P1 RW, P2 E, P3 backlight, P4..P7 data.
class Lcd1602 {
 public:
  bool begin() {
    const uint8_t candidates[] = {0x27, 0x3f};
    for (uint8_t candidate : candidates) {
      Wire.beginTransmission(candidate);
      if (Wire.endTransmission() == 0) { address = candidate; break; }
    }
    if (!address) return false;
    delay(50); // setup only, pump OFF
    nibble(0x30); delay(5); nibble(0x30); delayMicroseconds(150); nibble(0x30);
    nibble(0x20); command(0x28); command(0x0c); command(0x06); command(0x01); delay(2);
    return address != 0;
  }
  void row(uint8_t rowIndex, const char* text) {
    if (!address) return;
    command(rowIndex ? 0xc0 : 0x80);
    bool ended = false;
    for (uint8_t i = 0; i < 16; ++i) {
      if (!ended && !text[i]) ended = true;
      send(ended ? ' ' : text[i], 1);
    }
  }
 private:
  uint8_t address = 0;
  void write(uint8_t v) {
    if (!address) return;
    Wire.beginTransmission(address); Wire.write(v | 8);
    if (Wire.endTransmission() != 0) address = 0; // fail fast if LCD is unplugged
  }
  void nibble(uint8_t v) { write(v | 4); delayMicroseconds(1); write(v & ~4); delayMicroseconds(50); }
  void send(uint8_t v, uint8_t rs) { nibble((v & 0xf0) | rs); nibble((v << 4) | rs); }
  void command(uint8_t v) { send(v, 0); }
};
