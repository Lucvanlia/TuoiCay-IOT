#include <stdio.h>
#include "Controller.h"
using namespace irrigation;
static int checks = 0, failures = 0, events = 0;
static Event lastEvent{};
#define CHECK(x) do { ++checks; if (!(x)) { ++failures; printf("FAIL line %d: %s\n", __LINE__, #x); } } while (0)
static void capture(const Event& e) { ++events; lastEvent = e; }
static const Settings cfg{100, 200, 300, 400, 500, 1000, 2000, 35, 55};
static const Inputs dry{20, true, false, true, false};
int main() {
  { // Boot never energizes, including a held WATER request.
    Controller c(cfg); c.begin(0); c.update(1000, dry);
    CHECK(!c.pumpOn()); CHECK(c.stopped()); CHECK(!c.resume(99, dry));
    CHECK(c.resume(100, dry)); c.update(100, dry); c.update(299, dry);
    CHECK(!c.pumpOn()); c.update(300, dry); CHECK(c.pumpOn());
    c.update(799, dry); CHECK(c.pumpOn()); c.update(800, dry); CHECK(!c.pumpOn());
    c.update(1000, dry); CHECK(!c.pumpOn()); CHECK(c.reason() == Reason::Soak);
  }
  { // Wet threshold ends an active session; hysteresis prevents new starts at 40%.
    Controller c(cfg, capture); c.begin(0); c.resume(100, dry); c.update(100, dry); c.update(300, dry);
    c.update(400, {55, true, false, true, false}); CHECK(!c.pumpOn());
    CHECK(lastEvent.reason == Reason::Wet); CHECK(lastEvent.duration == 100);
    c.update(1000, {40, true, false, true, false}); c.update(1500, {40, true, false, true, false}); CHECK(!c.pumpOn());
  }
  { // STOP wins over simultaneous RESUME and stays latched after release.
    Controller c(cfg); c.begin(0); c.resume(100, dry); c.update(100, dry); c.update(300, dry);
    const Inputs held{20, true, false, true, true}; c.update(301, held);
    CHECK(!c.pumpOn()); CHECK(!c.resume(302, held)); c.update(3000, dry); CHECK(!c.pumpOn());
    CHECK(c.resume(3001, dry));
  }
  { // Empty tank/open wire stops; refill alone must not restart.
    Controller c(cfg); c.begin(0); c.resume(100, dry); c.update(100, dry); c.update(300, dry);
    c.update(301, {20, true, false, false, false}); CHECK(!c.pumpOn()); CHECK(c.stopped());
    c.update(3000, dry); CHECK(!c.pumpOn()); CHECK(c.resume(3001, dry));
  }
  { // Invalid/stale soil data fails closed.
    Controller c(cfg); c.begin(0); c.resume(100, dry); c.update(100, dry); c.update(300, dry);
    const Inputs invalid{20, false, false, true, false}; c.update(301, invalid);
    CHECK(!c.pumpOn()); CHECK(c.reason() == Reason::Sensor); CHECK(!c.resume(1000, invalid));
  }
  { // Rain interrupts immediately; dry must persist for configured interval.
    Controller c(cfg); c.begin(0); c.resume(100, dry); c.update(100, dry); c.update(300, dry);
    c.update(301, {20, true, true, true, false}); CHECK(!c.pumpOn());
    c.update(700, dry); CHECK(c.reason() == Reason::Rain); c.update(701, dry);
    c.update(900, dry); CHECK(!c.pumpOn()); c.update(901, dry); CHECK(c.pumpOn());
  }
  { // Manual ignores dry soil; rejects zero, excessive duration, wet soil and duplicate while active.
    Controller c(cfg); c.begin(0); c.setMode(Mode::Manual, 0); c.resume(100, dry); c.update(1000, dry);
    CHECK(!c.pumpOn()); CHECK(!c.water(1000, dry, 0)); CHECK(!c.water(1000, dry, 1001));
    CHECK(!c.water(1000, {55, true, false, true, false}, 500));
    CHECK(c.water(1000, dry, 500)); CHECK(!c.water(1200, dry, 500));
    c.update(1500, dry); CHECK(!c.pumpOn()); CHECK(c.usedMs(1500) == 500);
  }
  { // Mode change terminates and cooldown still applies.
    Controller c(cfg); c.begin(0); c.resume(100, dry); c.update(100, dry); c.update(300, dry);
    c.setMode(Mode::Manual, 400); CHECK(!c.pumpOn()); CHECK(!c.water(500, dry, 500)); CHECK(c.water(700, dry, 500));
  }
  { // Rolling budget includes manual usage, rejects reservations beyond remaining quota.
    Controller c(cfg); c.begin(0); c.setMode(Mode::Manual, 0); c.resume(100, dry);
    CHECK(c.water(100, dry, 1000)); c.update(1100, dry);
    CHECK(c.water(1400, dry, 1000)); c.update(2400, dry); CHECK(c.usedMs(2400) == 2000);
    CHECK(!c.water(2700, dry, 1)); c.update(3602401, dry); CHECK(c.usedMs(3602401) == 0);
    CHECK(c.water(3602401, dry, 500));
  }
  { // Dry qualification resets when sensor rises above start threshold.
    Controller c(cfg); c.begin(0); c.resume(100, dry); c.update(100, dry);
    c.update(250, {36, true, false, true, false}); c.update(300, dry); c.update(499, dry);
    CHECK(!c.pumpOn()); c.update(500, dry); CHECK(c.pumpOn());
  }
  { // Unsigned timer arithmetic works across millis() wrap.
    volatile uint32_t t = 0xffffff00u; // runtime wrap, intentionally not constant overflow
    Controller c(cfg); c.begin(t); CHECK(c.resume(t + 100, dry));
    c.update(t + 100, dry); c.update(t + 300, dry); CHECK(c.pumpOn());
    c.update(t + 800, dry); CHECK(!c.pumpOn()); CHECK(c.usedMs(t + 800) == 500);
  }
  { // Reboot is a new controller with explicit local re-arm required.
    Controller c(cfg); c.begin(0); c.update(100000, dry); CHECK(!c.pumpOn()); CHECK(c.stopped());
  }
  CHECK(events == 1);
  { // Long run with deterministic disturbances: all safety invariants apply in both modes.
    Controller c(cfg); c.begin(0);
    uint32_t seed = 1234567, activeSince = 0;
    bool prior = false;
    for (uint32_t now = 0; now < 4000000; now += 20) {
      seed = seed * 1664525u + 1013904223u;
      Inputs in{int((seed >> 8) % 100), (seed % 97) != 0, (seed % 53) == 0,
                (seed % 71) != 0, (seed % 89) == 0};
      c.update(now, in);
      if (seed % 13 == 0) c.resume(now, in);
      if (seed % 17 == 0) c.setMode(c.mode() == Mode::Auto ? Mode::Manual : Mode::Auto, now);
      if (seed % 19 == 0) c.water(now, in, 500);
      c.update(now, in);
      if (c.pumpOn() && !prior) activeSince = now;
      CHECK(!c.pumpOn() || (in.valid && in.tankOk && !in.rain && !in.stop && !c.stopped()));
      CHECK(!c.pumpOn() || in.soilPct < 55);
      CHECK(!c.pumpOn() || now - activeSince < 500);
      CHECK(c.usedMs(now) <= cfg.hourBudgetMs + 20); // at most one update period overshoot
      prior = c.pumpOn();
    }
  }
  printf("%d checks, %d failures; 12 scenarios + 200000 disturbance steps\n", checks, failures);
  return failures ? 1 : 0;
}
