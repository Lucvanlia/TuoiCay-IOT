#pragma once
#include <stdint.h>
#ifndef IRRIGATION_SIMULATION
#define IRRIGATION_SIMULATION 0
#endif
namespace config {
constexpr bool simulation = IRRIGATION_SIMULATION != 0;
constexpr uint8_t soilPin = 34; // ADC1 works alongside Wi-Fi
constexpr uint8_t rainPin = 27; // LOW = rain, dry contact only
constexpr uint8_t tankPin = 33; // LOW = water available; open wire = empty
constexpr uint8_t stopPin = 32;
constexpr uint8_t modePin = 18;
constexpr uint8_t waterPin = 19;
constexpr uint8_t resumePin = 23;
constexpr uint8_t pumpPin = 26; // HIGH -> NPN -> relay IN LOW
constexpr uint8_t alarmPin = 25;
constexpr uint8_t sdaPin = 21, sclPin = 22;
constexpr uint32_t sampleMs = 200, staleMs = 1200, dryHoldMs = 10000;
constexpr uint32_t soakMs = simulation ? 10000 : 60000;
constexpr uint32_t rainClearMs = simulation ? 10000 : 300000;
constexpr uint32_t bootHoldMs = simulation ? 3000 : 60000;
constexpr uint32_t pulseMs = 5000, maximumPulseMs = 10000, maximumHourMs = 60000;
constexpr int startPct = 35, stopPct = 55;
}
