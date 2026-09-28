#include <stdio.h>
#include "Config.h"
#include "Controller.h"
using namespace irrigation;
static int starts = 0, ends = 0, failures = 0;
static uint32_t longest = 0;
static void ended(const Event& e) {
  ++ends;
  if (e.duration > longest) longest = e.duration;
  printf("{\"event\":\"session_end\",\"startMs\":%u,\"durationMs\":%u,\"reason\":\"%s\"}\n",
         e.start, e.duration, name(e.reason));
}
// Synthetic soil response only; this is NOT a botanical or hydraulic calibration.
int main() {
  Controller c({config::bootHoldMs, config::dryHoldMs, config::soakMs,
    config::rainClearMs, config::pulseMs, config::maximumPulseMs,
    config::maximumHourMs, config::startPct, config::stopPct}, ended);
  c.begin(0);
  double soil = 25.0;
  bool previous = false;
  bool sawRain = false, sawEmpty = false, sawInvalid = false, sawStop = false;
  const uint32_t step = 100;
  for (uint32_t now = 0; now <= 1800000; now += step) {
    const bool rain = now >= 300000 && now < 360000;
    const bool tankOk = !(now >= 600000 && now < 630000);
    const bool valid = !(now >= 900000 && now < 910000);
    const bool stop = now >= 1200000 && now < 1201000;
    Inputs in{int(soil), valid, rain, tankOk, stop};
    c.update(now, in);
    // A person explicitly re-arms after startup / refill / repair / STOP.
    if (now == 60000 || now == 640000 || now == 920000 || now == 1210000) c.resume(now, in);
    c.update(now, in);
    if (c.pumpOn() && !previous) {
      ++starts;
      printf("{\"event\":\"session_start\",\"atMs\":%u,\"soilPct\":%d}\n", now, in.soilPct);
    }
    if (c.pumpOn() && (!valid || !tankOk || rain || stop || c.stopped())) ++failures;
    if (!tankOk) sawEmpty = sawEmpty || c.stopped();
    if (!valid) sawInvalid = sawInvalid || c.stopped();
    if (rain) sawRain = sawRain || !c.pumpOn();
    if (stop) sawStop = sawStop || c.stopped();
    if ((now > 630000 && now < 640000) || (now > 910000 && now < 920000) ||
        (now > 1201000 && now < 1210000)) if (c.pumpOn()) ++failures;
    if (now % 10000 == 0) printf("{\"event\":\"sample\",\"atMs\":%u,\"soilPct\":%d,\"rain\":%s,\"tankOk\":%s,\"pumpOn\":%s,\"state\":\"%s\"}\n",
      now, in.soilPct, rain ? "true" : "false", tankOk ? "true" : "false", c.pumpOn() ? "true" : "false", name(c.reason()));
    previous = c.pumpOn();
    soil += (c.pumpOn() ? 2.0 : 0.0) * (step / 1000.0);
    soil += (rain ? 0.3 : -0.008) * (step / 1000.0);
    if (soil < 0) soil = 0;
    if (soil > 100) soil = 100;
  }
  c.stop(1800000);
  if (!sawRain || !sawEmpty || !sawInvalid || !sawStop || starts < 2 || starts != ends || longest > config::pulseMs) ++failures;
  printf("{\"event\":\"summary\",\"model\":\"synthetic-not-physical\",\"simulationBuild\":%s,\"durationSec\":1800,\"starts\":%d,\"ends\":%d,\"longestMs\":%u,\"failures\":%d}\n",
    config::simulation ? "true" : "false", starts, ends, longest, failures);
  return failures ? 1 : 0;
}
