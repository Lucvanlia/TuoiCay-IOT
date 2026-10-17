#pragma once

// ============================================================================
// CAU HINH AZURE IOT HUB CHO ESP32 (Goi Free F1 - 0d/thang)
// ============================================================================

namespace azure_config {
    // Thong tin mang Wi-Fi (Mac dinh dung "Wokwi-GUEST" cho mo phong Wokwi)
    constexpr const char* WIFI_SSID = "Wokwi-GUEST";
    constexpr const char* WIFI_PASS = "";

    // Thong tin Azure IoT Hub da tao tren portal.azure.com
    constexpr const char* IOTHUB_NAME = "iothub-tuoicay-hkp";
    constexpr const char* DEVICE_ID   = "esp32-garden-01";
    constexpr const char* DEVICE_KEY  = "Kq5mUcVC9EzWsOvwuOotAL3ZWuk/1gtcctlgE9+tv5U=";

    // Endpoint MQTT TLS
    constexpr const char* MQTT_HOST   = "iothub-tuoicay-hkp.azure-devices.net";
    constexpr int         MQTT_PORT   = 8883;

    // Chu ky gui du lieu Telemetry len Cloud (15 giay / lan = 5.760 msg/ngay < 8.000 limit F1 Free)
    constexpr unsigned long TELEMETRY_INTERVAL_MS = 15000;

    // MQTT Topics theo chuan Azure IoT Hub
    constexpr const char* TOPIC_TELEMETRY = "devices/esp32-garden-01/messages/events/";
    constexpr const char* TOPIC_COMMANDS  = "devices/esp32-garden-01/messages/devicebound/#";
}
