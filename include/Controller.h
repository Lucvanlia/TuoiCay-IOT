#pragma once
#include <stdint.h>
namespace irrigation {
enum class Mode { Auto, Manual };
enum class Reason { Ready, Startup, Stopped, Sensor, Empty, Rain, Soak, Budget, AutoStart, ManualStart, Duration, Wet, ModeChanged };
inline const char* name(Reason r) {
  switch (r) {
    case Reason::Ready: return "READY";
    case Reason::Startup: return "BOOT_WAIT";
    case Reason::Stopped: return "STOP_LATCH";
    case Reason::Sensor: return "SENSOR_FAULT";
    case Reason::Empty: return "TANK_EMPTY";
    case Reason::Rain: return "RAIN_BLOCK";
    case Reason::Soak: return "SOAK_WAIT";
    case Reason::Budget: return "HOUR_LIMIT";
    case Reason::AutoStart: return "AUTO_START";
    case Reason::ManualStart: return "MANUAL_START";
    case Reason::Duration: return "TIME_LIMIT";
    case Reason::Wet: return "SOIL_WET";
    case Reason::ModeChanged: return "MODE_CHANGE";
  }
  return "UNKNOWN";
}
struct Settings {
  uint32_t bootMs, dryMs, soakMs, rainClearMs, pulseMs, maxPulseMs, hourBudgetMs;
  int startPct, stopPct;
};
struct Inputs { int soilPct; bool valid, rain, tankOk, stop; };
struct Event { uint32_t start, duration; Reason reason; Mode mode; };
using EventSink = void (*)(const Event&);
// Pure C++ safety core. No network, display or flash calls.
class Controller {
 public:
  explicit Controller(Settings s, EventSink sink = nullptr) : settings(s), onStop(sink) {}
  void begin(uint32_t now) { bootAt = now; latched = true; }
  bool pumpOn() const { return running; }
  bool stopped() const { return latched; }
  Mode mode() const { return currentMode; }
  Reason reason() const { return currentReason; }
  uint32_t remainingMs(uint32_t now) const {
    if (!running) return 0;
    return now - startedAt >= duration ? 0 : duration - (now - startedAt);
  }
  uint32_t usedMs(uint32_t now) const {
    uint32_t total = 0;
    for (const auto& item : history) if (item.used && now - item.ended < hourMs) total += item.ms;
    if (running) total += now - startedAt;
    return total;
  }
  void stop(uint32_t now) {
    latched = true; dryTracking = false;
    finish(now, Reason::Stopped); currentReason = Reason::Stopped;
  }
  bool resume(uint32_t now, const Inputs& in) {
    update(now, in);
    if (in.stop || !in.valid || !in.tankOk || rainLocked || now - bootAt < settings.bootMs) return false;
    latched = false; dryTracking = false; currentReason = block(now, in); return true;
  }
  void setMode(Mode requested, uint32_t now) {
    if (requested == currentMode) return;
    finish(now, Reason::ModeChanged); currentMode = requested; dryTracking = false;
  }
  bool water(uint32_t now, const Inputs& in, uint32_t requestedMs) {
    update(now, in);
    if (currentMode != Mode::Manual || running || requestedMs == 0 || requestedMs > settings.maxPulseMs) return false;
    if (block(now, in) != Reason::Ready || in.soilPct >= settings.stopPct) return false;
    if (usedMs(now) + requestedMs > settings.hourBudgetMs || !hasSlot(now)) return false;
    start(now, requestedMs, Reason::ManualStart); return true;
  }
  void update(uint32_t now, const Inputs& in) {
    for (auto& item : history) if (item.used && now - item.ended >= hourMs) item.used = false;
    if (in.rain) { rainLocked = true; lastWetAt = now; }
    else if (rainLocked && now - lastWetAt >= settings.rainClearMs) rainLocked = false;
    if (in.stop) stop(now);
    if (!in.valid || !in.tankOk) latched = true;
    const Reason protection = block(now, in);
    if (running) {
      if (protection != Reason::Ready) finish(now, protection);
      else if (in.soilPct >= settings.stopPct) finish(now, Reason::Wet);
      else if (now - startedAt >= duration) finish(now, Reason::Duration);
      return;
    }
    currentReason = protection;
    if (protection != Reason::Ready || currentMode != Mode::Auto || in.soilPct >= settings.startPct) {
      dryTracking = false; return;
    }
    if (!dryTracking) { dryTracking = true; dryAt = now; }
    if (now - dryAt < settings.dryMs) return;
    if (usedMs(now) + settings.pulseMs > settings.hourBudgetMs || !hasSlot(now)) { currentReason = Reason::Budget; return; }
    start(now, settings.pulseMs, Reason::AutoStart);
  }
 private:
  static constexpr uint32_t hourMs = 3600000;
  struct Usage { uint32_t ended = 0, ms = 0; bool used = false; };
  Usage history[128]{};
  Settings settings;
  EventSink onStop;
  Mode currentMode = Mode::Auto;
  Reason currentReason = Reason::Stopped;
  bool latched = true, running = false, dryTracking = false, rainLocked = false, hasStopped = false;
  uint32_t bootAt = 0, dryAt = 0, startedAt = 0, duration = 0, stoppedAt = 0, lastWetAt = 0;
  bool hasSlot(uint32_t now) const {
    for (const auto& item : history) if (!item.used || now - item.ended >= hourMs) return true;
    return false;
  }
  Reason block(uint32_t now, const Inputs& in) const {
    if (in.stop) return Reason::Stopped;
    if (!in.valid) return Reason::Sensor;
    if (!in.tankOk) return Reason::Empty;
    if (latched) return Reason::Stopped;
    if (now - bootAt < settings.bootMs) return Reason::Startup;
    if (rainLocked) return Reason::Rain;
    if (!running && hasStopped && now - stoppedAt < settings.soakMs) return Reason::Soak;
    if (usedMs(now) >= settings.hourBudgetMs) return Reason::Budget;
    return Reason::Ready;
  }
  void start(uint32_t now, uint32_t ms, Reason why) {
    running = true; startedAt = now; duration = ms; currentReason = why; dryTracking = false;
  }
  void finish(uint32_t now, Reason why) {
    if (!running) return;
    const uint32_t elapsed = now - startedAt;
    running = false; hasStopped = true; stoppedAt = now; currentReason = why;
    for (auto& item : history) {
      if (!item.used || now - item.ended >= hourMs) { item.ended = now; item.ms = elapsed; item.used = true; break; }
    }
    if (onStop) onStop({startedAt, elapsed, why, currentMode});
  }
};
}
