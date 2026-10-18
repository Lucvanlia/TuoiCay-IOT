#pragma once

// ============================================================================
// CAU HINH AZURE IOT HUB CHO ESP32 (Goi Free F1 - 0d/thang)
// Thong tin nhay cam (Wi-Fi, Device Key) duoc tach rieng vao "include/secrets.h"
// de dam bao khong bi lo khi day code len GitHub.
// ============================================================================

#if __has_include("secrets.h")
#include "secrets.h"
#else
namespace azure_secrets {
    constexpr const char* WIFI_SSID = "Wokwi-GUEST";
    constexpr const char* WIFI_PASS = "";
    constexpr const char* IOTHUB_NAME = "YOUR_IOTHUB_NAME";
    constexpr const char* DEVICE_ID   = "esp32-garden-01";
    constexpr const char* DEVICE_KEY  = "YOUR_DEVICE_PRIMARY_KEY";
}
#endif

namespace azure_config {
    // Thong tin mang Wi-Fi
    constexpr const char* WIFI_SSID = azure_secrets::WIFI_SSID;
    constexpr const char* WIFI_PASS = azure_secrets::WIFI_PASS;

    // Thong tin Azure IoT Hub
    constexpr const char* IOTHUB_NAME = azure_secrets::IOTHUB_NAME;
    constexpr const char* DEVICE_ID   = azure_secrets::DEVICE_ID;
    constexpr const char* DEVICE_KEY  = azure_secrets::DEVICE_KEY;

    // Endpoint MQTT TLS (mac dinh cong 8883)
    constexpr int         MQTT_PORT   = 8883;

    // Chu ky gui du lieu Telemetry len Cloud (15 giay / lan = 5.760 msg/ngay < 8.000 limit F1 Free)
    constexpr unsigned long TELEMETRY_INTERVAL_MS = 15000;

    // MQTT Topics theo chuan Azure IoT Hub
    constexpr const char* TOPIC_TELEMETRY = "devices/esp32-garden-01/messages/events/";
    constexpr const char* TOPIC_COMMANDS  = "devices/esp32-garden-01/messages/devicebound/#";
}
